"""
WordPress Sites Management Module
Handles CRUD operations for WordPress site credentials
"""
import sqlite3
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../check_history.db")


def add_wp_site(name, site_url, username, app_password, wordpress_password=None, wordpress_url=None):
    """
    Thêm WordPress site mới
    Returns: site_id nếu thành công
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Set is_active = 1 nếu đây là site đầu tiên
    c.execute('SELECT COUNT(*) FROM wp_sites')
    is_first_site = c.fetchone()[0] == 0

    c.execute('''
        INSERT INTO wp_sites (name, site_url, username, app_password, wordpress_password, wordpress_url, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name, site_url, username, app_password, wordpress_password, wordpress_url,
          1 if is_first_site else 0,
          datetime.now(timezone.utc).isoformat(),
          datetime.now(timezone.utc).isoformat()))

    site_id = c.lastrowid
    conn.commit()
    conn.close()

    return site_id


def get_all_wp_sites():
    """
    Lấy danh sách tất cả WordPress sites
    Returns: list of dicts
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT id, name, site_url, username, app_password, wordpress_password, wordpress_url, is_active, created_at, updated_at
        FROM wp_sites
        ORDER BY created_at DESC
    ''')

    rows = c.fetchall()
    conn.close()

    sites = []
    for row in rows:
        site = dict(row)
        # Convert boolean
        site['is_active'] = bool(site['is_active'])
        sites.append(site)

    return sites


def get_wp_site_by_id(site_id):
    """
    Lấy thông tin WordPress site theo ID
    Returns: dict hoặc None nếu không tìm thấy
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT id, name, site_url, username, app_password, wordpress_password, wordpress_url, is_active, created_at, updated_at
        FROM wp_sites
        WHERE id = ?
    ''', (site_id,))

    row = c.fetchone()
    conn.close()

    if not row:
        return None

    site = dict(row)
    site['is_active'] = bool(site['is_active'])
    return site


def get_active_wp_site():
    """
    Lấy WordPress site đang active
    Returns: dict hoặc None nếu không có site nào active
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT id, name, site_url, username, app_password, wordpress_password, wordpress_url, is_active, created_at, updated_at
        FROM wp_sites
        WHERE is_active = 1
        LIMIT 1
    ''')

    row = c.fetchone()
    conn.close()

    if not row:
        return None

    site = dict(row)
    site['is_active'] = bool(site['is_active'])
    return site


def set_active_wp_site(site_id):
    """
    Set WordPress site làm active (chỉ có 1 site active tại một thời điểm)
    Returns: True nếu thành công
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Kiểm tra site có tồn tại không
    c.execute('SELECT id FROM wp_sites WHERE id = ?', (site_id,))
    if not c.fetchone():
        conn.close()
        return False

    # Set tất cả sites thành inactive
    c.execute('UPDATE wp_sites SET is_active = 0, updated_at = ?',
             (datetime.now(timezone.utc).isoformat(),))

    # Set site được chọn thành active
    c.execute('''
        UPDATE wp_sites
        SET is_active = 1, updated_at = ?
        WHERE id = ?
    ''', (datetime.now(timezone.utc).isoformat(), site_id))

    conn.commit()
    conn.close()

    return True


def update_wp_site(site_id, name=None, site_url=None, username=None, app_password=None, wordpress_password=None, wordpress_url=None):
    """
    Cập nhật thông tin WordPress site
    Returns: True nếu thành công
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Whitelist of allowed fields to prevent SQL injection
    ALLOWED_FIELDS = {
        'name': name,
        'site_url': site_url,
        'username': username,
        'app_password': app_password,
        'wordpress_password': wordpress_password,
        'wordpress_url': wordpress_url
    }

    # Build dynamic update query with whitelisted fields only
    updates = []
    params = []

    for field, value in ALLOWED_FIELDS.items():
        if value is not None:
            updates.append(f'{field} = ?')
            params.append(value)

    if not updates:
        conn.close()
        return False

    updates.append('updated_at = ?')
    params.append(datetime.now(timezone.utc).isoformat())
    params.append(site_id)

    query = f'UPDATE wp_sites SET {", ".join(updates)} WHERE id = ?'
    c.execute(query, params)

    success = c.rowcount > 0
    conn.commit()
    conn.close()

    return success


def delete_wp_site(site_id):
    """
    Xóa WordPress site
    Nếu site bị xóa là active, tự động set site đầu tiên làm active
    Returns: True nếu thành công
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Kiểm tra xem site có phải là active không
    c.execute('SELECT is_active FROM wp_sites WHERE id = ?', (site_id,))
    result = c.fetchone()

    if not result:
        conn.close()
        return False

    was_active = bool(result[0])

    # Xóa site
    c.execute('DELETE FROM wp_sites WHERE id = ?', (site_id,))

    # Nếu site bị xóa là active, set site đầu tiên làm active
    if was_active:
        c.execute('SELECT id FROM wp_sites ORDER BY created_at ASC LIMIT 1')
        first_site = c.fetchone()
        if first_site:
            c.execute('UPDATE wp_sites SET is_active = 1, updated_at = ? WHERE id = ?',
                     (datetime.now(timezone.utc).isoformat(), first_site[0]))

    conn.commit()
    conn.close()

    return True
