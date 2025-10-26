"""
Database migrations and optimizations
Handles schema updates and performance improvements
"""
import sqlite3
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "../check_history.db")


def run_migration_001_add_performance_indexes():
    """
    Migration 001: Add performance indexes
    - idx_wp_sites_created: For ordering sites by creation date
    - idx_sessions_site_snapshot: For filtered snapshot listings
    - idx_sessions_created: For general session listings
    - idx_auth_username: For user token operations
    - idx_posts_wp_site: For querying posts by wp_site_id
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        print("[Migration 001] Adding performance indexes...")

        # 1. wp_sites created_at index
        c.execute('''
            CREATE INDEX IF NOT EXISTS idx_wp_sites_created
            ON wp_sites(created_at DESC)
        ''')
        print("  ✓ Created idx_wp_sites_created")

        # 2. wp_editor_sessions composite index for filtered queries
        c.execute('''
            CREATE INDEX IF NOT EXISTS idx_sessions_site_snapshot
            ON wp_editor_sessions(wp_site_id, is_snapshot, created_at DESC)
        ''')
        print("  ✓ Created idx_sessions_site_snapshot")

        # 3. wp_editor_sessions created_at index
        c.execute('''
            CREATE INDEX IF NOT EXISTS idx_sessions_created
            ON wp_editor_sessions(created_at DESC)
        ''')
        print("  ✓ Created idx_sessions_created")

        # 4. auth_tokens username index
        c.execute('''
            CREATE INDEX IF NOT EXISTS idx_auth_username
            ON auth_tokens(username)
        ''')
        print("  ✓ Created idx_auth_username")

        # 5. wp_editor_posts wp_site_id index
        c.execute('''
            CREATE INDEX IF NOT EXISTS idx_posts_wp_site
            ON wp_editor_posts(wp_site_id)
        ''')
        print("  ✓ Created idx_posts_wp_site")

        conn.commit()
        print("[Migration 001] ✅ Completed successfully")
        return True

    except Exception as e:
        print(f"[Migration 001] ❌ Failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def analyze_database():
    """
    Run ANALYZE to update query optimizer statistics
    Should be run periodically for optimal performance
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        print("[Database] Running ANALYZE...")
        c.execute('ANALYZE')
        conn.commit()
        print("[Database] ✅ ANALYZE completed")
        return True
    except Exception as e:
        print(f"[Database] ❌ ANALYZE failed: {e}")
        return False
    finally:
        conn.close()


def vacuum_database():
    """
    Run VACUUM to reclaim unused space and defragment database
    Note: This can take time on large databases and locks the entire database
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        print("[Database] Running VACUUM...")
        # Get size before
        c.execute("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
        size_before = c.fetchone()[0]

        c.execute('VACUUM')

        # Get size after
        c.execute("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
        size_after = c.fetchone()[0]

        saved_mb = (size_before - size_after) / (1024 * 1024)
        print(f"[Database] ✅ VACUUM completed. Saved {saved_mb:.2f} MB")
        return True
    except Exception as e:
        print(f"[Database] ❌ VACUUM failed: {e}")
        return False
    finally:
        conn.close()


def get_database_stats():
    """
    Get database statistics for monitoring
    Returns: dict with stats
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    try:
        stats = {}

        # Database size
        c.execute("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
        stats['size_bytes'] = c.fetchone()[0]
        stats['size_mb'] = stats['size_bytes'] / (1024 * 1024)

        # Table row counts
        tables = [
            'check_history', 'domain_checks', 'domain_check_urls',
            'wp_sites', 'wp_edit_history', 'wp_post_outgoing_urls',
            'wp_editor_sessions', 'wp_editor_posts', 'auth_tokens'
        ]

        stats['tables'] = {}
        for table in tables:
            try:
                c.execute(f'SELECT COUNT(*) FROM {table}')
                stats['tables'][table] = c.fetchone()[0]
            except:
                stats['tables'][table] = 0

        # Index list
        c.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
        stats['indexes'] = [row[0] for row in c.fetchall()]
        stats['index_count'] = len(stats['indexes'])

        return stats

    except Exception as e:
        print(f"[Database] Error getting stats: {e}")
        return None
    finally:
        conn.close()


def check_index_usage(query):
    """
    Check if a query uses indexes (EXPLAIN QUERY PLAN)

    Args:
        query: SQL query string

    Returns:
        List of query plan steps
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        c.execute(f"EXPLAIN QUERY PLAN {query}")
        plan = c.fetchall()
        return plan
    except Exception as e:
        print(f"[Database] Error checking query plan: {e}")
        return None
    finally:
        conn.close()


def run_all_migrations():
    """
    Run all pending migrations in order
    Returns: True if all successful
    """
    migrations = [
        run_migration_001_add_performance_indexes
    ]

    print("=" * 60)
    print("Running database migrations...")
    print("=" * 60)

    all_success = True
    for migration in migrations:
        success = migration()
        if not success:
            all_success = False
            print(f"⚠️  Migration {migration.__name__} failed, continuing...")

    print("=" * 60)
    if all_success:
        print("✅ All migrations completed successfully")
    else:
        print("⚠️  Some migrations failed, check logs above")
    print("=" * 60)

    return all_success


def optimize_database():
    """
    Full database optimization routine
    - Run migrations
    - Analyze
    - Vacuum
    """
    print("\n" + "=" * 60)
    print("Database Optimization Routine")
    print("=" * 60 + "\n")

    # Run migrations first
    run_all_migrations()

    # Analyze
    print()
    analyze_database()

    # Get stats before vacuum
    print()
    print("[Database] Getting statistics...")
    stats_before = get_database_stats()
    if stats_before:
        print(f"  Database size: {stats_before['size_mb']:.2f} MB")
        print(f"  Total tables: {len(stats_before['tables'])}")
        print(f"  Total indexes: {stats_before['index_count']}")
        print(f"  Total records: {sum(stats_before['tables'].values())}")

    # Vacuum
    print()
    vacuum_database()

    # Get stats after
    print()
    stats_after = get_database_stats()
    if stats_after:
        saved = stats_before['size_mb'] - stats_after['size_mb']
        print(f"  New database size: {stats_after['size_mb']:.2f} MB (saved {saved:.2f} MB)")

    print("\n" + "=" * 60)
    print("✅ Optimization completed")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    """Run optimization when script is executed directly"""
    optimize_database()
