# 📋 Guest Post Tool - Improvements TODO

## ✅ Đã Hoàn Thành
1. ✅ Thêm domain hiển thị trên topbar WordPress Editor (đã có sẵn)
2. ✅ Thêm button "Refresh from WP" để fix lỗi snapshot
3. ✅ Cấu hình CORS cho production
4. ✅ Thêm tab Hướng Dẫn và TextHome
5. ✅ Đơn giản hóa design (bỏ gradient)
6. ✅ Thêm Telegram contact

## 🔄 Đang Thực Hiện

### 1. Hiển thị số lượng trên topbar (thay vì sidebar badge)

#### WP History - Thêm số lượng snapshots
**File:** `frontend/src/components/WPHistoryPageNew.jsx`

```jsx
// Dòng ~130 - Update header
<header className="bg-white border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-6 py-4">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WP Edit History</h1>
        <p className="text-sm text-gray-500 mt-1">
          {Object.keys(historyList).length} domains • {
            Object.values(historyList).reduce((acc, sessions) => acc + sessions.length, 0)
          } snapshots
        </p>
      </div>
      {/* ... existing buttons */}
    </div>
  </div>
</header>
```

#### My WordPress Sites - Thêm số lượng sites
**File:** `frontend/src/components/wordpress/WordPressSitesPage.jsx`

```jsx
// Dòng ~141 - Update subtitle
<p className="text-sm text-gray-500 mt-1">
  {wpSites.length} sites • {wpSites.filter(s => s.is_active).length} active
</p>
```

#### Bỏ badge trong sidebar
**File:** `frontend/src/AppWithSidebar.jsx`

```jsx
// Dòng ~427 - Remove badge prop
<NavItem
  icon={<Settings className="w-5 h-5" />}
  label="My WordPress Sites"
  active={currentPage === "wp-sites"}
  onClick={() => setCurrentPage("wp-sites")}
  collapsed={!sidebarOpen}
  // badge={wpSites.length > 0 ? wpSites.length.toString() : undefined}  // REMOVE THIS LINE
/>
```

---

### 2. Bỏ emoji trong GuidePage - Chỉ dùng Lucide icons

**File:** `frontend/src/components/GuidePage.jsx`

**Changes needed:**
```jsx
// Replace all emoji với Lucide icons:
// "📝" → <FileText className="w-4 h-4" />
// "🔑" → <Key className="w-4 h-4" />
// "⚙️" → <Settings className="w-4 h-4" />
// Etc.

// Import thêm icons:
import { ..., FileText, Key, List, Info } from 'lucide-react'

// Example fix (dòng 32):
<h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
  <FileText className="w-4 h-4 text-gray-600" />
  Cách sử dụng:
</h4>
```

---

### 3. Thêm Loading States Chi Tiết

#### Index Checker Loading
**File:** `frontend/src/AppWithSidebar.jsx`

```jsx
// Dòng ~205 - handleProcess()
// Add detailed loading messages:
const [loadingSteps, setLoadingSteps] = useState([])

// Step 1: Fetching sitemap
setLoadingSteps(['Đang crawl sitemap...'])
toast.loading("Bước 1/3: Lấy sitemap...", { id: 'fetch' })

// Step 2: Parsing URLs
setLoadingSteps(prev => [...prev, 'Đang parse URLs...'])
toast.loading(`Bước 2/3: Phân tích ${allUrls.length} URLs...`, { id: 'fetch' })

// Step 3: Checking index
setLoadingSteps(prev => [...prev, 'Đang kiểm tra index status...'])
toast.loading(`Bước 3/3: Kiểm tra ${allUrls.length} URLs...`, { id: 'check' })
```

#### WordPress Editor Loading
Already has detailed loading - OK ✅

---

### 4. Lưu Sidebar Preference vào localStorage

**File:** `frontend/src/AppWithSidebar.jsx`

```jsx
// Dòng ~28 - Initialize from localStorage
const [sidebarOpen, setSidebarOpen] = useState(() => {
  const saved = localStorage.getItem('sidebar_open')
  return saved !== null ? saved === 'true' : true
})

// Add useEffect to save preference
useEffect(() => {
  localStorage.setItem('sidebar_open', sidebarOpen.toString())
}, [sidebarOpen])
```

---

### 5. Thêm Breadcrumbs Navigation

**File:** Create `frontend/src/components/Breadcrumbs.jsx`

```jsx
import React from 'react'
import { ChevronRight, Home } from 'lucide-react'

export default function Breadcrumbs({ items, onNavigate }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <button
        onClick={() => onNavigate('index-checker')}
        className="hover:text-gray-900 flex items-center gap-1"
      >
        <Home className="w-4 h-4" />
        Home
      </button>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {idx === items.length - 1 ? (
            <span className="font-medium text-gray-900">{item.label}</span>
          ) : (
            <button
              onClick={() => onNavigate(item.page)}
              className="hover:text-gray-900"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
```

**Add to each page header:**
```jsx
<header className="bg-white border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-6 py-4">
    <Breadcrumbs
      items={[{ label: 'WordPress Editor', page: 'wordpress-editor' }]}
      onNavigate={setCurrentPage}
    />
    <h1 className="text-2xl font-bold text-gray-900 mt-2">WordPress Editor</h1>
  </div>
</header>
```

---

### 6. Keyboard Shortcuts

**File:** `frontend/src/hooks/useKeyboardShortcuts.js`

```jsx
import { useEffect } from 'react'

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K - Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        shortcuts.onSearch?.()
      }

      // Ctrl/Cmd + S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        shortcuts.onSave?.()
      }

      // Escape - Close modal/cancel
      if (e.key === 'Escape') {
        shortcuts.onCancel?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
```

**Usage in WordPress Editor:**
```jsx
useKeyboardShortcuts({
  onSave: handleSaveAll,
  onCancel: () => setEditingPost(null)
})
```

---

### 7. Back Button trong các pages

Add to each page header:

```jsx
<button
  onClick={() => setCurrentPage('index-checker')}
  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
>
  <ArrowLeft className="w-4 h-4" />
  Back to Home
</button>
```

---

### 8. Remember Me cho Login

**File:** `frontend/src/components/LoginPage.jsx`

```jsx
// Add state
const [rememberMe, setRememberMe] = useState(false)

// After successful login:
if (rememberMe) {
  localStorage.setItem('remember_me', 'true')
  localStorage.setItem('username', username)  // Optional - save username only
}

// Add checkbox in form:
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
    className="rounded border-gray-300"
  />
  <span className="text-sm text-gray-600">Remember me</span>
</label>

// Initialize username from localStorage:
const [username, setUsername] = useState(() => {
  return localStorage.getItem('remember_me') === 'true'
    ? localStorage.getItem('username') || ''
    : ''
})
```

---

### 9. Chuyển Password Hash từ .env sang Database

#### Backend Changes

**File:** `backend/models/database.py`

```python
# Add new table for admin credentials
def init_db():
    # ... existing code ...

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Migrate from .env if exists
    env_hash = os.getenv('ADMIN_PASSWORD_HASH')
    if env_hash:
        cursor.execute('''
            INSERT OR REPLACE INTO admin_credentials (id, username, password_hash)
            VALUES (1, ?, ?)
        ''', ('admin', env_hash))
        print('[Database] Migrated password hash from .env to database')

    conn.commit()
    conn.close()

# Add helper functions
def get_admin_password_hash():
    """Get admin password hash from database"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT password_hash FROM admin_credentials WHERE id = 1')
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

def update_admin_password_hash(new_hash):
    """Update admin password hash in database"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO admin_credentials (id, username, password_hash, updated_at)
        VALUES (1, 'admin', ?, datetime('now'))
    ''', (new_hash,))
    conn.commit()
    conn.close()
```

**File:** `backend/routes/auth.py`

```python
# Update imports
from models.database import get_admin_password_hash, update_admin_password_hash

# Update get_admin_password_hash() function - REMOVE old one
# Use: hash_from_db = get_admin_password_hash()

# Update change_password endpoint:
@bp.route("/api/auth/change-password", methods=["POST"])
@token_required
def change_password():
    # ... validation code ...

    # Generate new password hash
    new_password_hash = hash_password(new_password)

    # Update in database
    update_admin_password_hash(new_password_hash)

    return jsonify({
        'success': True,
        'message': 'Đổi password thành công'
    }), 200

# Update reset_password endpoint:
@bp.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    # ... validation code ...

    # Update in database instead of .env
    update_admin_password_hash(new_password_hash)
    invalidate_reset_token(reset_token)

    return jsonify({
        'success': True,
        'message': 'Password đã được reset thành công!'
    }), 200
```

---

### 10. Bỏ limit 500 URLs cho Index Checker

**File:** `backend/routes/check_index.py`

```python
# Dòng ~50 - Update max_urls default
max_urls = data.get('max_urls', 10000)  # Changed from 500 to 10000

# Or remove limit completely:
max_urls = data.get('max_urls')  # No default
if max_urls is None:
    max_urls = float('inf')  # No limit
```

**File:** `frontend/src/AppWithSidebar.jsx`

```jsx
// Dòng ~223 - Update fetch sitemap request
body: JSON.stringify({
  domain,
  max_urls: 10000  // Or remove this param for unlimited
})
```

---

## 📝 Implementation Priority

### Phase 1 (High Priority - Quick Wins): ✅ COMPLETED
1. ✅ Bỏ emoji trong GuidePage - replaced with Lucide icons (FileText, Key)
2. ✅ Lưu sidebar preference - saved to localStorage
3. ✅ Thêm số lượng vào topbar, bỏ badge sidebar
4. ✅ Bỏ limit URLs - increased from 500 to 10,000 URLs

### Phase 2 (Medium Priority): ✅ COMPLETED
5. ✅ Breadcrumbs navigation - added to WP History detail view
6. ✅ Back buttons - added ArrowLeft icon to snapshot detail page
7. ✅ Loading states chi tiết - already implemented with loadingMessage
8. ✅ Keyboard shortcuts - Ctrl+S to save, Esc to close editor modal

### Phase 3 (Low Priority - Requires Backend):
9. ⏳ Remember Me
10. ⏳ Password hash to database

---

## 🚀 Quick Implementation Commands

```bash
# Start frontend dev
cd frontend && npm run dev

# Start backend dev
cd backend && python app.py

# Test after changes
# - Check localStorage persistence
# - Check topbar displays
# - Check all icons render correctly
```

---

## ✨ Testing Checklist

- [ ] Sidebar state persists across page refresh
- [ ] Snapshot count shows correctly on WP History
- [ ] Sites count shows correctly on My WordPress Sites
- [ ] No emojis in GuidePage
- [ ] All Lucide icons render properly
- [ ] Can fetch >500 URLs from sitemap
- [ ] Back buttons work in all pages
- [ ] Breadcrumbs navigate correctly
