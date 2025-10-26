# 🔧 Fix Nginx 404 Error

## Problem
```
POST https://gp.aeseo1.org/api/auth/login 404 (Not Found)
```

## Root Cause
Nginx đang proxy sai đường dẫn `/api/` → backend không nhận được request đúng

---

## Solution: Fix Nginx Config

### Cách 1: Proxy WITHOUT trailing slash (RECOMMENDED)

SSH vào VPS:
```bash
ssh root@your-vps-ip
sudo nano /etc/nginx/sites-available/guestpost
```

Sửa location `/api/` thành:

```nginx
# Backend API - KHÔNG có trailing slash sau /api
location /api {
    proxy_pass http://127.0.0.1:5050;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Health check
location /health {
    proxy_pass http://127.0.0.1:5050/health;
    access_log off;
}
```

**QUAN TRỌNG:**
- `location /api` (KHÔNG có `/` cuối)
- `proxy_pass http://127.0.0.1:5050` (KHÔNG có `/api/` cuối)

### Test và Apply:

```bash
# Test config
sudo nginx -t

# Nếu OK, reload
sudo systemctl reload nginx

# Test API
curl -X POST https://gp.aeseo1.org/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"test"}'

# Should return JSON response (not 404)
```

---

## Full Nginx Config (Complete Example)

File: `/etc/nginx/sites-available/guestpost`

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name gp.aeseo1.org;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name gp.aeseo1.org;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/gp.aeseo1.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gp.aeseo1.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Frontend - Static Files
    location / {
        root /var/www/wp_guestpost_webapp/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - CRITICAL: No trailing slashes!
    location /api {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health Check
    location /health {
        proxy_pass http://127.0.0.1:5050/health;
        access_log off;
    }

    # Access & Error Logs
    access_log /var/log/nginx/guestpost_access.log;
    error_log /var/log/nginx/guestpost_error.log;
}
```

---

## Verification Steps

### 1. Check Backend is Running
```bash
# Check if backend responds locally
curl http://127.0.0.1:5050/health

# Should return:
# {"status":"healthy","service":"Guest Post Tool API","version":"1.0.0"}
```

### 2. Check Nginx Proxy
```bash
# Test through Nginx
curl https://gp.aeseo1.org/health

# Should return same health check response
```

### 3. Test Login API
```bash
curl -X POST https://gp.aeseo1.org/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong"}'

# Should return JSON error (not 404):
# {"error":"Invalid credentials"} or similar
```

### 4. Check Logs
```bash
# Backend logs
pm2 logs guestpost-api --lines 20

# Nginx error logs
sudo tail -f /var/log/nginx/guestpost_error.log

# Nginx access logs
sudo tail -f /var/log/nginx/guestpost_access.log
```

---

## Common Nginx Mistakes

### ❌ WRONG (causes 404):
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5050/api/;
}
```
**Problem:** Double `/api/api/` in path

### ❌ WRONG (causes 404):
```nginx
location /api {
    proxy_pass http://127.0.0.1:5050/;
}
```
**Problem:** Strips `/api` from path → backend receives wrong route

### ✅ CORRECT:
```nginx
location /api {
    proxy_pass http://127.0.0.1:5050;
}
```
**Result:** `/api/auth/login` → `http://127.0.0.1:5050/api/auth/login` ✓

---

## After Fixing

1. Reload Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. Clear browser cache (Ctrl+F5) or open Incognito

3. Try login at https://gp.aeseo1.org

4. Check DevTools → Network tab:
   - API calls should return 200/401 (not 404)
   - Response should be JSON (not HTML)

---

## Still 404?

### Debug Checklist:

```bash
# 1. Backend running?
pm2 list
# Should show "guestpost-api" online

# 2. Backend port correct?
ss -tlnp | grep 5050
# Should show python listening on 127.0.0.1:5050

# 3. Test backend directly
curl http://127.0.0.1:5050/api/auth/login
# Should return JSON (not connection refused)

# 4. Check Flask routes
pm2 logs guestpost-api --lines 100 | grep "POST /api"
# Should show route is registered

# 5. Restart everything
pm2 restart guestpost-api
sudo systemctl restart nginx
```

---

## Contact

If still having issues, send:
1. Output of: `sudo nginx -t`
2. Output of: `curl http://127.0.0.1:5050/health`
3. Output of: `pm2 logs guestpost-api --lines 50`
4. Your current Nginx config: `sudo cat /etc/nginx/sites-available/guestpost`
