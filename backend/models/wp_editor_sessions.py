"""
WordPress Editor Sessions Module
Handles editor sessions, snapshots, and post data
"""
import sqlite3
import json
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../check_history.db")


def create_editor_session(session_id, wp_site_id, domain, posts, is_snapshot=0, session_name=None):
    """
    Tạo editor session mới (working session hoặc snapshot)
    posts: list of post dicts
    Returns: session_id
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    # Create session
    c.execute('''
        INSERT INTO wp_editor_sessions (session_id, wp_site_id, domain, session_name, total_posts, is_snapshot, created_at, last_accessed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (session_id, wp_site_id, domain, session_name, len(posts), is_snapshot, now, now))

    # Insert posts
    inserted_count = 0
    for post in posts:
        post_id = post.get('id')
        if not post_id:
            print(f"[Database] Warning: Skipping post without ID: {post.get('title', 'Unknown')}, keys: {list(post.keys())}")
            continue

        outgoing_links_json = json.dumps(post.get('outgoing_links', [])) if post.get('outgoing_links') else None

        c.execute('''
            INSERT INTO wp_editor_posts (session_id, post_id, url, title, status, outgoing_links, date_modified, wp_site_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (session_id, post_id, post.get('url', ''), post.get('title', ''),
              post.get('status', ''), outgoing_links_json, post.get('date_modified'), wp_site_id))
        inserted_count += 1

    # Update total_posts với số lượng thực tế inserted
    c.execute('UPDATE wp_editor_sessions SET total_posts = ? WHERE session_id = ?',
             (inserted_count, session_id))

    conn.commit()
    conn.close()

    print(f"[Database] Created session {session_id}: inserted {inserted_count}/{len(posts)} posts")

    return session_id


def get_editor_session(session_id):
    """
    Lấy editor session và tất cả posts
    Returns: dict with session info and posts list
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Get session info
    c.execute('''
        SELECT session_id, wp_site_id, domain, session_name, total_posts, is_snapshot, created_at, last_accessed
        FROM wp_editor_sessions
        WHERE session_id = ?
    ''', (session_id,))

    session_row = c.fetchone()
    if not session_row:
        conn.close()
        return None

    session = dict(session_row)
    session['is_snapshot'] = bool(session['is_snapshot'])

    # Get posts
    c.execute('''
        SELECT post_id, url, title, status, outgoing_links, date_modified, wp_site_id
        FROM wp_editor_posts
        WHERE session_id = ?
        ORDER BY post_id
    ''', (session_id,))

    posts_rows = c.fetchall()
    posts = []
    for row in posts_rows:
        post = dict(row)
        # Add 'id' field for frontend compatibility (frontend expects both 'id' and 'post_id')
        post['id'] = post['post_id']
        # Parse outgoing_links JSON
        if post['outgoing_links']:
            try:
                post['outgoing_links'] = json.loads(post['outgoing_links'])
            except:
                post['outgoing_links'] = []
        else:
            post['outgoing_links'] = []
        posts.append(post)

    session['posts'] = posts

    # Update last_accessed
    c.execute('''
        UPDATE wp_editor_sessions
        SET last_accessed = ?
        WHERE session_id = ?
    ''', (datetime.now(timezone.utc).isoformat(), session_id))

    conn.commit()
    conn.close()

    return session


def update_editor_post(session_id, post_id, field, value):
    """
    Cập nhật một field của post trong session
    Returns: True nếu thành công
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Whitelist allowed fields
    ALLOWED_FIELDS = ['title', 'status', 'outgoing_links', 'date_modified']
    if field not in ALLOWED_FIELDS:
        conn.close()
        return False

    query = f'UPDATE wp_editor_posts SET {field} = ? WHERE session_id = ? AND post_id = ?'
    c.execute(query, (value, session_id, post_id))

    success = c.rowcount > 0
    conn.commit()
    conn.close()

    return success


def get_snapshot_by_domain(wp_site_id, domain):
    """
    Lấy snapshot gần nhất của domain
    Returns: dict hoặc None
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT session_id, session_name, total_posts, created_at
        FROM wp_editor_sessions
        WHERE wp_site_id = ? AND domain = ? AND is_snapshot = 1
        ORDER BY created_at DESC
        LIMIT 1
    ''', (wp_site_id, domain))

    row = c.fetchone()
    conn.close()

    return dict(row) if row else None


def save_snapshot_from_session(source_session_id, wp_site_id, domain, session_name):
    """
    Tạo snapshot mới từ working session
    Returns: snapshot_session_id
    """
    import uuid

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Get posts from source session
    c.execute('''
        SELECT post_id, url, title, status, outgoing_links, date_modified, wp_site_id
        FROM wp_editor_posts
        WHERE session_id = ?
    ''', (source_session_id,))

    posts_rows = c.fetchall()

    if not posts_rows:
        conn.close()
        return None

    # Create new snapshot session
    snapshot_session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    c.execute('''
        INSERT INTO wp_editor_sessions (session_id, wp_site_id, domain, session_name, total_posts, is_snapshot, created_at, last_accessed)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    ''', (snapshot_session_id, wp_site_id, domain, session_name, len(posts_rows), now, now))

    # Copy posts to snapshot
    for row in posts_rows:
        c.execute('''
            INSERT INTO wp_editor_posts (session_id, post_id, url, title, status, outgoing_links, date_modified, wp_site_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (snapshot_session_id, row[0], row[1], row[2], row[3], row[4], row[5], row[6]))

    conn.commit()
    conn.close()

    return snapshot_session_id


def list_snapshots(wp_site_id=None, snapshots_only=True, limit=50):
    """
    List snapshots (hoặc tất cả sessions), grouped by domain
    Returns: dict grouped by domain
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Build query
    query = '''
        SELECT session_id, wp_site_id, domain, session_name, total_posts, is_snapshot, created_at, last_accessed
        FROM wp_editor_sessions
        WHERE 1=1
    '''
    params = []

    if wp_site_id:
        query += ' AND wp_site_id = ?'
        params.append(wp_site_id)

    if snapshots_only:
        query += ' AND is_snapshot = 1'

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.append(limit)

    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    # Group by domain
    grouped = {}
    for row in rows:
        session = dict(row)
        session['is_snapshot'] = bool(session['is_snapshot'])
        domain = session['domain']

        if domain not in grouped:
            grouped[domain] = []

        grouped[domain].append(session)

    return grouped


def delete_editor_session(session_id):
    """
    Xóa editor session và tất cả posts
    Returns: True nếu thành công
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        # Delete posts (CASCADE should handle this, but explicitly delete for safety)
        c.execute('DELETE FROM wp_editor_posts WHERE session_id = ?', (session_id,))

        # Delete session
        c.execute('DELETE FROM wp_editor_sessions WHERE session_id = ?', (session_id,))

        success = c.rowcount > 0
        conn.commit()
        return success
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def cleanup_old_working_sessions(hours=24):
    """
    Xóa các working sessions (không phải snapshots) cũ hơn X giờ
    Returns: số lượng sessions đã xóa
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        # Delete old working sessions (not snapshots)
        c.execute('''
            DELETE FROM wp_editor_sessions
            WHERE is_snapshot = 0
            AND datetime(last_accessed) < datetime('now', ? || ' hours')
        ''', (f'-{hours}',))

        deleted = c.rowcount
        conn.commit()
        return deleted
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
