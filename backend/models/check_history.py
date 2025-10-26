"""
Google Indexing Check History Module
Legacy functions for tracking URL indexing status
"""
import sqlite3
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../check_history.db")


def insert_history(url, status):
    """
    Legacy function - backward compatibility
    Insert single URL check result
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        'INSERT INTO check_history (url, status, checked_at) VALUES (?, ?, ?)',
        (url, status, datetime.now(timezone.utc).isoformat())
    )
    conn.commit()
    conn.close()


def insert_domain_check(domain, results):
    """
    Insert domain check với danh sách URLs
    results: list of dicts [{'url': '...', 'status': '...'}]
    Returns: domain_check_id
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Count statuses
    indexed_count = sum(1 for r in results if r['status'] == 'Indexed')
    not_indexed_count = sum(1 for r in results if r['status'] == 'Not Indexed')
    error_count = sum(1 for r in results if r['status'] == 'Error')

    # Insert domain check
    c.execute('''
        INSERT INTO domain_checks (domain, total_urls, indexed_count, not_indexed_count, error_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (domain, len(results), indexed_count, not_indexed_count, error_count,
          datetime.now(timezone.utc).isoformat()))

    domain_check_id = c.lastrowid

    # Insert URLs
    for result in results:
        c.execute('''
            INSERT INTO domain_check_urls (domain_check_id, url, status, checked_at)
            VALUES (?, ?, ?, ?)
        ''', (domain_check_id, result['url'], result['status'],
              datetime.now(timezone.utc).isoformat()))

    conn.commit()
    conn.close()

    return domain_check_id


def get_recent_history(limit=50):
    """Lấy lịch sử check gần nhất (legacy table)"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM check_history ORDER BY checked_at DESC LIMIT ?', (limit,))
    rows = c.fetchall()
    conn.close()
    return rows


def get_domain_checks(limit=20):
    """
    Lấy danh sách domain checks gần nhất
    Returns: list of dicts
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''
        SELECT id, domain, total_urls, indexed_count, not_indexed_count, error_count, created_at
        FROM domain_checks
        ORDER BY created_at DESC
        LIMIT ?
    ''', (limit,))

    rows = c.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_domain_check_detail(domain_check_id):
    """
    Lấy chi tiết domain check với danh sách URLs
    Returns: dict with domain info and urls list
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Get domain check info
    c.execute('''
        SELECT id, domain, total_urls, indexed_count, not_indexed_count, error_count, created_at
        FROM domain_checks
        WHERE id = ?
    ''', (domain_check_id,))

    domain_row = c.fetchone()
    if not domain_row:
        conn.close()
        return None

    result = dict(domain_row)

    # Get URLs
    c.execute('''
        SELECT url, status, checked_at
        FROM domain_check_urls
        WHERE domain_check_id = ?
        ORDER BY checked_at DESC
    ''', (domain_check_id,))

    urls_rows = c.fetchall()
    result['urls'] = [dict(row) for row in urls_rows]

    conn.close()
    return result


def clear_all_history():
    """
    Xóa toàn bộ lịch sử check (cả legacy và domain checks)
    Returns: số lượng records đã xóa
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Delete from legacy table
    c.execute('DELETE FROM check_history')
    legacy_count = c.rowcount

    # Delete domain check URLs
    c.execute('DELETE FROM domain_check_urls')
    urls_count = c.rowcount

    # Delete domain checks
    c.execute('DELETE FROM domain_checks')
    domains_count = c.rowcount

    conn.commit()
    conn.close()

    return {'legacy': legacy_count, 'urls': urls_count, 'domains': domains_count}
