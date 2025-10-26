"""
WordPress Edit History API routes
"""
from flask import Blueprint, request, jsonify
import json
from models.database import (
    create_edit_history,
    update_edit_history,
    get_all_edit_history,
    get_edit_history_by_id,
    delete_edit_history
)

bp = Blueprint('history', __name__)

@bp.route("/api/history", methods=["GET"])
def get_history_list():
    """Get all edit history sessions"""
    try:
        limit = request.args.get('limit', 50, type=int)
        history_list = get_all_edit_history(limit=limit)
        return jsonify({"history": history_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/api/history/<int:history_id>", methods=["GET"])
def get_history_detail(history_id):
    """Get detailed history session"""
    try:
        history = get_edit_history_by_id(history_id)
        if not history:
            return jsonify({"error": "History not found"}), 404

        # Parse snapshot_data JSON
        if history['snapshot_data']:
            try:
                history['snapshot_data'] = json.loads(history['snapshot_data'])
            except:
                pass

        return jsonify(history), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/api/history", methods=["POST"])
def create_history():
    """Create new edit history session"""
    try:
        data = request.json
        wp_site_id = data.get('wp_site_id')
        session_name = data.get('session_name', 'Unnamed Session')
        snapshot_data = json.dumps(data.get('posts', []))

        history_id = create_edit_history(wp_site_id, session_name, snapshot_data)

        return jsonify({
            "success": True,
            "history_id": history_id,
            "message": "History saved successfully"
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/api/history/<int:history_id>", methods=["PUT"])
def update_history(history_id):
    """Update existing history session"""
    try:
        data = request.json
        snapshot_data = json.dumps(data.get('posts')) if 'posts' in data else None
        total_posts = data.get('total_posts')
        edited_posts = data.get('edited_posts')

        update_edit_history(history_id, snapshot_data, total_posts, edited_posts)

        return jsonify({
            "success": True,
            "message": "History updated successfully"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/api/history/<int:history_id>", methods=["DELETE"])
def delete_history(history_id):
    """Delete history session"""
    try:
        delete_edit_history(history_id)
        return jsonify({
            "success": True,
            "message": "History deleted successfully"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
