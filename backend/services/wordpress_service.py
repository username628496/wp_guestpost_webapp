"""
WordPress REST API Service Layer
Handles all WordPress API operations with authentication, caching, and error handling
"""
import requests
from requests.auth import HTTPBasicAuth
import urllib3
import logging
from typing import Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from utils.exceptions import ExternalServiceError

# Disable SSL verification warnings for sites with self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


class WordPressAPIError(ExternalServiceError):
    """Custom exception for WordPress API errors"""
    def __init__(self, message, status_code=None):
        super().__init__('WordPress API', message, status_code=status_code or 503)


class WordPressService:
    """WordPress REST API service with connection pooling and error handling"""

    def __init__(self, site_url: str, username: str, app_password: str):
        """
        Initialize WordPress service

        Args:
            site_url: WordPress site URL (without trailing slash)
            username: WordPress username
            app_password: WordPress application password
        """
        self.site_url = site_url.rstrip('/')
        self.username = username
        self.app_password = app_password
        self.auth = HTTPBasicAuth(username, app_password)
        self.timeout = 10

    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """
        Make HTTP request to WordPress API with standard settings

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (e.g., '/wp-json/wp/v2/posts')
            **kwargs: Additional arguments for requests

        Returns:
            Response object

        Raises:
            WordPressAPIError: If request fails
        """
        url = f"{self.site_url}{endpoint}"

        # Set default kwargs
        kwargs.setdefault('auth', self.auth)
        kwargs.setdefault('timeout', self.timeout)
        kwargs.setdefault('verify', False)  # Disable SSL verification for internal use

        try:
            response = requests.request(method, url, **kwargs)
            return response
        except requests.exceptions.Timeout:
            raise WordPressAPIError(f"Request timeout after {self.timeout}s", status_code=408)
        except requests.exceptions.ConnectionError as e:
            raise WordPressAPIError(f"Connection error: {str(e)}", status_code=503)
        except Exception as e:
            raise WordPressAPIError(f"Request failed: {str(e)}")

    def test_connection(self) -> Tuple[bool, Dict]:
        """
        Test WordPress REST API connection

        Returns:
            Tuple of (success: bool, data: dict with user info or error)
        """
        try:
            response = self._make_request('GET', '/wp-json/wp/v2/users/me')

            if response.status_code == 200:
                user_data = response.json()
                return True, {
                    'id': user_data.get('id'),
                    'name': user_data.get('name'),
                    'email': user_data.get('email')
                }
            else:
                return False, {
                    'error': f'Authentication failed with status {response.status_code}'
                }
        except WordPressAPIError as e:
            return False, {'error': e.message}

    def fetch_post_by_slug(self, slug: str, post_type: str = 'posts') -> Optional[Dict]:
        """
        Fetch a single post by slug

        Args:
            slug: Post slug from URL
            post_type: 'posts' or 'pages'

        Returns:
            Post data dict or None if not found
        """
        try:
            endpoint = f'/wp-json/wp/v2/{post_type}'
            params = {'slug': slug, '_embed': True}

            response = self._make_request('GET', endpoint, params=params)

            if response.status_code == 200:
                posts = response.json()
                if posts and len(posts) > 0:
                    return posts[0]

            return None
        except WordPressAPIError as e:
            logger.error(f"Error fetching post by slug {slug}: {e.message}")
            return None

    def fetch_post_by_url(self, url: str) -> Optional[Dict]:
        """
        Fetch post by full URL (tries both posts and pages)

        Args:
            url: Full post URL

        Returns:
            Post data dict or None if not found
        """
        # Extract slug from URL
        slug = url.rstrip('/').split('/')[-1]

        # Try as post first
        post = self.fetch_post_by_slug(slug, post_type='posts')
        if post:
            return post

        # Try as page
        post = self.fetch_post_by_slug(slug, post_type='pages')
        return post

    def parse_post_data(self, post: Dict, url: str = None) -> Dict:
        """
        Parse WordPress API post response into standardized format

        Args:
            post: Raw post data from WordPress API
            url: Original URL (optional)

        Returns:
            Standardized post dict
        """
        # Get categories
        categories = []
        if '_embedded' in post and 'wp:term' in post['_embedded']:
            for term_group in post['_embedded']['wp:term']:
                for term in term_group:
                    if term.get('taxonomy') == 'category':
                        categories.append({
                            'id': term.get('id'),
                            'name': term.get('name')
                        })

        # Get featured image
        featured_image = None
        if '_embedded' in post and 'wp:featuredmedia' in post['_embedded']:
            media = post['_embedded']['wp:featuredmedia']
            if media and len(media) > 0:
                featured_image = media[0].get('source_url')

        # Get Yoast SEO data if available
        yoast_meta = post.get('yoast_head_json', {})

        # Get content
        content_html = post.get('content', {}).get('rendered', '')

        post_id = post.get('id')
        return {
            'id': post_id,
            'post_id': post_id,  # Add post_id for frontend compatibility
            'url': url or post.get('link'),
            'title': post.get('title', {}).get('rendered', ''),
            'content': content_html,
            'excerpt': post.get('excerpt', {}).get('rendered', ''),
            'status': post.get('status', 'publish'),
            'categories': categories,
            'featured_image': featured_image,
            'seo_title': yoast_meta.get('title', post.get('title', {}).get('rendered', '')),
            'seo_description': yoast_meta.get('description', ''),
            'date_modified': post.get('modified'),
            'author_id': post.get('author')
        }

    def fetch_posts_concurrent(self, urls: List[str], max_workers: int = 10) -> List[Dict]:
        """
        Fetch multiple posts concurrently

        Args:
            urls: List of post URLs
            max_workers: Maximum concurrent workers (default: 10)

        Returns:
            List of post dicts (includes error entries for failed fetches)
        """
        results = []
        start_time = time.time()

        logger.info(f"[WordPressService] Fetching {len(urls)} posts concurrently (workers={max_workers})")

        # Limit max workers
        max_workers = min(max_workers, len(urls))

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_url = {
                executor.submit(self._fetch_single_post_safe, url): url
                for url in urls
            }

            # Collect results as they complete
            completed = 0
            for future in as_completed(future_to_url):
                completed += 1
                result = future.result()
                results.append(result)

                # Log progress every 10 posts
                if completed % 10 == 0 or completed == len(urls):
                    elapsed = time.time() - start_time
                    logger.info(f"[Progress] {completed}/{len(urls)} posts ({elapsed:.1f}s)")

        elapsed_total = time.time() - start_time
        logger.info(f"[Completed] Fetched {len(results)} posts in {elapsed_total:.1f}s")

        return results

    def _fetch_single_post_safe(self, url: str) -> Dict:
        """
        Safely fetch single post (wraps exceptions into error dict)

        Args:
            url: Post URL

        Returns:
            Post dict or error dict
        """
        try:
            post = self.fetch_post_by_url(url)
            if post:
                return self.parse_post_data(post, url)
            else:
                # Extract slug for debugging
                slug = url.rstrip('/').split('/')[-1]
                logger.warning(f"[WordPressService] Post not found for URL: {url} (slug: {slug})")
                return {'url': url, 'error': 'Post not found'}
        except Exception as e:
            logger.error(f"Error fetching post {url}: {e}")
            return {'url': url, 'error': str(e)}

    def update_post(self, post_id: int, update_data: Dict) -> Tuple[bool, Dict]:
        """
        Update WordPress post

        Args:
            post_id: WordPress post ID
            update_data: Dict with fields to update

        Returns:
            Tuple of (success: bool, updated_post: dict or error)
        """
        try:
            endpoint = f'/wp-json/wp/v2/posts/{post_id}'

            response = self._make_request('POST', endpoint, json=update_data)

            if response.status_code == 200:
                updated_post = response.json()
                return True, self.parse_post_data(updated_post)
            else:
                error_msg = f"Update failed with status {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get('message', error_msg)
                except:
                    pass
                return False, {'error': error_msg}
        except WordPressAPIError as e:
            return False, {'error': e.message}

    def get_categories(self, per_page: int = 100) -> List[Dict]:
        """
        Get all WordPress categories

        Args:
            per_page: Number of categories per page (default: 100)

        Returns:
            List of category dicts
        """
        try:
            endpoint = '/wp-json/wp/v2/categories'
            params = {'per_page': per_page, 'orderby': 'name', 'order': 'asc'}

            response = self._make_request('GET', endpoint, params=params)

            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to fetch categories: {response.status_code}")
                return []
        except WordPressAPIError as e:
            logger.error(f"Error fetching categories: {e.message}")
            return []

    def update_post_content(self, post_id: int, content: str) -> Tuple[bool, Dict]:
        """
        Update post content only

        Args:
            post_id: WordPress post ID
            content: New post content (HTML)

        Returns:
            Tuple of (success: bool, updated_post: dict or error)
        """
        return self.update_post(post_id, {'content': content})

    def update_post_title(self, post_id: int, title: str) -> Tuple[bool, Dict]:
        """
        Update post title only

        Args:
            post_id: WordPress post ID
            title: New post title

        Returns:
            Tuple of (success: bool, updated_post: dict or error)
        """
        return self.update_post(post_id, {'title': title})


def create_wordpress_service(site_url: str, username: str, app_password: str) -> WordPressService:
    """
    Factory function to create WordPressService instance

    Args:
        site_url: WordPress site URL
        username: WordPress username
        app_password: WordPress application password

    Returns:
        WordPressService instance
    """
    return WordPressService(site_url, username, app_password)
