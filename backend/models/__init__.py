"""
Models package - Database operations
Exports all database functions for backward compatibility
"""

# Import database initialization
from .database import init_db, DB_PATH

# Import check history functions
from .check_history import (
    insert_history,
    insert_domain_check,
    get_recent_history,
    get_domain_checks,
    get_domain_check_detail,
    clear_all_history
)

# Import WordPress sites functions
from .wp_sites import (
    add_wp_site,
    get_all_wp_sites,
    get_wp_site_by_id,
    get_active_wp_site,
    set_active_wp_site,
    update_wp_site,
    delete_wp_site
)

# Import WordPress edit history functions (legacy)
from .wp_edit_history import (
    create_edit_history,
    update_edit_history,
    get_all_edit_history,
    get_edit_history_by_id,
    delete_edit_history
)

# Import WordPress outgoing URLs functions (legacy)
from .wp_outgoing_urls import (
    save_post_outgoing_url,
    get_post_outgoing_url,
    get_posts_outgoing_urls
)

# Import WordPress editor sessions functions
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

# Import authentication tokens functions
from .auth_tokens import (
    store_auth_token,
    get_auth_token,
    delete_auth_token,
    cleanup_expired_auth_tokens,
    delete_all_user_tokens
)

__all__ = [
    # Database initialization
    'init_db',
    'DB_PATH',

    # Check history
    'insert_history',
    'insert_domain_check',
    'get_recent_history',
    'get_domain_checks',
    'get_domain_check_detail',
    'clear_all_history',

    # WordPress sites
    'add_wp_site',
    'get_all_wp_sites',
    'get_wp_site_by_id',
    'get_active_wp_site',
    'set_active_wp_site',
    'update_wp_site',
    'delete_wp_site',

    # WordPress edit history (legacy)
    'create_edit_history',
    'update_edit_history',
    'get_all_edit_history',
    'get_edit_history_by_id',
    'delete_edit_history',

    # WordPress outgoing URLs (legacy)
    'save_post_outgoing_url',
    'get_post_outgoing_url',
    'get_posts_outgoing_urls',

    # WordPress editor sessions
    'create_editor_session',
    'get_editor_session',
    'update_editor_post',
    'get_snapshot_by_domain',
    'save_snapshot_from_session',
    'list_snapshots',
    'delete_editor_session',
    'cleanup_old_working_sessions',

    # Authentication tokens
    'store_auth_token',
    'get_auth_token',
    'delete_auth_token',
    'cleanup_expired_auth_tokens',
    'delete_all_user_tokens',
]
