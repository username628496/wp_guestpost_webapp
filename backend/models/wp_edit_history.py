"""
WordPress Edit History Module
Legacy module for tracking WordPress editing history
(This is separate from editor_sessions which is the new implementation)
"""
import sqlite3
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../check_history.db")


def create_edit_history(wp_site_id, session_name, snapshot_data):
    """
    Tạo edit history entry mới (legacy)
    snapshot_data: JSON string
    Returns: history_id
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''
        INSERT INTO wp_edit_history (wp_site_id, session_name, snapshot_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (wp_site_id, session_name, snapshot_data,
          datetime.now(timezone.utc).isoformat(),
          datetime.now(timezone.utc).isoformat()))

    history_id = c.lastrowid
    conn.commit()
    conn.close()

    return history_id


def update_edit_history(history_id, snapshot_data, total_posts=None, edited_posts=None):
    """
    Cập nhật edit history (legacy)
    Returns: True nếu thành công
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    updates = ['snapshot_data = ?', 'updated_at = ?']
    params = [snapshot_data, datetime.now(timezone.utc).isoformat()]

    if total_posts is not None:
        updates.append('total_posts = ?')
        params.append(total_posts)

    if edited_posts is not None:
        updates.append('edited_posts = ?')
        params.append(edited_posts)

    params.append(history_id)

    query = f'UPDATE wp_edit_history SET {", ".join(updates)} WHERE id = ?'
    c.execute(query, params)

    success = c.rowcount > 0
    conn.commit()
    conn.close()

    return success


def get_all_edit_history(limit=50):
    """
    Lấy danh sách edit history (legacy)
    Returns: list of dicts
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT h.id, h.wp_site_id, h.session_name, h.total_posts, h.edited_posts, h.created_at, h.updated_at,
               s.name as site_name, s.site_url
        FROM wp_edit_history h
        LEFT JOIN wp_sites s ON h.wp_site_id = s.id
        ORDER BY h.created_at DESC
        LIMIT ?
    ''', (limit,))

    rows = c.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_edit_history_by_id(history_id):
    """
    Lấy chi tiết edit history (legacy)
    Returns: dict hoặc None
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT h.id, h.wp_site_id, h.session_name, h.total_posts, h.edited_posts, h.snapshot_data, h.created_at, h.updated_at,
               s.name as site_name, s.site_url
        FROM wp_edit_history h
        LEFT JOIN wp_sites s ON h.wp_site_id = s.id
        WHERE h.id = ?
    ''', (history_id,))

    row = c.fetchone()
    conn.close()

    return dict(row) if row else None


def delete_edit_history(history_id):
    """
    Xóa edit history (legacy)
    Returns: True nếu thành công
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('DELETE FROM wp_edit_history WHERE id = ?', (history_id,))

    success = c.rowcount > 0
    conn.commit()
    conn.close()

    return success
