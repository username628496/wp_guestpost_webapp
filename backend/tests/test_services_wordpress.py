"""
Unit tests for WordPress Service
Tests WordPress API service layer with mocking
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from services.wordpress_service import (
    WordPressService,
    create_wordpress_service,
    WordPressAPIError
)


class TestWordPressService:
    """Test suite for WordPressService"""

    @pytest.fixture
    def wp_service(self):
        """Create a WordPress service instance for testing"""
        return WordPressService(
            site_url='https://test.example.com',
            username='testuser',
            app_password='test_password'
        )

    def test_create_service(self):
        """Test creating a WordPress service"""
        service = create_wordpress_service(
            'https://test.example.com',
            'user',
            'pass'
        )

        assert isinstance(service, WordPressService)
        assert service.site_url == 'https://test.example.com'
        assert service.username == 'user'
        assert service.app_password == 'pass'

    def test_site_url_trailing_slash_removed(self):
        """Test that trailing slash is removed from site URL"""
        service = WordPressService(
            'https://test.example.com/',
            'user',
            'pass'
        )

        assert service.site_url == 'https://test.example.com'

    @patch('services.wordpress_service.requests.request')
    def test_test_connection_success(self, mock_request, wp_service):
        """Test successful connection test"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 1,
            'name': 'Test User',
            'email': 'test@example.com'
        }
        mock_request.return_value = mock_response

        success, result = wp_service.test_connection()

        assert success == True
        assert result['id'] == 1
        assert result['name'] == 'Test User'
        mock_request.assert_called_once()

    @patch('services.wordpress_service.requests.request')
    def test_test_connection_failure(self, mock_request, wp_service):
        """Test failed connection test"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_request.return_value = mock_response

        success, result = wp_service.test_connection()

        assert success == False
        assert 'error' in result

    @patch('services.wordpress_service.requests.request')
    def test_test_connection_timeout(self, mock_request, wp_service):
        """Test connection timeout"""
        mock_request.side_effect = Exception('Connection timeout')

        success, result = wp_service.test_connection()

        assert success == False
        assert 'error' in result

    @patch('services.wordpress_service.requests.request')
    def test_fetch_post_by_slug(self, mock_request, wp_service):
        """Test fetching post by slug"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{
            'id': 123,
            'title': {'rendered': 'Test Post'},
            'content': {'rendered': '<p>Content</p>'},
            'status': 'publish',
            '_embedded': {}
        }]
        mock_request.return_value = mock_response

        post = wp_service.fetch_post_by_slug('test-post')

        assert post is not None
        assert post['id'] == 123
        assert post['title']['rendered'] == 'Test Post'

    @patch('services.wordpress_service.requests.request')
    def test_fetch_post_by_slug_not_found(self, mock_request, wp_service):
        """Test fetching non-existent post"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []  # Empty array
        mock_request.return_value = mock_response

        post = wp_service.fetch_post_by_slug('non-existent')

        assert post is None

    def test_parse_post_data(self, wp_service):
        """Test parsing WordPress API post data"""
        raw_post = {
            'id': 123,
            'link': 'https://test.com/post',
            'title': {'rendered': 'Test Post'},
            'content': {'rendered': '<p>Content</p>'},
            'excerpt': {'rendered': 'Excerpt'},
            'status': 'publish',
            'modified': '2025-01-01T10:00:00',
            'author': 1,
            '_embedded': {
                'wp:term': [[
                    {'id': 1, 'name': 'Category 1', 'taxonomy': 'category'}
                ]],
                'wp:featuredmedia': [
                    {'source_url': 'https://test.com/image.jpg'}
                ]
            },
            'yoast_head_json': {
                'title': 'SEO Title',
                'description': 'SEO Description'
            }
        }

        parsed = wp_service.parse_post_data(raw_post)

        assert parsed['id'] == 123
        assert parsed['title'] == 'Test Post'
        assert parsed['content'] == '<p>Content</p>'
        assert parsed['status'] == 'publish'
        assert len(parsed['categories']) == 1
        assert parsed['categories'][0]['name'] == 'Category 1'
        assert parsed['featured_image'] == 'https://test.com/image.jpg'
        assert parsed['seo_title'] == 'SEO Title'
        assert parsed['seo_description'] == 'SEO Description'

    @patch('services.wordpress_service.requests.request')
    def test_update_post_success(self, mock_request, wp_service):
        """Test updating a post successfully"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 123,
            'title': {'rendered': 'Updated Title'},
            'content': {'rendered': '<p>Updated</p>'},
            'status': 'publish',
            '_embedded': {}
        }
        mock_request.return_value = mock_response

        success, result = wp_service.update_post(
            123,
            {'title': 'Updated Title'}
        )

        assert success == True
        assert result['title'] == 'Updated Title'

    @patch('services.wordpress_service.requests.request')
    def test_update_post_failure(self, mock_request, wp_service):
        """Test failed post update"""
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.json.return_value = {'message': 'Permission denied'}
        mock_request.return_value = mock_response

        success, result = wp_service.update_post(
            123,
            {'title': 'Updated'}
        )

        assert success == False
        assert 'error' in result

    @patch('services.wordpress_service.requests.request')
    def test_get_categories(self, mock_request, wp_service):
        """Test getting categories"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {'id': 1, 'name': 'Category 1', 'slug': 'cat-1'},
            {'id': 2, 'name': 'Category 2', 'slug': 'cat-2'}
        ]
        mock_request.return_value = mock_response

        categories = wp_service.get_categories()

        assert len(categories) == 2
        assert categories[0]['name'] == 'Category 1'
        assert categories[1]['name'] == 'Category 2'

    @patch('services.wordpress_service.requests.request')
    def test_fetch_posts_concurrent(self, mock_request, wp_service):
        """Test fetching multiple posts concurrently"""
        # Mock response for multiple calls
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{
            'id': 1,
            'title': {'rendered': 'Post'},
            'content': {'rendered': '<p>Content</p>'},
            'status': 'publish',
            '_embedded': {}
        }]
        mock_request.return_value = mock_response

        urls = [
            'https://test.com/post-1',
            'https://test.com/post-2',
            'https://test.com/post-3'
        ]

        results = wp_service.fetch_posts_concurrent(urls, max_workers=2)

        assert len(results) == 3
        # At least one should succeed (mocked)
        assert any('id' in result for result in results)
