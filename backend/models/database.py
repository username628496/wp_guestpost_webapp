"""
Database initialization and re-exports
This file maintains backward compatibility by re-exporting all functions from sub-modules
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../check_history.db")


def init_db():
    """Initialize all database tables"""
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


# Re-export all functions from sub-modules for backward compatibility
from .check_history import (
    insert_history,
    insert_domain_check,
    get_recent_history,
    get_domain_checks,
    get_domain_check_detail,
    clear_all_history
)

from .wp_sites import (
    add_wp_site,
    get_all_wp_sites,
    get_wp_site_by_id,
    get_active_wp_site,
    set_active_wp_site,
    update_wp_site,
    delete_wp_site
)

from .wp_edit_history import (
    create_edit_history,
    update_edit_history,
    get_all_edit_history,
    get_edit_history_by_id,
    delete_edit_history
)

from .wp_outgoing_urls import (
    save_post_outgoing_url,
    get_post_outgoing_url,
    get_posts_outgoing_urls
)

from .wp_editor_sessions import (
    create_editor_session,
    get_editor_session,
    update_editor_post,
    get_snapshot_by_domain,
    save_snapshot_from_session,
    list_snapshots,
    delete_editor_session,
    cleanup_old_working_sessions
)

from .auth_tokens import (
    store_auth_token,
    get_auth_token,
    delete_auth_token,
    cleanup_expired_auth_tokens,
    delete_all_user_tokens
)
