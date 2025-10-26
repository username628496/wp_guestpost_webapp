"""
Authentication Token Management Module
Handles persistent token storage and validation
"""
import sqlite3
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../check_history.db")


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
