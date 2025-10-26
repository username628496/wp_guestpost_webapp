# Authentication Documentation

## Overview

Guest Post Tool đã được bảo mật với hệ thống authentication. Tất cả users phải đăng nhập trước khi sử dụng webapp.

## Default Credentials

**Username:** `admin`
**Password:** `admin123`

⚠️ **QUAN TRỌNG**: Đổi password ngay sau khi đăng nhập lần đầu!

## Features

### 1. Login Page
- Modern, responsive UI
- Username và password authentication
- Error handling với thông báo rõ ràng
- Loading state trong khi đăng nhập

### 2. Token-Based Authentication
- JWT-like token system
- Token valid for 7 days
- Automatic token verification on page load
- Secure token storage in localStorage

### 3. Protected Routes
- Tất cả pages yêu cầu authentication
- Auto-redirect về login page nếu chưa đăng nhập
- Token expiration handling

### 4. User Session Management
- Display current user info in sidebar
- Logout functionality
- Session cleanup on logout

## Usage Guide

### First Login
1. Mở webapp tại `http://localhost:5174`
2. Nhập default credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Đăng nhập"

### Change Password

Để đổi password:

1. Call API endpoint:
```bash
curl -X POST http://127.0.0.1:5050/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_password":"admin123","new_password":"your_new_password"}'
```

2. API sẽ trả về `new_hash`
3. Copy `new_hash` và update vào file `.env`:
```bash
ADMIN_PASSWORD_HASH=your_new_hash_here
```

4. Restart backend server

### Logout
- Click nút "Đăng xuất" ở sidebar (bottom)
- Hoặc khi sidebar collapsed, click icon logout

## Security Features

✅ **Password Hashing**: SHA-256 hash
✅ **Token-Based Auth**: Secure random tokens
✅ **Token Expiration**: 7 days validity
✅ **Automatic Cleanup**: Expired tokens removed
✅ **Protected Routes**: All pages require auth
✅ **Session Verification**: Token verified on every page load

## Environment Variables

Tạo file `.env` trong folder `backend/`:

```bash
# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918

# Optional: Change username
# ADMIN_USERNAME=your_custom_username
```

## API Endpoints

### POST /api/auth/login
Login và nhận token

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "abc123...",
  "user": {
    "username": "admin",
    "role": "admin"
  },
  "expires_at": "2025-11-02T00:00:00Z"
}
```

### POST /api/auth/logout
Logout và invalidate token

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

### GET /api/auth/verify
Verify token validity

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

### POST /api/auth/change-password
Đổi password

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Request:**
```json
{
  "current_password": "admin123",
  "new_password": "new_secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đổi password thành công",
  "new_hash": "...",
  "instruction": "Vui lòng cập nhật ADMIN_PASSWORD_HASH trong file .env"
}
```

## Production Deployment

### 1. Change Default Password
```bash
# Generate new password hash
python3 -c "import hashlib; print(hashlib.sha256('your_secure_password'.encode()).hexdigest())"
```

### 2. Update .env
```bash
ADMIN_PASSWORD_HASH=your_generated_hash
```

### 3. Restart Backend
```bash
cd backend
source venv/bin/activate
python app.py
```

## Troubleshooting

### Problem: "Invalid or expired token"
**Solution**: Token đã hết hạn hoặc invalid. Đăng nhập lại.

### Problem: "Username hoặc password không đúng"
**Solution**:
- Check default credentials: admin/admin123
- Verify ADMIN_PASSWORD_HASH in .env matches your password

### Problem: Backend says "Using default password"
**Solution**:
- Tạo file `.env` trong backend folder
- Add `ADMIN_PASSWORD_HASH` variable
- Restart backend

## Security Best Practices

1. ⚠️ **Đổi password ngay sau first login**
2. 🔒 **Không commit `.env` file vào git**
3. 🔐 **Sử dụng strong password (>12 characters)**
4. 🔄 **Đổi password định kỳ**
5. 🚫 **Không share token với người khác**
6. 📝 **Lưu password hash ở nơi an toàn**

## Future Enhancements

Planned features:
- [ ] Multi-user support
- [ ] Role-based access control (RBAC)
- [ ] Password reset via email
- [ ] 2FA (Two-Factor Authentication)
- [ ] Session activity logging
- [ ] Password strength requirements
- [ ] Account lockout after failed attempts

## Support

Nếu gặp vấn đề với authentication:
1. Check backend logs
2. Verify .env configuration
3. Clear browser localStorage and try again
4. Contact admin for support
