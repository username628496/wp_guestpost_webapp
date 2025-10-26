# 🚀 Deployment Guide - VPS (gp.aeseo1.org)

## Quick Fix for CORS Error

### Problem
```
Access to fetch at 'http://127.0.0.1:5050/api/auth/login' from origin 'https://gp.aeseo1.org'
has been blocked by CORS policy
```

### Root Cause
1. Frontend is calling wrong API URL (127.0.0.1 instead of production domain)
2. Backend CORS not configured for production domain

---

## Fix Instructions

### 1. Update Backend .env on VPS

SSH vào VPS:
```bash
ssh root@your-vps-ip
cd /var/www/wp_guestpost_webapp/backend
```

Chỉnh sửa `.env`:
```bash
nano .env
```

**QUAN TRỌNG - Thêm dòng này:**
```bash
ALLOWED_ORIGINS=https://gp.aeseo1.org
```

File `.env` đầy đủ nên có:
```bash
# Serper API
SERPER_API_KEY=your_serper_api_key_here

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your_password_hash_here

# Server Config
DEBUG=False
PORT=5050

# CORS - QUAN TRỌNG!
ALLOWED_ORIGINS=https://gp.aeseo1.org

# Optional
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password
```

Lưu file (Ctrl+O, Enter, Ctrl+X)

---

### 2. Pull Code Mới từ GitHub

```bash
cd /var/www/wp_guestpost_webapp
git pull origin main
```

---

### 3. Rebuild Frontend trên VPS

```bash
cd /var/www/wp_guestpost_webapp/frontend

# Tạo file .env.production
echo "VITE_API_BASE=https://gp.aeseo1.org" > .env.production

# Rebuild
npm run build
```

---

### 4. Restart Backend

**Nếu dùng PM2:**
```bash
pm2 restart guestpost-api
pm2 logs guestpost-api  # Kiểm tra logs
```

**Nếu dùng systemd:**
```bash
sudo systemctl restart guest_post_tool
sudo systemctl status guest_post_tool
```

---

### 5. Restart Nginx

```bash
sudo systemctl restart nginx
```

---

### 6. Kiểm Tra

1. Truy cập: https://gp.aeseo1.org
2. Mở DevTools Console (F12)
3. Thử login
4. Kiểm tra Network tab - API calls phải gọi `https://gp.aeseo1.org/api/...` (KHÔNG phải 127.0.0.1)

---

## Nginx Configuration

File: `/etc/nginx/sites-available/guestpost`

```nginx
server {
    listen 80;
    server_name gp.aeseo1.org;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gp.aeseo1.org;

    ssl_certificate /etc/letsencrypt/live/gp.aeseo1.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gp.aeseo1.org/privkey.pem;

    # Frontend static files
    location / {
        root /var/www/wp_guestpost_webapp/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5050/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers (if backend doesn't handle)
        add_header 'Access-Control-Allow-Origin' 'https://gp.aeseo1.org' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5050/health;
        access_log off;
    }
}
```

Test Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Troubleshooting

### CORS vẫn lỗi?

**Check 1: Backend có chạy không?**
```bash
curl http://127.0.0.1:5050/health
# Phải trả về: {"status": "healthy", ...}
```

**Check 2: CORS headers**
```bash
curl -I https://gp.aeseo1.org/api/auth/login
# Phải có: Access-Control-Allow-Origin: https://gp.aeseo1.org
```

**Check 3: Frontend gọi đúng URL?**
- Mở DevTools → Network tab
- Reload trang
- Kiểm tra API calls phải là `https://gp.aeseo1.org/api/...`

**Check 4: Backend logs**
```bash
pm2 logs guestpost-api --lines 50
# Hoặc
journalctl -u guest_post_tool -f
```

---

## Common Issues

### 1. API calls vẫn gọi 127.0.0.1
**Cause:** Frontend build chưa có .env.production
**Fix:**
```bash
cd frontend
echo "VITE_API_BASE=https://gp.aeseo1.org" > .env.production
npm run build
```

### 2. CORS preflight OPTIONS failed
**Cause:** Backend ALLOWED_ORIGINS sai
**Fix:**
```bash
nano backend/.env
# Sửa: ALLOWED_ORIGINS=https://gp.aeseo1.org
pm2 restart guestpost-api
```

### 3. 502 Bad Gateway
**Cause:** Backend không chạy
**Fix:**
```bash
pm2 list  # Kiểm tra status
pm2 restart guestpost-api
```

---

## Production Checklist

- [ ] Backend `.env` có `ALLOWED_ORIGINS=https://gp.aeseo1.org`
- [ ] Frontend `.env.production` có `VITE_API_BASE=https://gp.aeseo1.org`
- [ ] Frontend đã rebuild (`npm run build`)
- [ ] Backend đã restart
- [ ] Nginx đã reload
- [ ] SSL certificate hợp lệ
- [ ] Health check OK: https://gp.aeseo1.org/health
- [ ] Login thành công không có CORS error

---

## Contact

Nếu vẫn gặp lỗi, gửi:
1. Screenshot lỗi từ DevTools Console
2. Output của: `pm2 logs guestpost-api --lines 20`
3. Output của: `curl -I https://gp.aeseo1.org/health`
