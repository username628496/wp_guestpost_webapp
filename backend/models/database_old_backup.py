import sqlite3
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../check_history.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Table cũ cho backward compatibility
    c.execute('''
        CREATE TABLE IF NOT EXISTS check_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            status TEXT,
            checked_at TEXT
        )
    ''')

    # Table mới: lưu theo domain sessions
    c.execute('''
        CREATE TABLE IF NOT EXISTS domain_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT,
            total_urls INTEGER,
            indexed_count INTEGER,
            not_indexed_count INTEGER,
            error_count INTEGER,
            created_at TEXT
        )
    ''')

    # Table chi tiết URLs cho mỗi domain check
    c.execute('''
        CREATE TABLE IF NOT EXISTS domain_check_urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain_check_id INTEGER,
            url TEXT,
            status TEXT,
            checked_at TEXT,
            FOREIGN KEY (domain_check_id) REFERENCES domain_checks(id)
        )
    ''')

    # Index để query nhanh
    c.execute('CREATE INDEX IF NOT EXISTS idx_domain ON domain_checks(domain)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_domain_check_id ON domain_check_urls(domain_check_id)')

    # Table WordPress sites
    c.execute('''
        CREATE TABLE IF NOT EXISTS wp_sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            site_url TEXT NOT NULL,
            username TEXT NOT NULL,
            app_password TEXT NOT NULL,
            wordpress_password TEXT,
            wordpress_url TEXT,
            is_active INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT
        )
    ''')

    # Index for active site lookup
    c.execute('CREATE INDEX IF NOT EXISTS idx_active_site ON wp_sites(is_active)')

    # Add new columns if they don't exist (for existing databases)
    try:
        c.execute('ALTER TABLE wp_sites ADD COLUMN wordpress_password TEXT')
    except:
        pass  # Column already exists

    try:
        c.execute('ALTER TABLE wp_sites ADD COLUMN wordpress_url TEXT')
    except:
        pass  # Column already exists

    # Table WordPress edit history
    c.execute('''
        CREATE TABLE IF NOT EXISTS wp_edit_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wp_site_id INTEGER,
            session_name TEXT NOT NULL,
            total_posts INTEGER DEFAULT 0,
            edited_posts INTEGER DEFAULT 0,
            snapshot_data TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY (wp_site_id) REFERENCES wp_sites(id)
        )
    ''')

    # Index for history lookup
    c.execute('CREATE INDEX IF NOT EXISTS idx_wp_site_history ON wp_edit_history(wp_site_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_history_created ON wp_edit_history(created_at)')

    # Table to store outgoing URLs for WordPress posts
    c.execute('''
        CREATE TABLE IF NOT EXISTS wp_post_outgoing_urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wp_site_id INTEGER,
            post_id INTEGER NOT NULL,
            post_url TEXT,
            outgoing_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY (wp_site_id) REFERENCES wp_sites(id)
        )
    ''')

    # Index for fast lookup by post_id and wp_site_id
    c.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_wp_post_url ON wp_post_outgoing_urls(wp_site_id, post_id)')

    # Table: WordPress Editor Sessions (Working sessions + Snapshots)
    c.execute('''
        CREATE TABLE IF NOT EXISTS wp_editor_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            wp_site_id INTEGER,
            domain TEXT NOT NULL,
            session_name TEXT,
            total_posts INTEGER DEFAULT 0,
            is_snapshot INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            last_accessed TEXT NOT NULL,
            FOREIGN KEY (wp_site_id) REFERENCES wp_sites(id)
        )
    ''')

    # Index for fast lookup
    c.execute('CREATE INDEX IF NOT EXISTS idx_session_id ON wp_editor_sessions(session_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_domain_snapshot ON wp_editor_sessions(domain, is_snapshot)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_last_accessed ON wp_editor_sessions(last_accessed)')

    # Table: WordPress Editor Posts (metadata only, no content)
    c.execute('''
        CREATE TABLE IF NOT EXISTS wp_editor_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            post_id INTEGER NOT NULL,
            url TEXT NOT NULL,
            title TEXT,
            status TEXT,
            outgoing_url TEXT,
            date_modified TEXT,
            FOREIGN KEY (session_id) REFERENCES wp_editor_sessions(session_id) ON DELETE CASCADE
        )
    ''')

    # Index for fast lookup
    c.execute('CREATE INDEX IF NOT EXISTS idx_editor_session ON wp_editor_posts(session_id)')
    c.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_session_post ON wp_editor_posts(session_id, post_id)')

    # Migration: Add outgoing_links column if not exists
    try:
        c.execute('ALTER TABLE wp_editor_posts ADD COLUMN outgoing_links TEXT')
        print("Added outgoing_links column to wp_editor_posts table")
    except sqlite3.OperationalError:
        # Column already exists
        pass

    # Migration: Add wp_site_id column if not exists
    try:
        c.execute('ALTER TABLE wp_editor_posts ADD COLUMN wp_site_id INTEGER')
        print("Added wp_site_id column to wp_editor_posts table")
    except sqlite3.OperationalError:
        # Column already exists
        pass

    # Table: Authentication Tokens (persistent token storage)
    c.execute('''
        CREATE TABLE IF NOT EXISTS auth_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            last_used TEXT
        )
    ''')

    # Index for fast token lookup and cleanup
    c.execute('CREATE INDEX IF NOT EXISTS idx_token ON auth_tokens(token)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_expires_at ON auth_tokens(expires_at)')

    conn.commit()
    conn.close()

def insert_history(url, status):
    """Legacy function - backward compatibility"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO check_history (url, status, checked_at) VALUES (?, ?, ?)",
        (url, status, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

def insert_domain_check(domain, results):
    """
    Lưu kết quả check theo domain session
    results: list of {url, status, checked_at}
    Returns: domain_check_id
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Đếm stats
    indexed_count = sum(1 for r in results if 'Indexed ✅' in r['status'])
    not_indexed_count = sum(1 for r in results if 'Not Indexed ❌' in r['status'])
    error_count = sum(1 for r in results if r['status'] == 'Error' or 'Error' in r['status'])

    # Insert domain check record
    c.execute('''
        INSERT INTO domain_checks (domain, total_urls, indexed_count, not_indexed_count, error_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (domain, len(results), indexed_count, not_indexed_count, error_count, datetime.now(timezone.utc).isoformat()))

    domain_check_id = c.lastrowid

    # Insert all URLs
    for r in results:
        c.execute('''
            INSERT INTO domain_check_urls (domain_check_id, url, status, checked_at)
            VALUES (?, ?, ?, ?)
        ''', (domain_check_id, r['url'], r['status'], r.get('checked_at', datetime.now(timezone.utc).isoformat())))

    conn.commit()
    conn.close()

    return domain_check_id

def get_recent_history(limit=50):
    """Legacy function - lấy từ check_history"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT url, status, checked_at FROM check_history ORDER BY id DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [{"url": r[0], "status": r[1], "checked_at": r[2]} for r in rows]

def get_domain_checks(limit=20):
    """Lấy danh sách domain checks gần nhất"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        SELECT id, domain, total_urls, indexed_count, not_indexed_count, error_count, created_at
        FROM domain_checks
        ORDER BY id DESC
        LIMIT ?
    ''', (limit,))
    rows = c.fetchall()
    conn.close()

    return [{
        "id": r[0],
        "domain": r[1],
        "total_urls": r[2],
        "indexed_count": r[3],
        "not_indexed_count": r[4],
        "error_count": r[5],
        "created_at": r[6]
    } for r in rows]

def get_domain_check_detail(domain_check_id):
    """Lấy chi tiết tất cả URLs của 1 domain check"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Get domain info
    c.execute('SELECT domain, created_at FROM domain_checks WHERE id = ?', (domain_check_id,))
    domain_info = c.fetchone()

    if not domain_info:
        conn.close()
        return None

    # Get all URLs
    c.execute('''
        SELECT url, status, checked_at
        FROM domain_check_urls
        WHERE domain_check_id = ?
        ORDER BY id
    ''', (domain_check_id,))

    urls = c.fetchall()
    conn.close()

    return {
        "domain": domain_info[0],
        "created_at": domain_info[1],
        "urls": [{"url": u[0], "status": u[1], "checked_at": u[2]} for u in urls]
    }

def clear_all_history():
    """Xóa toàn bộ lịch sử trong database"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Xóa tất cả dữ liệu trong các bảng
    c.execute('DELETE FROM domain_check_urls')
    c.execute('DELETE FROM domain_checks')
    c.execute('DELETE FROM check_history')

    # Reset auto-increment counters
    c.execute('DELETE FROM sqlite_sequence WHERE name="domain_check_urls"')
    c.execute('DELETE FROM sqlite_sequence WHERE name="domain_checks"')
    c.execute('DELETE FROM sqlite_sequence WHERE name="check_history"')

    conn.commit()
    conn.close()

# ============= WordPress Sites CRUD Functions =============

def add_wp_site(name, site_url, username, app_password, wordpress_password=None, wordpress_url=None):
    """
    Thêm WordPress site mới
    Returns: site_id
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Kiểm tra xem đã có site nào chưa, nếu chưa thì set is_active = 1
    c.execute('SELECT COUNT(*) FROM wp_sites')
    count = c.fetchone()[0]
    is_active = 1 if count == 0 else 0

    c.execute('''
        INSERT INTO wp_sites (name, site_url, username, app_password, wordpress_password, wordpress_url, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name, site_url, username, app_password, wordpress_password, wordpress_url, is_active, datetime.now(timezone.utc).isoformat()))

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
    c = conn.cursor()

    c.execute('''
        SELECT id, name, site_url, username, app_password, wordpress_password, wordpress_url, is_active, created_at, updated_at
        FROM wp_sites
        ORDER BY is_active DESC, created_at DESC
    ''')

    rows = c.fetchall()
    conn.close()

    return [{
        "id": r[0],
        "name": r[1],
        "site_url": r[2],
        "username": r[3],
        "app_password": r[4],
        "wordpress_password": r[5],
        "wordpress_url": r[6],
        "is_active": bool(r[7]),
        "created_at": r[8],
        "updated_at": r[9]
    } for r in rows]

def get_wp_site_by_id(site_id):
    """
    Get WordPress site by ID
    Returns: dict or None
    """
    conn = sqlite3.connect(DB_PATH)
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

    return {
        "id": row[0],
        "name": row[1],
        "site_url": row[2],
        "username": row[3],
        "app_password": row[4],
        "wordpress_password": row[5],
        "wordpress_url": row[6],
        "is_active": bool(row[7]),
        "created_at": row[8],
        "updated_at": row[9]
    }

def get_active_wp_site():
    """
    Lấy WordPress site đang active
    Returns: dict hoặc None
    """
    conn = sqlite3.connect(DB_PATH)
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

    return {
        "id": row[0],
        "name": row[1],
        "site_url": row[2],
        "username": row[3],
        "app_password": row[4],
        "wordpress_password": row[5],
        "wordpress_url": row[6],
        "is_active": bool(row[7]),
        "created_at": row[8],
        "updated_at": row[9]
    }

def set_active_wp_site(site_id):
    """
    Set một WordPress site làm active, các site khác sẽ bị inactive
    Returns: True nếu thành công
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Kiểm tra site có tồn tại không
    c.execute('SELECT id FROM wp_sites WHERE id = ?', (site_id,))
    if not c.fetchone():
        conn.close()
        return False

    # Set tất cả sites về inactive
    c.execute('UPDATE wp_sites SET is_active = 0')

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

# ==================== WordPress Edit History Functions ====================

def create_edit_history(wp_site_id, session_name, snapshot_data):
    """
    Tạo history session mới
    snapshot_data: JSON string chứa toàn bộ posts data
    Returns: history_id
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''
        INSERT INTO wp_edit_history (wp_site_id, session_name, snapshot_data, created_at)
        VALUES (?, ?, ?, ?)
    ''', (wp_site_id, session_name, snapshot_data, datetime.now(timezone.utc).isoformat()))

    history_id = c.lastrowid
    conn.commit()
    conn.close()

    return history_id

def update_edit_history(history_id, snapshot_data, total_posts=None, edited_posts=None):
    """
    Cập nhật history session
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    updates = ['updated_at = ?']
    params = [datetime.now(timezone.utc).isoformat()]

    if snapshot_data is not None:
        updates.append('snapshot_data = ?')
        params.append(snapshot_data)

    if total_posts is not None:
        updates.append('total_posts = ?')
        params.append(total_posts)

    if edited_posts is not None:
        updates.append('edited_posts = ?')
        params.append(edited_posts)

    params.append(history_id)

    c.execute(f'''
        UPDATE wp_edit_history
        SET {', '.join(updates)}
        WHERE id = ?
    ''', tuple(params))

    conn.commit()
    conn.close()

    return True

def get_all_edit_history(limit=50):
    """
    Lấy danh sách tất cả history sessions
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''
        SELECT h.id, h.wp_site_id, h.session_name, h.total_posts, h.edited_posts,
               h.snapshot_data, h.created_at, h.updated_at,
               w.name as site_name, w.site_url
        FROM wp_edit_history h
        LEFT JOIN wp_sites w ON h.wp_site_id = w.id
        ORDER BY h.created_at DESC
        LIMIT ?
    ''', (limit,))

    rows = c.fetchall()
    conn.close()

    return [{
        "id": r[0],
        "wp_site_id": r[1],
        "session_name": r[2],
        "total_posts": r[3],
        "edited_posts": r[4],
        "snapshot_data": r[5],
        "created_at": r[6],
        "updated_at": r[7],
        "site_name": r[8],
        "site_url": r[9]
    } for r in rows]

def get_edit_history_by_id(history_id):
    """
    Lấy chi tiết một history session
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''
        SELECT h.id, h.wp_site_id, h.session_name, h.total_posts, h.edited_posts,
               h.snapshot_data, h.created_at, h.updated_at,
               w.name as site_name, w.site_url
        FROM wp_edit_history h
        LEFT JOIN wp_sites w ON h.wp_site_id = w.id
        WHERE h.id = ?
    ''', (history_id,))

    row = c.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "id": row[0],
        "wp_site_id": row[1],
        "session_name": row[2],
        "total_posts": row[3],
        "edited_posts": row[4],
        "snapshot_data": row[5],
        "created_at": row[6],
        "updated_at": row[7],
        "site_name": row[8],
        "site_url": row[9]
    }

def delete_edit_history(history_id):
    """
    Xóa một history session
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('DELETE FROM wp_edit_history WHERE id = ?', (history_id,))

    conn.commit()
    conn.close()

    return True

# ============================================
# WordPress Post Outgoing URLs Functions
# ============================================

def save_post_outgoing_url(wp_site_id, post_id, post_url, outgoing_url):
    """
    Lưu hoặc cập nhật outgoing_url cho một post
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    # Check if exists
    c.execute('SELECT id FROM wp_post_outgoing_urls WHERE wp_site_id = ? AND post_id = ?',
              (wp_site_id, post_id))
    existing = c.fetchone()

    if existing:
        # Update
        c.execute('''
            UPDATE wp_post_outgoing_urls
            SET outgoing_url = ?, post_url = ?, updated_at = ?
            WHERE wp_site_id = ? AND post_id = ?
        ''', (outgoing_url, post_url, now, wp_site_id, post_id))
    else:
        # Insert
        c.execute('''
            INSERT INTO wp_post_outgoing_urls (wp_site_id, post_id, post_url, outgoing_url, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (wp_site_id, post_id, post_url, outgoing_url, now))

    conn.commit()
    conn.close()

    return True

def get_post_outgoing_url(wp_site_id, post_id):
    """
    Lấy outgoing_url của một post
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''
        SELECT outgoing_url FROM wp_post_outgoing_urls
        WHERE wp_site_id = ? AND post_id = ?
    ''', (wp_site_id, post_id))

    row = c.fetchone()
    conn.close()

    return row[0] if row else ''

def get_posts_outgoing_urls(wp_site_id, post_ids):
    """
    Lấy outgoing_urls của nhiều posts cùng lúc
    Returns: dict {post_id: outgoing_url}
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    placeholders = ','.join('?' * len(post_ids))
    query = f'''
        SELECT post_id, outgoing_url FROM wp_post_outgoing_urls
        WHERE wp_site_id = ? AND post_id IN ({placeholders})
    '''

    c.execute(query, [wp_site_id] + list(post_ids))
    rows = c.fetchall()
    conn.close()

    return {row[0]: row[1] for row in rows}


# ============================================
# WordPress Editor Sessions Management
# ============================================

def create_editor_session(session_id, wp_site_id, domain, posts, is_snapshot=0, session_name=None):
    """Create a new editor session and save posts"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    try:
        # Insert session
        c.execute('''
            INSERT INTO wp_editor_sessions
            (session_id, wp_site_id, domain, session_name, total_posts, is_snapshot, created_at, last_accessed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (session_id, wp_site_id, domain, session_name, len(posts), is_snapshot, now, now))

        # Insert posts (metadata only)
        inserted_count = 0
        for post in posts:
            post_id = post.get('id') or post.get('post_id')
            if not post_id:
                print(f"[Database] Warning: Skipping post without ID: {post.get('title', 'Unknown')}, keys: {list(post.keys())}")
                continue

            # Serialize outgoing_links to JSON string
            outgoing_links = post.get('outgoing_links', [])
            outgoing_links_json = None
            if outgoing_links and len(outgoing_links) > 0:
                import json
                outgoing_links_json = json.dumps(outgoing_links)

            c.execute('''
                INSERT INTO wp_editor_posts
                (session_id, post_id, url, title, status, outgoing_url, date_modified, outgoing_links)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session_id,
                post_id,
                post.get('url'),
                post.get('title'),
                post.get('status'),
                post.get('outgoing_url', ''),
                post.get('date_modified'),
                outgoing_links_json
            ))
            inserted_count += 1

        conn.commit()
        print(f"[Database] Created session {session_id}: inserted {inserted_count}/{len(posts)} posts")
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_editor_session(session_id):
    """Get session and its posts"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Get session info
    c.execute('''
        SELECT * FROM wp_editor_sessions
        WHERE session_id = ?
    ''', (session_id,))
    session = c.fetchone()

    if not session:
        conn.close()
        return None

    # Update last_accessed
    now = datetime.now(timezone.utc).isoformat()
    c.execute('''
        UPDATE wp_editor_sessions
        SET last_accessed = ?
        WHERE session_id = ?
    ''', (now, session_id))

    # Get posts
    c.execute('''
        SELECT * FROM wp_editor_posts
        WHERE session_id = ?
        ORDER BY id
    ''', (session_id,))
    posts = c.fetchall()

    conn.commit()
    conn.close()

    # Deserialize outgoing_links from JSON
    import json
    posts_list = []
    for post in posts:
        post_dict = dict(post)

        # IMPORTANT: Set 'id' to WordPress post_id for frontend compatibility
        # Frontend uses 'id' to update posts via WordPress API
        if 'post_id' in post_dict:
            post_dict['id'] = post_dict['post_id']

        if post_dict.get('outgoing_links'):
            try:
                post_dict['outgoing_links'] = json.loads(post_dict['outgoing_links'])
            except:
                post_dict['outgoing_links'] = []
        else:
            post_dict['outgoing_links'] = []
        posts_list.append(post_dict)

    return {
        **dict(session),
        'posts': posts_list
    }


def update_editor_post(session_id, post_id, field, value):
    """Update a specific field of a post in session"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        # Update the specific field
        query = f'''
            UPDATE wp_editor_posts
            SET {field} = ?
            WHERE session_id = ? AND post_id = ?
        '''
        c.execute(query, (value, session_id, post_id))

        # Update session last_accessed
        now = datetime.now(timezone.utc).isoformat()
        c.execute('''
            UPDATE wp_editor_sessions
            SET last_accessed = ?
            WHERE session_id = ?
        ''', (now, session_id))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_snapshot_by_domain(wp_site_id, domain):
    """Get existing snapshot for a domain"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT * FROM wp_editor_sessions
        WHERE wp_site_id = ? AND domain = ? AND is_snapshot = 1
        ORDER BY created_at DESC
        LIMIT 1
    ''', (wp_site_id, domain))

    snapshot = c.fetchone()
    conn.close()

    return dict(snapshot) if snapshot else None


def save_snapshot_from_session(source_session_id, wp_site_id, domain, session_name):
    """Save/overwrite snapshot from working session"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    try:
        # Check if snapshot already exists for this domain
        existing = get_snapshot_by_domain(wp_site_id, domain)

        if existing:
            # Delete old snapshot posts
            c.execute('DELETE FROM wp_editor_posts WHERE session_id = ?', (existing['session_id'],))

            # Copy posts from working session to snapshot session
            c.execute('''
                INSERT INTO wp_editor_posts
                (session_id, post_id, url, title, status, outgoing_url, date_modified)
                SELECT ?, post_id, url, title, status, outgoing_url, date_modified
                FROM wp_editor_posts
                WHERE session_id = ?
            ''', (existing['session_id'], source_session_id))

            # Update snapshot session
            c.execute('''
                UPDATE wp_editor_sessions
                SET session_name = ?, last_accessed = ?,
                    total_posts = (SELECT COUNT(*) FROM wp_editor_posts WHERE session_id = ?)
                WHERE session_id = ?
            ''', (session_name, now, existing['session_id'], existing['session_id']))

            snapshot_id = existing['session_id']
        else:
            # Create new snapshot session
            import uuid
            snapshot_id = str(uuid.uuid4())

            # Get post count
            c.execute('SELECT COUNT(*) FROM wp_editor_posts WHERE session_id = ?', (source_session_id,))
            post_count = c.fetchone()[0]

            # Create snapshot session
            c.execute('''
                INSERT INTO wp_editor_sessions
                (session_id, wp_site_id, domain, session_name, total_posts, is_snapshot, created_at, last_accessed)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            ''', (snapshot_id, wp_site_id, domain, session_name, post_count, now, now))

            # Copy posts from working session
            c.execute('''
                INSERT INTO wp_editor_posts
                (session_id, post_id, url, title, status, outgoing_url, date_modified)
                SELECT ?, post_id, url, title, status, outgoing_url, date_modified
                FROM wp_editor_posts
                WHERE session_id = ?
            ''', (snapshot_id, source_session_id))

        conn.commit()
        return snapshot_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def list_snapshots(wp_site_id=None, snapshots_only=True, limit=50):
    """List sessions or snapshots"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    if snapshots_only:
        # Only snapshots
        if wp_site_id:
            c.execute('''
                SELECT s.*, w.name as site_name
                FROM wp_editor_sessions s
                LEFT JOIN wp_sites w ON s.wp_site_id = w.id
                WHERE s.is_snapshot = 1 AND s.wp_site_id = ?
                ORDER BY s.last_accessed DESC
                LIMIT ?
            ''', (wp_site_id, limit))
        else:
            c.execute('''
                SELECT s.*, w.name as site_name
                FROM wp_editor_sessions s
                LEFT JOIN wp_sites w ON s.wp_site_id = w.id
                WHERE s.is_snapshot = 1
                ORDER BY s.last_accessed DESC
                LIMIT ?
            ''', (limit,))
    else:
        # All sessions (including working sessions)
        if wp_site_id:
            c.execute('''
                SELECT s.*, w.name as site_name
                FROM wp_editor_sessions s
                LEFT JOIN wp_sites w ON s.wp_site_id = w.id
                WHERE s.wp_site_id = ?
                ORDER BY s.last_accessed DESC
                LIMIT ?
            ''', (wp_site_id, limit))
        else:
            c.execute('''
                SELECT s.*, w.name as site_name
                FROM wp_editor_sessions s
                LEFT JOIN wp_sites w ON s.wp_site_id = w.id
                ORDER BY s.last_accessed DESC
                LIMIT ?
            ''', (limit,))

    snapshots = c.fetchall()
    conn.close()

    return [dict(s) for s in snapshots]


def delete_editor_session(session_id):
    """Delete a session and its posts"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        # Posts will be auto-deleted by CASCADE
        c.execute('DELETE FROM wp_editor_sessions WHERE session_id = ?', (session_id,))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def cleanup_old_working_sessions(hours=24):
    """Cleanup working sessions older than X hours"""
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

# ===========================
# Authentication Token Management
# ===========================

def store_auth_token(token, username, role, expires_at):
    """
    Store authentication token in database
    Returns: True if successful
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        c.execute('''
            INSERT INTO auth_tokens (token, username, role, created_at, expires_at, last_used)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (token, username, role, datetime.now(timezone.utc).isoformat(),
              expires_at.isoformat(), datetime.now(timezone.utc).isoformat()))

        conn.commit()
        return True
    except Exception as e:
        print(f"[Database] Error storing auth token: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def get_auth_token(token):
    """
    Get authentication token data from database
    Returns: dict with token data or None if not found/expired
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    try:
        c.execute('''
            SELECT token, username, role, created_at, expires_at, last_used
            FROM auth_tokens
            WHERE token = ?
        ''', (token,))

        row = c.fetchone()
        if not row:
            return None

        token_data = dict(row)

        # Check if token is expired
        from datetime import datetime
        expires_at = datetime.fromisoformat(token_data['expires_at'])
        if datetime.now(timezone.utc) > expires_at:
            # Token expired, delete it
            delete_auth_token(token)
            return None

        # Update last_used timestamp
        c.execute('''
            UPDATE auth_tokens
            SET last_used = ?
            WHERE token = ?
        ''', (datetime.now(timezone.utc).isoformat(), token))
        conn.commit()

        return token_data
    except Exception as e:
        print(f"[Database] Error getting auth token: {e}")
        return None
    finally:
        conn.close()

def delete_auth_token(token):
    """
    Delete authentication token from database
    Returns: True if successful
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        c.execute('DELETE FROM auth_tokens WHERE token = ?', (token,))
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        print(f"[Database] Error deleting auth token: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def cleanup_expired_auth_tokens():
    """
    Delete all expired authentication tokens from database
    Returns: number of deleted tokens
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        c.execute('''
            DELETE FROM auth_tokens
            WHERE datetime(expires_at) < datetime('now')
        ''')

        deleted = c.rowcount
        conn.commit()
        return deleted
    except Exception as e:
        print(f"[Database] Error cleaning up expired tokens: {e}")
        conn.rollback()
        return 0
    finally:
        conn.close()

def delete_all_user_tokens(username):
    """
    Delete all tokens for a specific user (useful for logout all sessions)
    Returns: number of deleted tokens
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        c.execute('DELETE FROM auth_tokens WHERE username = ?', (username,))
        deleted = c.rowcount
        conn.commit()
        return deleted
    except Exception as e:
        print(f"[Database] Error deleting user tokens: {e}")
        conn.rollback()
        return 0
    finally:
        conn.close()

