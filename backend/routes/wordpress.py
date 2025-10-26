"""
WordPress REST API routes
Handles WordPress post operations via REST API with Application Password auth
Uses WordPressService for all API interactions
"""
from flask import Blueprint, request, jsonify
import logging
from models.database import save_post_outgoing_url, get_post_outgoing_url
from utils.html_parser import extract_outgoing_links
from services.wordpress_service import create_wordpress_service

logger = logging.getLogger(__name__)
bp = Blueprint('wordpress', __name__)


@bp.route("/api/wordpress/test-connection", methods=["POST"])
def test_wordpress_connection():
    """Test WordPress REST API connection"""
    try:
        data = request.json
        site_url = data.get('site_url', '').rstrip('/')
        username = data.get('username')
        app_password = data.get('app_password')

        if not all([site_url, username, app_password]):
            return jsonify({"error": "Missing required fields"}), 400

        # Create WordPress service
        wp_service = create_wordpress_service(site_url, username, app_password)

        # Test connection
        success, result = wp_service.test_connection()

        if success:
            return jsonify({
                "success": True,
                "message": "Connection successful",
                "user": result
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Connection failed')
            }), 401

    except Exception as e:
        logger.error(f"WordPress connection test failed: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/api/wordpress/posts", methods=["POST"])
def get_wordpress_posts():
    """Get WordPress posts by URLs - with concurrent execution"""
    try:
        data = request.json
        site_url = data.get('site_url', '').rstrip('/')
        username = data.get('username')
        app_password = data.get('app_password')
        urls = data.get('urls', [])
        wp_site_id = data.get('wp_site_id')  # ID của WordPress site từ database

        if not all([site_url, username, app_password]):
            return jsonify({"error": "Missing authentication credentials"}), 400

        if not urls:
            return jsonify({"error": "No URLs provided"}), 400

        # Create WordPress service
        wp_service = create_wordpress_service(site_url, username, app_password)

        # Fetch posts concurrently
        posts_data = wp_service.fetch_posts_concurrent(urls, max_workers=10)

        # Enrich posts with additional data (outgoing_url from DB and extract links)
        for post in posts_data:
            if 'id' in post and post['id']:  # Valid post
                post_id = post['id']
                post['post_id'] = post_id  # Add post_id field for frontend compatibility
                url = post.get('url', '')

                # Get outgoing_url from our database (legacy field)
                if wp_site_id and post_id:
                    db_outgoing = get_post_outgoing_url(wp_site_id, post_id)
                    post['outgoing_url'] = db_outgoing.get('outgoing_url', '') if db_outgoing else ''
                else:
                    post['outgoing_url'] = ''

                # Extract outgoing links from content
                content_html = post.get('content', '')
                outgoing_links = extract_outgoing_links(content_html, url)
                post['outgoing_links'] = outgoing_links

        return jsonify({
            "total": len(posts_data),
            "posts": posts_data
        }), 200

    except Exception as e:
        logger.error(f"Error in get_wordpress_posts: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/api/wordpress/post/<int:post_id>", methods=["PUT"])
def update_wordpress_post(post_id):
    """Update a WordPress post"""
    try:
        data = request.json
        site_url = data.get('site_url', '').rstrip('/')
        username = data.get('username')
        app_password = data.get('app_password')

        if not all([site_url, username, app_password]):
            return jsonify({"error": "Missing authentication credentials"}), 400

        # Prepare update data
        update_data = {}

        if 'title' in data:
            update_data['title'] = data['title']
        if 'content' in data:
            update_data['content'] = data['content']
        if 'excerpt' in data:
            update_data['excerpt'] = data['excerpt']
        if 'status' in data:
            update_data['status'] = data['status']
        if 'categories' in data:
            # Extract category IDs
            update_data['categories'] = [cat['id'] if isinstance(cat, dict) else cat for cat in data['categories']]

        # Update SEO fields if using Yoast
        if 'seo_title' in data or 'seo_description' in data:
            update_data['yoast_wpseo_title'] = data.get('seo_title', '')
            update_data['yoast_wpseo_metadesc'] = data.get('seo_description', '')

        # Store outgoing_url in our database (not WordPress meta)
        if 'outgoing_url' in data:
            wp_site_id = data.get('wp_site_id')
            post_url = data.get('url', '')
            outgoing_url = data['outgoing_url']
            logger.info(f"Saving outgoing_url for post {post_id}: wp_site_id={wp_site_id}, url={post_url}, outgoing_url={outgoing_url}")
            if wp_site_id:
                save_post_outgoing_url(wp_site_id, post_id, post_url, outgoing_url)
                logger.info(f"Saved outgoing_url to database for post {post_id}")
            else:
                logger.warning(f"wp_site_id is missing, cannot save outgoing_url for post {post_id}")

        # Create WordPress service and update post
        wp_service = create_wordpress_service(site_url, username, app_password)
        success, result = wp_service.update_post(post_id, update_data)

        if success:
            logger.info(f"Updated post {post_id}")
            return jsonify({
                "success": True,
                "message": "Post updated successfully",
                "post": result
            }), 200
        else:
            logger.error(f"Failed to update post {post_id}: {result.get('error')}")
            return jsonify({
                "success": False,
                "error": result.get('error', 'Update failed')
            }), 400

    except Exception as e:
        logger.error(f"Error updating post {post_id}: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/api/wordpress/categories", methods=["POST"])
def get_wordpress_categories():
    """Get all categories from WordPress site"""
    try:
        data = request.json
        site_url = data.get('site_url', '').rstrip('/')
        username = data.get('username')
        app_password = data.get('app_password')

        if not all([site_url, username, app_password]):
            return jsonify({"error": "Missing authentication credentials"}), 400

        # Create WordPress service
        wp_service = create_wordpress_service(site_url, username, app_password)

        # Get categories
        categories = wp_service.get_categories(per_page=100)

        return jsonify({
            "categories": [
                {
                    'id': cat.get('id'),
                    'name': cat.get('name'),
                    'slug': cat.get('slug'),
                    'count': cat.get('count')
                }
                for cat in categories
            ]
        }), 200

    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        return jsonify({"error": str(e)}), 500
