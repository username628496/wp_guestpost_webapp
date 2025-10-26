from flask import Blueprint, jsonify, request
import logging
import uuid
from models.database import (
    create_editor_session,
    get_editor_session,
    update_editor_post,
    save_snapshot_from_session,
    list_snapshots,
    delete_editor_session,
    get_snapshot_by_domain
)

logger = logging.getLogger(__name__)

bp = Blueprint('editor_sessions', __name__)

@bp.route('/api/editor-session', methods=['POST'])
def create_session():
    """Create a new working session"""
    try:
        data = request.json
        wp_site_id = data.get('wp_site_id')
        domain = data.get('domain')
        posts = data.get('posts', [])

        if not domain or not posts:
            return jsonify({'error': 'domain and posts are required'}), 400

        # Generate new session ID
        session_id = str(uuid.uuid4())

        logger.info(f"[EditorSession] Creating new session for domain: {domain}, posts: {len(posts)}")

        # Create session in database
        create_editor_session(
            session_id=session_id,
            wp_site_id=wp_site_id,
            domain=domain,
            posts=posts,
            is_snapshot=False
        )

        return jsonify({
            'session_id': session_id,
            'domain': domain,
            'total_posts': len(posts)
        }), 201

    except Exception as e:
        logger.error(f"[EditorSession] Error creating session: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/editor-session/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get session data with posts"""
    try:
        logger.info(f"[EditorSession] Fetching session: {session_id}")

        session = get_editor_session(session_id)

        if not session:
            return jsonify({'error': 'Session not found'}), 404

        return jsonify(session), 200

    except Exception as e:
        logger.error(f"[EditorSession] Error fetching session: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/editor-session/<session_id>/post/<int:post_id>', methods=['PUT'])
def update_post(session_id, post_id):
    """Update a specific field in a post"""
    try:
        data = request.json
        field = data.get('field')
        value = data.get('value')

        if not field:
            return jsonify({'error': 'field is required'}), 400

        logger.info(f"[EditorSession] Updating post {post_id} in session {session_id}: {field}={value}")

        success = update_editor_post(session_id, post_id, field, value)

        if not success:
            return jsonify({'error': 'Post not found or update failed'}), 404

        return jsonify({'success': True}), 200

    except Exception as e:
        logger.error(f"[EditorSession] Error updating post: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/editor-session/<session_id>/refresh-outgoing-links', methods=['POST'])
def refresh_outgoing_links(session_id):
    """Re-fetch and parse outgoing links for old snapshots"""
    try:
        data = request.json
        wp_config = data.get('wp_config')

        if not wp_config:
            return jsonify({'error': 'wp_config is required'}), 400

        logger.info(f"[EditorSession] Refreshing outgoing links for session: {session_id}")

        # Get session
        session = get_editor_session(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404

        posts = session.get('posts', [])
        if not posts:
            return jsonify({'error': 'No posts found in session'}), 404

        # Import WordPress service
        from services.wordpress_service import create_wordpress_service
        from utils.html_parser import extract_outgoing_links

        # IMPORTANT: Use wp_site from SESSION, not from wp_config (active site)
        # This prevents cross-domain contamination
        session_wp_site_id = session.get('wp_site_id')

        # FIX: If session has no wp_site_id, try to find it by domain and update the session
        if not session_wp_site_id:
            logger.warning(f"[EditorSession] Session {session_id} has no wp_site_id. Attempting to find by domain...")

            domain = session.get('domain')
            if not domain and posts:
                # Extract domain from first post URL
                from urllib.parse import urlparse
                first_url = posts[0].get('url')
                if first_url:
                    domain = urlparse(first_url).hostname

            if domain:
                # Find wp_site by domain
                import sqlite3
                from models.database import DB_PATH
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()

                # Helper function to normalize domain (remove www prefix)
                def normalize_domain(d):
                    if d and d.startswith('www.'):
                        return d[4:]
                    return d

                # Try to find wp_site that matches this domain
                c.execute('''
                    SELECT id, site_url FROM wp_sites
                ''')
                sites = c.fetchall()

                normalized_domain = normalize_domain(domain)

                for site_id, site_url in sites:
                    try:
                        site_domain = urlparse(site_url).hostname
                        normalized_site_domain = normalize_domain(site_domain)

                        # Compare both exact match and normalized match
                        if site_domain == domain or normalized_site_domain == normalized_domain:
                            session_wp_site_id = site_id
                            logger.info(f"[EditorSession] Found matching wp_site_id={site_id} for domain={domain} (site_url={site_url})")

                            # Update the session with wp_site_id
                            c.execute('''
                                UPDATE wp_editor_sessions
                                SET wp_site_id = ?
                                WHERE session_id = ?
                            ''', (site_id, session_id))
                            conn.commit()
                            break
                    except:
                        continue

                conn.close()

            if not session_wp_site_id:
                return jsonify({'error': f'Session has no wp_site_id and could not find matching WP site for domain {domain}. Please add the site first.'}), 400

        # Get wp_site info from database
        from models.database import get_wp_site_by_id
        wp_site = get_wp_site_by_id(session_wp_site_id)

        if not wp_site:
            return jsonify({'error': f'WP site {session_wp_site_id} not found'}), 404

        # Prepare auth tuple from SESSION'S wp_site, not active site
        site_url = wp_site['site_url']
        username = wp_site['username']
        app_password = wp_site['app_password']
        auth = (username, app_password)
        wp_site_id = wp_site['id']

        logger.info(f"[EditorSession] Fetching from session's site: {site_url} (wp_site_id={wp_site_id})")

        # Create WordPress service for this site
        wp_service = create_wordpress_service(site_url, username, app_password)

        # Extract URLs from posts
        post_urls = [post['url'] for post in posts]

        # Fetch all posts concurrently using service
        fresh_posts = wp_service.fetch_posts_concurrent(post_urls, max_workers=5)

        # Update outgoing_links in database
        import json
        import sqlite3
        from models.database import DB_PATH

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        updated_count = 0
        for fresh_post in fresh_posts:
            # Match with original post by id
            if 'id' not in fresh_post or fresh_post.get('error'):
                continue

            post_id = fresh_post['id']

            # Extract outgoing links from fresh content
            content_html = fresh_post.get('content', '')
            post_url = fresh_post.get('url', '')
            outgoing_links = extract_outgoing_links(content_html, post_url)

            if outgoing_links:
                outgoing_links_json = json.dumps(outgoing_links)

                c.execute('''
                    UPDATE wp_editor_posts
                    SET outgoing_links = ?
                    WHERE session_id = ? AND post_id = ?
                ''', (outgoing_links_json, session_id, post_id))

                updated_count += 1
                logger.info(f"[EditorSession] Updated outgoing_links for post {post_id}")

        conn.commit()
        conn.close()

        logger.info(f"[EditorSession] Refreshed outgoing_links for {updated_count}/{len(posts)} posts")

        # Return updated session
        updated_session = get_editor_session(session_id)
        return jsonify({
            'success': True,
            'updated_count': updated_count,
            'total_posts': len(posts),
            'session': updated_session
        }), 200

    except Exception as e:
        logger.error(f"[EditorSession] Error refreshing outgoing links: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/editor-session/<session_id>/snapshot', methods=['POST'])
def save_snapshot(session_id):
    """Save/overwrite snapshot from working session"""
    try:
        data = request.json
        session_name = data.get('session_name', '')

        logger.info(f"[EditorSession] Saving snapshot from session: {session_id}")

        # Get source session to extract metadata
        source_session = get_editor_session(session_id)
        if not source_session:
            return jsonify({'error': 'Source session not found'}), 404

        wp_site_id = source_session.get('wp_site_id')
        domain = source_session.get('domain')

        # Validate domain (required field)
        if not domain:
            # Try to extract domain from first post URL
            posts = source_session.get('posts', [])
            if posts and len(posts) > 0 and posts[0].get('url'):
                from urllib.parse import urlparse
                domain = urlparse(posts[0]['url']).hostname
                logger.info(f"[EditorSession] Extracted domain from post URL: {domain}")
            else:
                return jsonify({'error': 'Cannot determine domain for snapshot'}), 400

        # FIX: If session has no wp_site_id, try to find it by domain
        if not wp_site_id and domain:
            logger.warning(f"[EditorSession] Session {session_id} has no wp_site_id. Attempting to find by domain...")

            import sqlite3
            from models.database import DB_PATH
            from urllib.parse import urlparse

            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()

            # Helper function to normalize domain (remove www prefix)
            def normalize_domain(d):
                if d and d.startswith('www.'):
                    return d[4:]
                return d

            # Try to find wp_site that matches this domain
            c.execute('SELECT id, site_url FROM wp_sites')
            sites = c.fetchall()

            normalized_domain = normalize_domain(domain)

            for site_id, site_url in sites:
                try:
                    site_domain = urlparse(site_url).hostname
                    normalized_site_domain = normalize_domain(site_domain)

                    # Compare both exact match and normalized match
                    if site_domain == domain or normalized_site_domain == normalized_domain:
                        wp_site_id = site_id
                        logger.info(f"[EditorSession] Found matching wp_site_id={site_id} for domain={domain} (site_url={site_url})")

                        # Update the source session with wp_site_id
                        c.execute('''
                            UPDATE wp_editor_sessions
                            SET wp_site_id = ?
                            WHERE session_id = ?
                        ''', (site_id, session_id))
                        conn.commit()
                        break
                except:
                    continue

            conn.close()

        # Check if snapshot already exists for this domain
        existing_snapshot = get_snapshot_by_domain(wp_site_id, domain)

        # Save or overwrite snapshot
        snapshot_id = save_snapshot_from_session(
            source_session_id=session_id,
            wp_site_id=wp_site_id,
            domain=domain,
            session_name=session_name or f"Snapshot - {domain}"
        )

        action = 'overwritten' if existing_snapshot else 'created'
        logger.info(f"[EditorSession] Snapshot {action} for domain {domain}: {snapshot_id}")

        return jsonify({
            'snapshot_id': snapshot_id,
            'action': action,
            'message': f'Snapshot {action} successfully'
        }), 200

    except Exception as e:
        logger.error(f"[EditorSession] Error saving snapshot: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/editor-sessions', methods=['GET'])
def list_sessions():
    """List sessions/snapshots with optional filtering"""
    try:
        wp_site_id = request.args.get('wp_site_id', type=int)
        snapshots_only = request.args.get('snapshots_only', 'false').lower() == 'true'
        limit = request.args.get('limit', 50, type=int)

        logger.info(f"[EditorSession] Listing sessions (snapshots_only={snapshots_only}, limit={limit})")

        sessions_grouped = list_snapshots(
            wp_site_id=wp_site_id,
            snapshots_only=snapshots_only,
            limit=limit
        )

        # Return grouped by domain (dict) - frontend expects this format
        return jsonify({
            'sessions': sessions_grouped,  # This is a dict: {domain: [sessions]}
            'total': sum(len(sessions) for sessions in sessions_grouped.values())
        }), 200

    except Exception as e:
        logger.error(f"[EditorSession] Error listing sessions: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/editor-session/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a session (working or snapshot)"""
    try:
        logger.info(f"[EditorSession] Deleting session: {session_id}")

        success = delete_editor_session(session_id)

        if not success:
            return jsonify({'error': 'Session not found'}), 404

        return jsonify({'success': True}), 200

    except Exception as e:
        logger.error(f"[EditorSession] Error deleting session: {str(e)}")
        return jsonify({'error': str(e)}), 500