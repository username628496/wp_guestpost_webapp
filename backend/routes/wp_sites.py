from flask import Blueprint, request, jsonify
from models.database import (
    add_wp_site,
    get_all_wp_sites,
    get_active_wp_site,
    set_active_wp_site,
    update_wp_site,
    delete_wp_site
)
from utils.logger import logger
from utils.validators import validate_url, validate_domain, sanitize_string

bp = Blueprint('wp_sites', __name__)

@bp.route("/api/wp-sites", methods=["GET"])
def get_wp_sites():
    """Lấy danh sách tất cả WordPress sites"""
    try:
        sites = get_all_wp_sites()
        return jsonify({"success": True, "sites": sites}), 200
    except Exception as e:
        logger.error(f"Error getting WordPress sites: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route("/api/wp-sites", methods=["POST"])
def create_wp_site():
    """Thêm WordPress site mới"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['name', 'site_url', 'username', 'app_password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400

        # Validate and sanitize site_url
        site_url = data['site_url'].strip().rstrip('/')
        is_valid, error_msg = validate_url(site_url)
        if not is_valid:
            return jsonify({"success": False, "error": f"Site URL không hợp lệ: {error_msg}"}), 400

        # Validate wordpress_url if provided
        wordpress_url = None
        if data.get('wordpress_url'):
            wordpress_url = data['wordpress_url'].strip().rstrip('/')
            is_valid, error_msg = validate_url(wordpress_url)
            if not is_valid:
                return jsonify({"success": False, "error": f"WordPress URL không hợp lệ: {error_msg}"}), 400

        # Sanitize text inputs
        name = sanitize_string(data['name'], max_length=200)
        username = sanitize_string(data['username'], max_length=100)
        app_password = sanitize_string(data['app_password'], max_length=200)
        wordpress_password = sanitize_string(data.get('wordpress_password', ''), max_length=200) if data.get('wordpress_password') else None

        if not name or not username or not app_password:
            return jsonify({"success": False, "error": "Name, username và app_password không được để trống"}), 400

        # Add site to database
        site_id = add_wp_site(
            name=name,
            site_url=site_url,
            username=username,
            app_password=app_password,
            wordpress_password=wordpress_password,
            wordpress_url=wordpress_url
        )

        # Get the newly created site
        sites = get_all_wp_sites()
        new_site = next((s for s in sites if s['id'] == site_id), None)

        return jsonify({"success": True, "site": new_site}), 201
    except Exception as e:
        logger.error(f"Error creating WordPress site: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route("/api/wp-sites/active", methods=["GET"])
def get_active_site():
    """Lấy WordPress site đang active"""
    try:
        site = get_active_wp_site()
        if site:
            return jsonify({"success": True, "site": site}), 200
        else:
            return jsonify({"success": True, "site": None}), 200
    except Exception as e:
        logger.error(f"Error getting active WordPress site: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route("/api/wp-sites/find-by-domain", methods=["POST"])
def find_site_by_domain():
    """Tìm WordPress site theo domain"""
    try:
        data = request.get_json()
        domain = data.get('domain')

        if not domain:
            return jsonify({"success": False, "error": "domain is required"}), 400

        # Helper function to normalize domain (remove www prefix)
        def normalize_domain(d):
            if d and d.startswith('www.'):
                return d[4:]
            return d

        # Get all sites and find matching domain
        from urllib.parse import urlparse
        sites = get_all_wp_sites()

        normalized_domain = normalize_domain(domain)

        matching_site = None
        for site in sites:
            site_domain = urlparse(site['site_url']).hostname
            normalized_site_domain = normalize_domain(site_domain)

            # Compare both exact match and normalized match (handles www variations)
            if site_domain == domain or normalized_site_domain == normalized_domain:
                matching_site = site
                break

        if matching_site:
            return jsonify({"success": True, "site": matching_site}), 200
        else:
            return jsonify({"success": False, "site": None, "message": f"No WP site found for domain: {domain}"}), 404
    except Exception as e:
        logger.error(f"Error finding WordPress site by domain: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route("/api/wp-sites/<int:site_id>/active", methods=["PUT"])
def set_site_active(site_id):
    """Set WordPress site làm active"""
    try:
        success = set_active_wp_site(site_id)
        if success:
            # Get the updated active site
            site = get_active_wp_site()
            return jsonify({"success": True, "site": site}), 200
        else:
            return jsonify({"success": False, "error": "Site not found"}), 404
    except Exception as e:
        logger.error(f"Error setting active WordPress site: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route("/api/wp-sites/<int:site_id>", methods=["PUT"])
def update_site(site_id):
    """Cập nhật thông tin WordPress site"""
    try:
        data = request.get_json()

        # Build update parameters with validation
        update_params = {}

        if 'name' in data:
            name = sanitize_string(data['name'], max_length=200)
            if not name:
                return jsonify({"success": False, "error": "Name không được để trống"}), 400
            update_params['name'] = name

        if 'site_url' in data:
            site_url = data['site_url'].strip().rstrip('/')
            is_valid, error_msg = validate_url(site_url)
            if not is_valid:
                return jsonify({"success": False, "error": f"Site URL không hợp lệ: {error_msg}"}), 400
            update_params['site_url'] = site_url

        if 'username' in data:
            username = sanitize_string(data['username'], max_length=100)
            if not username:
                return jsonify({"success": False, "error": "Username không được để trống"}), 400
            update_params['username'] = username

        if 'app_password' in data:
            app_password = sanitize_string(data['app_password'], max_length=200)
            if not app_password:
                return jsonify({"success": False, "error": "App password không được để trống"}), 400
            update_params['app_password'] = app_password

        if 'wordpress_password' in data:
            wordpress_password = sanitize_string(data['wordpress_password'], max_length=200) if data['wordpress_password'] else None
            update_params['wordpress_password'] = wordpress_password

        if 'wordpress_url' in data:
            if data['wordpress_url']:
                wordpress_url = data['wordpress_url'].strip().rstrip('/')
                is_valid, error_msg = validate_url(wordpress_url)
                if not is_valid:
                    return jsonify({"success": False, "error": f"WordPress URL không hợp lệ: {error_msg}"}), 400
                update_params['wordpress_url'] = wordpress_url
            else:
                update_params['wordpress_url'] = None

        if not update_params:
            return jsonify({"success": False, "error": "No fields to update"}), 400

        success = update_wp_site(site_id, **update_params)
        if success:
            # Get updated sites list
            sites = get_all_wp_sites()
            updated_site = next((s for s in sites if s['id'] == site_id), None)
            return jsonify({"success": True, "site": updated_site}), 200
        else:
            return jsonify({"success": False, "error": "Site not found"}), 404
    except Exception as e:
        logger.error(f"Error updating WordPress site: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route("/api/wp-sites/<int:site_id>", methods=["DELETE"])
def delete_site(site_id):
    """Xóa WordPress site"""
    try:
        success = delete_wp_site(site_id)
        if success:
            return jsonify({"success": True}), 200
        else:
            return jsonify({"success": False, "error": "Site not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting WordPress site: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
