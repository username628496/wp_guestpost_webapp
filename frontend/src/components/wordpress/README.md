# WordPress Components

Thư mục này chứa các components liên quan đến quản lý WordPress sites.

## Cấu trúc Components

### WordPressSiteCard.jsx
Component hiển thị thông tin một WordPress site dạng card.

**Props:**
- `site` (object): Thông tin site
  - `id`: ID của site
  - `name`: Tên site
  - `site_url`: URL của site
  - `wordpress_url`: URL WordPress admin
  - `username`: Username
  - `app_password`: Application password
  - `wordpress_password`: WordPress password thông thường
  - `is_active`: Site có đang active không
  - `created_at`: Ngày tạo
  - `updated_at`: Ngày cập nhật
- `onEdit` (function): Callback khi click nút Edit
- `onDelete` (function): Callback khi click nút Delete
- `onSetActive` (function): Callback khi click nút Set Active

**Features:**
- Hiển thị URL dạng link có thể click
- Toggle show/hide cho passwords
- Copy button cho username và passwords
- Hiển thị ngày thêm và ngày sửa
- Active badge cho site đang active
- Icon buttons cho Edit và Delete

### WordPressSiteForm.jsx
Component form để thêm/sửa WordPress site.

**Props:**
- `site` (object, optional): Site cần edit (null nếu là thêm mới)
- `onSubmit` (function): Callback khi submit form với formData
- `onCancel` (function): Callback khi cancel

**Features:**
- Hỗ trợ cả Add và Edit mode
- Toggle show/hide cho passwords
- Validation các trường bắt buộc
- Help text cho các trường

### WordPressSitesPage.jsx
Component chính quản lý danh sách WordPress sites.

**Props:**
- `wpSites` (array): Danh sách WordPress sites
- `setWpSites` (function): Function để update danh sách sites
- `activeWpSite` (object): Site đang active
- `setActiveWpSite` (function): Function để set active site
- `setWpConfig` (function): Function để update WordPress config

**Features:**
- Grid layout responsive (1-4 cột)
- Add/Edit site với form modal
- Set active site
- Delete site với confirmation
- Auto-reload sau mỗi thao tác

## Database Schema

```sql
CREATE TABLE wp_sites (
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
```

## API Endpoints

- `GET /api/wp-sites` - Lấy danh sách tất cả sites
- `POST /api/wp-sites` - Thêm site mới
- `PUT /api/wp-sites/:id` - Cập nhật site
- `DELETE /api/wp-sites/:id` - Xóa site
- `PUT /api/wp-sites/:id/active` - Set site làm active
- `GET /api/wp-sites/active` - Lấy site đang active

## Usage Example

```jsx
import WordPressSitesPage from './components/wordpress/WordPressSitesPage'

function App() {
  const [wpSites, setWpSites] = useState([])
  const [activeWpSite, setActiveWpSite] = useState(null)
  const [wpConfig, setWpConfig] = useState(null)

  return (
    <WordPressSitesPage
      wpSites={wpSites}
      setWpSites={setWpSites}
      activeWpSite={activeWpSite}
      setActiveWpSite={setActiveWpSite}
      setWpConfig={setWpConfig}
    />
  )
}
```
