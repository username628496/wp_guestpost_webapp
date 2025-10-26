# Password Reset Setup Guide

## Overview

Hệ thống password reset cho phép admin thay đổi mật khẩu qua email **hoangphihongchoibet@gmail.com**

## Gmail Setup

### Bước 1: Tạo Gmail App Password

1. **Truy cập Google Account Security**
   ```
   https://myaccount.google.com/security
   ```

2. **Bật 2-Step Verification** (nếu chưa bật)
   - Click "2-Step Verification"
   - Follow hướng dẫn để enable

3. **Tạo App Password**
   ```
   https://myaccount.google.com/apppasswords
   ```
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Nhập tên: **Guest Post Tool**
   - Click **Generate**
   - **Copy 16-character password** (ví dụ: `abcd efgh ijkl mnop`)

### Bước 2: Cấu hình Backend

1. **Tạo file `.env`** trong folder `backend/`:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Cập nhật `.env`** với Gmail App Password:
   ```env
   # Admin Credentials
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918

   # Gmail Configuration
   GMAIL_USER=hoangphihongchoibet@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop  # Replace with your 16-char app password
   ```

3. **Restart backend server**:
   ```bash
   cd backend
   source venv/bin/activate
   python app.py
   ```

## Usage Guide

### Cách Reset Password

1. **Mở Login Page**: `http://localhost:5175`

2. **Click "Quên mật khẩu?"**

3. **Bước 1: Request Reset**
   - Nhập **Username**: `admin`
   - Nhập **Email**: `hoangphihongchoibet@gmail.com`
   - Click **"Gửi Email Reset"**

4. **Check Email**
   - Mở email inbox của `hoangphihongchoibet@gmail.com`
   - Tìm email với subject: **"Guest Post Tool - Password Reset Request"**
   - Copy **Reset Token** từ email

5. **Bước 2: Reset Password**
   - Paste **Reset Token** vào form
   - Nhập **Mật khẩu mới** (tối thiểu 6 ký tự)
   - Nhập lại **Xác nhận mật khẩu**
   - Click **"Reset Password"**

6. **Update Backend Configuration**
   - Mở browser console (F12)
   - Copy giá trị `new_hash` từ console log
   - Update file `backend/.env`:
     ```env
     ADMIN_PASSWORD_HASH=your_new_hash_here
     ```
   - Restart backend server

7. **Login với password mới**

## Features

✅ **Secure Token System**
- Token valid for 1 hour
- One-time use only
- Auto-expire after use

✅ **Professional Email Template**
- HTML formatted email
- Clear instructions
- Warning about expiration

✅ **User-Friendly UI**
- 2-step wizard flow
- Clear error messages
- Loading states

✅ **Security Features**
- SHA-256 password hashing
- Email verification
- Token expiration
- Username validation

## API Endpoints

### POST /api/auth/request-reset
Request password reset email

**Request:**
```json
{
  "username": "admin",
  "email": "hoangphihongchoibet@gmail.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email reset password đã được gửi...",
  "email": "hoangphihongchoibet@gmail.com"
}
```

### POST /api/auth/reset-password
Reset password with token

**Request:**
```json
{
  "username": "admin",
  "reset_token": "abc123...",
  "new_password": "new_secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password đã được reset thành công",
  "new_hash": "...",
  "instruction": "Admin cần cập nhật ADMIN_PASSWORD_HASH..."
}
```

## Troubleshooting

### Problem: "Không thể gửi email"

**Solution 1**: Check Gmail App Password
```bash
# Verify .env file
cat backend/.env | grep GMAIL_APP_PASSWORD
```

**Solution 2**: Check Gmail Account Settings
- Ensure 2-Step Verification is enabled
- Ensure App Password is created correctly
- Try generating a new App Password

**Solution 3**: Check Backend Logs
```bash
# Look for email errors
tail -f backend/logs/app.log
```

### Problem: "Token không hợp lệ hoặc đã hết hạn"

**Reasons**:
- Token expired (>1 hour old)
- Token already used
- Wrong token copied

**Solution**:
- Request new reset email
- Copy token carefully (no spaces)
- Use token within 1 hour

### Problem: "Username không tồn tại"

**Solution**:
- Verify username is `admin`
- Check ADMIN_USERNAME in `.env`

## Email Template Preview

Email được gửi sẽ có format:

```
Subject: Guest Post Tool - Password Reset Request

🔐 Password Reset Request

Chào bạn,

Chúng tôi nhận được yêu cầu reset password cho tài khoản Guest Post Tool của bạn.

Đây là Reset Token của bạn:

┌─────────────────────────────────────────┐
│  abc123def456ghi789jkl012mno345pqr678  │
└─────────────────────────────────────────┘

Hướng dẫn sử dụng:
1. Mở trang đăng nhập của Guest Post Tool
2. Click vào "Quên mật khẩu?"
3. Nhập username và reset token ở trên
4. Tạo mật khẩu mới của bạn

⚠️ Lưu ý:
• Token này sẽ hết hạn sau 1 giờ
• Chỉ sử dụng được 1 lần
• Nếu bạn không yêu cầu reset password, vui lòng bỏ qua email này
```

## Security Best Practices

1. ✅ **Đổi Gmail App Password định kỳ**
2. ✅ **Không share reset token**
3. ✅ **Sử dụng token ngay sau khi nhận**
4. ✅ **Đặt password mạnh (>12 characters)**
5. ✅ **Không commit `.env` vào git**
6. ✅ **Monitor email logs cho suspicious activity**

## Future Enhancements

Planned features:
- [ ] Rate limiting for reset requests
- [ ] Admin notification on password change
- [ ] Password strength meter
- [ ] 2FA integration
- [ ] Reset history logging
- [ ] Multiple admin accounts

## Support

Nếu gặp vấn đề:
1. Check backend logs
2. Verify Gmail configuration
3. Test email sending manually
4. Contact system admin

---

**Gmail Admin**: hoangphihongchoibet@gmail.com
**Created**: 2025-10-26
**Version**: 1.0.0
