# 🚀 Guest Post Index Checker

Công cụ kiểm tra index status của URLs trên Google. Hỗ trợ nhập domain để tự động crawl sitemap và kiểm tra hàng trăm URLs cùng lúc.

## ✨ Tính Năng

### 📊 Backend (Flask + Python)
- ✅ **Kiểm tra index status** qua Serper.dev API
- ✅ **Auto-crawl sitemap**: Nhập domain → tự động lấy tất cả URLs từ sitemap.xml
- ✅ **Batch processing**: Xử lý 10 URLs song song mỗi batch
- ✅ **Database SQLite**: Lưu lịch sử theo domain sessions
- ✅ **Export CSV**: 3 loại - All URLs, Indexed, Not Indexed
- ✅ **API endpoints**:
  - `POST /api/check-index` - Kiểm tra URLs
  - `GET /api/domain-checks` - Lịch sử domain checks
  - `GET /api/domain-checks/:id` - Chi tiết 1 domain check
  - `GET /api/export/:id?filter=all|indexed|not_indexed` - Export CSV
  - `GET /api/history` - Lịch sử cũ (backward compatible)

### 🎨 Frontend (React + Vite + Tailwind CSS)
- ✅ **UI hiện đại** với Tailwind CSS
- ✅ **Domain History**: Xem lịch sử theo domain, mở rộng để xem chi tiết
- ✅ **Export buttons**: 3 nút export riêng cho Indexed/Not Indexed/All
- ✅ **Real-time progress**: Hiển thị progress bar khi checking
- ✅ **Stats cards**: Thống kê tức thời
- ✅ **Responsive**: Hoạt động tốt trên mobile

## 🏗️ Cấu Trúc Dự Án

```
guest_post_tool/
├── backend/
│   ├── app.py                      # Flask app entry
│   ├── requirements.txt
│   ├── .env                        # Serper API key
│   ├── check_history.db           # SQLite database
│   ├── models/
│   │   └── database.py            # Database operations
│   ├── routes/
│   │   ├── check_index.py         # Main API routes
│   │   └── history.py             # History routes
│   ├── services/
│   │   ├── serper_service.py      # Serper API integration
│   │   └── sitemap_parser.py      # Sitemap crawler
│   └── utils/
│       └── logger.py              # Custom logger
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                 # Main component
        ├── services/
        │   └── api.js             # API client
        └── components/
            ├── IndexCheckForm.jsx
            ├── ResultTable.jsx
            └── DomainHistory.jsx   # Domain history với export

```

## 📦 Database Schema

### `domain_checks`
Lưu metadata của mỗi lần check domain:
```sql
CREATE TABLE domain_checks (
    id INTEGER PRIMARY KEY,
    domain TEXT,
    total_urls INTEGER,
    indexed_count INTEGER,
    not_indexed_count INTEGER,
    error_count INTEGER,
    created_at TEXT
)
```

### `domain_check_urls`
Lưu chi tiết từng URL:
```sql
CREATE TABLE domain_check_urls (
    id INTEGER PRIMARY KEY,
    domain_check_id INTEGER,
    url TEXT,
    status TEXT,
    checked_at TEXT,
    FOREIGN KEY (domain_check_id) REFERENCES domain_checks(id)
)
```

## 🚀 Cài Đặt & Chạy

### Backend

```bash
cd backend

# Tạo virtual environment
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# hoặc: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Tạo file .env với Serper API key
echo "SERPER_API_KEY=your_api_key_here" > .env

# Chạy server
python app.py
# → Server chạy ở http://127.0.0.1:5050
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Chạy dev server
npm run dev
# → Frontend chạy ở http://localhost:5173

# Build production
npm run build
```

## 📖 Hướng Dẫn Sử Dụng

### 1. Kiểm Tra URLs

**Cách 1: Nhập domain đơn giản**
```
example.com
```
→ Tự động crawl sitemap và kiểm tra tất cả URLs

**Cách 2: Nhập URLs trực tiếp**
```
https://example.com/page-1/
https://example.com/page-2/
```

**Cách 3: Mix cả domain và URLs**
```
example.com
https://another-site.com/specific-page/
```

### 2. Export Dữ Liệu

Sau khi check xong, trong **Domain History**:
- Nhấn **Indexed** → Export chỉ URLs đã index
- Nhấn **Not Indexed** → Export chỉ URLs chưa index
- Nhấn **All** → Export tất cả URLs

File CSV format:
```csv
URL,Status,Checked At
https://example.com,Indexed ✅,2025-10-24T14:07:05.059191+00:00
```

### 3. Xem Lịch Sử

Click vào domain trong **Domain History** để:
- Xem chi tiết tất cả URLs đã check
- Export từng loại
- Xem thống kê: Indexed/Not Indexed/Error count

## ⚡ Performance & Scalability

### Khả Năng Xử Lý Hàng Trăm Domains

**✅ CÓ THỂ**, nhưng cần lưu ý:

#### Test Case: 100 domains × 50 URLs = 5,000 URLs

| Metric | Value |
|--------|-------|
| Batch size | 10 URLs/batch |
| Time per batch | ~2-3 seconds |
| Total batches | 500 |
| **Estimated time** | **~20-25 phút** |

#### Bottlenecks

1. **Serper API Rate Limit** ⚠️
   - Free tier: 2,500 searches/month
   - Paid tier: Unlimited
   - → Cần **paid plan** cho hàng nghìn URLs/tháng

2. **Network latency**
   - Mỗi request mất 1-3s
   - → Đã optimize bằng async + batch processing

3. **Database writes**
   - SQLite handle tốt cho < 100k records
   - → OK cho use case này

#### Recommendations

- **< 10 domains**: Chạy ngay, không vấn đề
- **10-50 domains**: Chờ 5-15 phút
- **50-100 domains**: Chờ 15-30 phút, cần paid Serper API
- **> 100 domains**: Nên chạy qua batch jobs, không nên chạy interactive

## 🔧 API Documentation

### POST `/api/check-index`

Kiểm tra index status cho list URLs hoặc domains.

**Request:**
```json
{
  "urls": ["example.com", "https://another.com/page/"]
}
```

**Response:**
```json
{
  "domain_groups": {
    "example.com": [
      {
        "url": "https://example.com",
        "status": "Indexed ✅",
        "checked_at": "2025-10-24T14:07:05.059191+00:00"
      }
    ]
  },
  "domain_check_ids": {
    "example.com": 1
  }
}
```

### GET `/api/domain-checks`

Lấy danh sách domain checks gần nhất.

**Query params:**
- `limit`: Số lượng records (default: 20)

**Response:**
```json
{
  "domain_checks": [
    {
      "id": 1,
      "domain": "example.com",
      "total_urls": 50,
      "indexed_count": 35,
      "not_indexed_count": 15,
      "error_count": 0,
      "created_at": "2025-10-24T14:07:05.068879+00:00"
    }
  ]
}
```

### GET `/api/domain-checks/:id`

Lấy chi tiết 1 domain check.

**Response:**
```json
{
  "domain": "example.com",
  "created_at": "2025-10-24T14:07:05.068879+00:00",
  "urls": [
    {
      "url": "https://example.com/page-1/",
      "status": "Indexed ✅",
      "checked_at": "2025-10-24T14:07:05.059191+00:00"
    }
  ]
}
```

### GET `/api/export/:id`

Export domain check sang CSV.

**Query params:**
- `filter`: `all` (default), `indexed`, `not_indexed`

**Response:**
- File CSV download với tên: `{domain}_{filter}_{timestamp}.csv`

## 🐛 Troubleshooting

### Backend không chạy

```bash
# Kiểm tra port 5050 có bị chiếm không
lsof -i :5050

# Kiểm tra .env có SERPER_API_KEY chưa
cat backend/.env

# Xem logs
cd backend
python app.py
```

### Frontend không connect được backend

1. Kiểm tra backend đang chạy ở port 5050
2. Kiểm tra CORS đã bật trong `app.py`
3. Thử curl để test:
```bash
curl http://127.0.0.1:5050/
```

### Serper API lỗi

- Kiểm tra API key còn credit không: https://serper.dev/dashboard
- Free tier chỉ có 2,500 searches/month
- Rate limit: ~1 request/second

### Database locked error

SQLite có thể bị lock nếu nhiều requests cùng lúc:
```bash
# Reset database
rm backend/check_history.db
# Restart backend → tự tạo DB mới
```

## 🔐 Security Notes

- ⚠️ **Không commit `.env`** file lên git
- ⚠️ API key Serper.dev phải giữ bí mật
- ✅ CORS đã được cấu hình an toàn
- ✅ SQLite không expose ra internet (local only)

## 📝 Requirements

### Backend
- Python 3.8+
- Flask 2.x
- aiohttp (async HTTP)
- BeautifulSoup4 (parse sitemap XML)
- Serper.dev API key

### Frontend
- Node.js 16+
- React 18
- Vite 5
- Tailwind CSS 4
- Lucide React (icons)

## 🎯 Future Improvements

- [ ] Add Redis cache để giảm API calls
- [ ] Implement job queue (Celery) cho large batches
- [ ] Add authentication/multi-user support
- [ ] Schedule auto-recheck cho domains
- [ ] Export Excel (.xlsx) thay vì CSV
- [ ] Add charts/visualizations cho stats
- [ ] Webhook notifications khi check xong

## 📄 License

MIT License - Feel free to use for personal/commercial projects

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

**Made with ❤️ by Peter**
