"""
WordPress Outgoing URLs Tracking Module
Legacy module for tracking outgoing URLs in WordPress posts
"""
import sqlite3
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../check_history.db")


def save_post_outgoing_url(wp_site_id, post_id, post_url, outgoing_url):
    """
    Lưu outgoing URL của post (legacy - replaced by outgoing_links in editor_posts)
    Returns: True nếu thành công
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        # Check if exists
        c.execute('''
            SELECT id FROM wp_post_outgoing_urls
            WHERE wp_site_id = ? AND post_id = ?
        ''', (wp_site_id, post_id))

        exists = c.fetchone()

        if exists:
            # Update
            c.execute('''
                UPDATE wp_post_outgoing_urls
                SET post_url = ?, outgoing_url = ?, updated_at = ?
                WHERE wp_site_id = ? AND post_id = ?
            ''', (post_url, outgoing_url, datetime.now(timezone.utc).isoformat(),
                  wp_site_id, post_id))
        else:
            # Insert
            c.execute('''
                INSERT INTO wp_post_outgoing_urls (wp_site_id, post_id, post_url, outgoing_url, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (wp_site_id, post_id, post_url, outgoing_url,
                  datetime.now(timezone.utc).isoformat(),
                  datetime.now(timezone.utc).isoformat()))

        conn.commit()
        return True
    except Exception as e:
        print(f"[Database] Error saving outgoing URL: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def get_post_outgoing_url(wp_site_id, post_id):
    """
    Lấy outgoing URL của post
    Returns: dict hoặc None
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT wp_site_id, post_id, post_url, outgoing_url, created_at, updated_at
        FROM wp_post_outgoing_urls
        WHERE wp_site_id = ? AND post_id = ?
    ''', (wp_site_id, post_id))

    row = c.fetchone()
    conn.close()

    return dict(row) if row else None


def get_posts_outgoing_urls(wp_site_id, post_ids):
    """
    Lấy outgoing URLs của nhiều posts
    Returns: dict {post_id: outgoing_url}
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Build placeholders
    placeholders = ','.join(['?'] * len(post_ids))
    query = f'''
        SELECT post_id, outgoing_url
        FROM wp_post_outgoing_urls
        WHERE wp_site_id = ? AND post_id IN ({placeholders})
    '''

    params = [wp_site_id] + post_ids
    c.execute(query, params)

    rows = c.fetchall()
    conn.close()

    return {row['post_id']: row['outgoing_url'] for row in rows}
