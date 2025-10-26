# Database Optimization Plan

## Current Database Analysis

### Tables Overview
1. **check_history** - Legacy indexing check history
2. **domain_checks** - Domain-based indexing checks
3. **domain_check_urls** - URLs for each domain check
4. **wp_sites** - WordPress site credentials
5. **wp_edit_history** - Legacy edit history
6. **wp_post_outgoing_urls** - Outgoing URLs tracking (legacy)
7. **wp_editor_sessions** - Editor sessions & snapshots
8. **wp_editor_posts** - Posts metadata for sessions
9. **auth_tokens** - Authentication tokens

### Current Indexes (from init_db)

✅ **Already Implemented:**
- `idx_domain` ON domain_checks(domain)
- `idx_domain_check_id` ON domain_check_urls(domain_check_id)
- `idx_active_site` ON wp_sites(is_active)
- `idx_wp_site_history` ON wp_edit_history(wp_site_id)
- `idx_history_created` ON wp_edit_history(created_at)
- `idx_wp_post_url` ON wp_post_outgoing_urls(wp_site_id, post_id) UNIQUE
- `idx_session_id` ON wp_editor_sessions(session_id)
- `idx_domain_snapshot` ON wp_editor_sessions(domain, is_snapshot)
- `idx_last_accessed` ON wp_editor_sessions(last_accessed)
- `idx_editor_session` ON wp_editor_posts(session_id)
- `idx_session_post` ON wp_editor_posts(session_id, post_id) UNIQUE
- `idx_token` ON auth_tokens(token)
- `idx_expires_at` ON auth_tokens(expires_at)

## Common Query Patterns Analysis

### High-Frequency Queries:

1. **Get active WordPress site**
   ```sql
   SELECT * FROM wp_sites WHERE is_active = 1 LIMIT 1
   ```
   ✅ Optimized with `idx_active_site`

2. **Get editor session by session_id**
   ```sql
   SELECT * FROM wp_editor_sessions WHERE session_id = ?
   ```
   ✅ Optimized with `idx_session_id`

3. **Get posts for session**
   ```sql
   SELECT * FROM wp_editor_posts WHERE session_id = ? ORDER BY post_id
   ```
   ✅ Optimized with `idx_editor_session`

4. **Get snapshots by domain**
   ```sql
   SELECT * FROM wp_editor_sessions
   WHERE domain = ? AND is_snapshot = 1
   ORDER BY created_at DESC
   ```
   ✅ Optimized with `idx_domain_snapshot`

5. **Auth token lookup**
   ```sql
   SELECT * FROM auth_tokens WHERE token = ?
   ```
   ✅ Optimized with `idx_token`

6. **Cleanup expired tokens**
   ```sql
   DELETE FROM auth_tokens WHERE datetime(expires_at) < datetime('now')
   ```
   ✅ Optimized with `idx_expires_at`

7. **List all WordPress sites**
   ```sql
   SELECT * FROM wp_sites ORDER BY created_at DESC
   ```
   ⚠️ Could benefit from index on created_at

8. **Get editor session with wp_site_id filter**
   ```sql
   SELECT * FROM wp_editor_sessions
   WHERE wp_site_id = ? AND is_snapshot = 1
   ORDER BY created_at DESC LIMIT ?
   ```
   ⚠️ Could benefit from composite index (wp_site_id, is_snapshot, created_at)

## Recommended Optimizations

### 1. Add Missing Indexes

#### A. wp_sites table
```sql
CREATE INDEX IF NOT EXISTS idx_wp_sites_created ON wp_sites(created_at DESC);
```
**Reason:** Frequently used for listing sites in reverse chronological order

#### B. wp_editor_sessions table
```sql
CREATE INDEX IF NOT EXISTS idx_sessions_site_snapshot
ON wp_editor_sessions(wp_site_id, is_snapshot, created_at DESC);
```
**Reason:** Optimize filtered listing by wp_site_id and is_snapshot

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_created
ON wp_editor_sessions(created_at DESC);
```
**Reason:** General listing by creation date

#### C. auth_tokens table
```sql
CREATE INDEX IF NOT EXISTS idx_auth_username
ON auth_tokens(username);
```
**Reason:** For delete_all_user_tokens() function

#### D. wp_editor_posts table
```sql
CREATE INDEX IF NOT EXISTS idx_posts_wp_site
ON wp_editor_posts(wp_site_id);
```
**Reason:** If we need to query posts by wp_site_id

### 2. Query Optimizations

#### A. Use EXPLAIN QUERY PLAN
Add logging to identify slow queries:
```python
cursor.execute("EXPLAIN QUERY PLAN " + query)
```

#### B. Batch Operations
Instead of multiple single inserts:
```python
# Bad
for post in posts:
    c.execute("INSERT INTO ...", (post,))

# Good
c.executemany("INSERT INTO ...", posts)
```

#### C. Connection Pooling
Currently opening/closing connection for each operation. Consider:
- Reuse connections
- Connection pool library (e.g., sqlite3.connect with check_same_thread=False)

### 3. Database Maintenance

#### A. VACUUM
Periodically run VACUUM to reclaim space:
```sql
VACUUM;
```

#### B. ANALYZE
Update statistics for query optimizer:
```sql
ANALYZE;
```

#### C. Cleanup Old Data
- Implement retention policy for check_history
- Archive old snapshots
- Regular cleanup of expired tokens (already implemented)

### 4. Schema Improvements (Future)

#### A. Add timestamps to all tables
Ensure created_at and updated_at on all tables for auditing

#### B. Consider denormalization
For frequently joined data (e.g., wp_site info with sessions)

#### C. Partitioning (if data grows large)
Partition wp_editor_sessions by date or wp_site_id

## Performance Metrics to Monitor

1. **Query execution time** - Log slow queries (>100ms)
2. **Database file size** - Monitor growth
3. **Index usage** - SQLite doesn't have direct stats, but can use EXPLAIN
4. **Connection count** - Monitor concurrent connections
5. **Lock contention** - SQLite has limited concurrency

## Implementation Priority

### High Priority (Do Now)
1. ✅ Add idx_wp_sites_created
2. ✅ Add idx_sessions_site_snapshot
3. ✅ Add idx_auth_username

### Medium Priority (Next Sprint)
1. Implement query logging for slow queries
2. Add VACUUM/ANALYZE to maintenance tasks
3. Optimize batch insert operations

### Low Priority (Future)
1. Connection pooling
2. Schema normalization review
3. Consider migration to PostgreSQL if concurrent writes become issue

## Estimated Performance Improvements

- **wp_sites listing**: 2-5x faster with created_at index
- **Filtered snapshots**: 3-10x faster with composite index
- **User token cleanup**: 2x faster with username index
- **Overall database size**: 10-20% reduction after VACUUM

## Migration Script

Will create a migration function to add new indexes without disrupting existing data.
