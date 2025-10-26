from flask import Blueprint, request, jsonify
import hashlib
import secrets
import os
from datetime import datetime, timedelta, timezone
from functools import wraps
from dotenv import load_dotenv
from models.database import (
    store_auth_token,
    get_auth_token,
    delete_auth_token,
    cleanup_expired_auth_tokens
)
from utils.validators import validate_email, validate_username, sanitize_string

bp = Blueprint('auth', __name__)

def get_admin_password_hash():
    """Get admin password hash from .env file (reloads on each call for updates)"""
    # Reload .env to get latest values
    load_dotenv(override=True)
    hash_value = os.getenv('ADMIN_PASSWORD_HASH', None)

    if not hash_value:
        # For first-time setup, hash 'admin123'
        hash_value = hashlib.sha256('admin123'.encode()).hexdigest()
        print(f"[Auth] WARNING: Using default password. Set ADMIN_PASSWORD_HASH in .env")

    return hash_value

# Get credentials from environment variables
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')

def hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token():
    """Generate secure random token"""
    return secrets.token_urlsafe(32)

def verify_token(token):
    """Verify if token is valid and not expired"""
    token_data = get_auth_token(token)

    if not token_data:
        return None

    # Return user object in the format expected by the rest of the code
    return {
        'username': token_data['username'],
        'role': token_data['role']
    }

def token_required(f):
    """Decorator to require authentication token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'error': 'No authentication token provided'}), 401

        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]

        user = verify_token(token)
        if not user:
            return jsonify({'error': 'Invalid or expired token'}), 401

        # Add user to request context
        request.current_user = user

        return f(*args, **kwargs)

    return decorated

@bp.route("/api/auth/login", methods=["POST"])
def login():
    """Login endpoint"""
    try:
        data = request.json
        username = sanitize_string(data.get('username', ''), max_length=50).strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({
                'success': False,
                'error': 'Username và password không được để trống'
            }), 400

        # Validate username format
        is_valid, error_msg = validate_username(username)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'Username hoặc password không đúng'  # Generic error for security
            }), 401

        # Password length validation
        if len(password) > 200:
            return jsonify({
                'success': False,
                'error': 'Username hoặc password không đúng'  # Generic error for security
            }), 401

        # Verify credentials
        password_hash = hash_password(password)

        if username == ADMIN_USERNAME and password_hash == get_admin_password_hash():
            # Generate token
            token = generate_token()
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)  # Token valid for 7 days

            user = {
                'username': username,
                'role': 'admin'
            }

            # Store token in database
            if not store_auth_token(token, username, 'admin', expires_at):
                return jsonify({
                    'success': False,
                    'error': 'Không thể tạo phiên đăng nhập'
                }), 500

            return jsonify({
                'success': True,
                'token': token,
                'user': user,
                'expires_at': expires_at.isoformat()
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Username hoặc password không đúng'
            }), 401

    except Exception as e:
        print(f"[Auth] Login error: {e}")
        return jsonify({
            'success': False,
            'error': 'Lỗi server'
        }), 500

@bp.route("/api/auth/logout", methods=["POST"])
@token_required
def logout():
    """Logout endpoint"""
    try:
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]

        # Remove token from database
        delete_auth_token(token)

        return jsonify({
            'success': True,
            'message': 'Đăng xuất thành công'
        }), 200

    except Exception as e:
        print(f"[Auth] Logout error: {e}")
        return jsonify({
            'success': False,
            'error': 'Lỗi server'
        }), 500

@bp.route("/api/auth/verify", methods=["GET"])
@token_required
def verify():
    """Verify token endpoint"""
    try:
        return jsonify({
            'success': True,
            'user': request.current_user
        }), 200

    except Exception as e:
        print(f"[Auth] Verify error: {e}")
        return jsonify({
            'success': False,
            'error': 'Lỗi server'
        }), 500

@bp.route("/api/auth/change-password", methods=["POST"])
@token_required
def change_password():
    """Change password endpoint"""
    try:
        data = request.json
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')

        if not current_password or not new_password:
            return jsonify({
                'success': False,
                'error': 'Vui lòng nhập đầy đủ thông tin'
            }), 400

        if len(new_password) < 6:
            return jsonify({
                'success': False,
                'error': 'Password mới phải có ít nhất 6 ký tự'
            }), 400

        # Verify current password
        current_password_hash = hash_password(current_password)
        if current_password_hash != get_admin_password_hash():
            return jsonify({
                'success': False,
                'error': 'Password hiện tại không đúng'
            }), 401

        # Generate new password hash
        new_password_hash = hash_password(new_password)

        return jsonify({
            'success': True,
            'message': 'Đổi password thành công',
            'new_hash': new_password_hash,
            'instruction': 'Vui lòng cập nhật ADMIN_PASSWORD_HASH trong file .env với giá trị new_hash ở trên'
        }), 200

    except Exception as e:
        print(f"[Auth] Change password error: {e}")
        return jsonify({
            'success': False,
            'error': 'Lỗi server'
        }), 500

@bp.route("/api/auth/request-reset", methods=["POST"])
def request_password_reset():
    """Request password reset - sends email with reset token"""
    try:
        data = request.json
        username = sanitize_string(data.get('username', ''), max_length=50).strip()
        email = sanitize_string(data.get('email', ''), max_length=254).strip().lower()

        if not username or not email:
            return jsonify({
                'success': False,
                'error': 'Username và email không được để trống'
            }), 400

        # Validate email format
        is_valid, error_msg = validate_email(email)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': f'Email không hợp lệ: {error_msg}'
            }), 400

        # Verify username matches
        if username != ADMIN_USERNAME:
            return jsonify({
                'success': False,
                'error': 'Username không tồn tại'
            }), 404

        # Generate reset token
        from utils.email_service import generate_reset_token, send_reset_email

        reset_token = generate_reset_token(username)

        # Send email
        if send_reset_email(email, reset_token):
            return jsonify({
                'success': True,
                'message': 'Email reset password đã được gửi. Vui lòng check email của bạn.',
                'email': email
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Không thể gửi email. Vui lòng thử lại sau hoặc liên hệ admin.'
            }), 500

    except Exception as e:
        print(f"[Auth] Request reset error: {e}")
        return jsonify({
            'success': False,
            'error': 'Lỗi server'
        }), 500

@bp.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    """Reset password using token from email"""
    try:
        data = request.json
        username = sanitize_string(data.get('username', ''), max_length=50).strip()
        reset_token = sanitize_string(data.get('reset_token', ''), max_length=128).strip()
        new_password = data.get('new_password', '')

        if not username or not reset_token or not new_password:
            return jsonify({
                'success': False,
                'error': 'Vui lòng nhập đầy đủ thông tin'
            }), 400

        if len(new_password) < 6:
            return jsonify({
                'success': False,
                'error': 'Password mới phải có ít nhất 6 ký tự'
            }), 400

        if len(new_password) > 200:
            return jsonify({
                'success': False,
                'error': 'Password quá dài (tối đa 200 ký tự)'
            }), 400

        # Verify reset token
        from utils.email_service import verify_reset_token, invalidate_reset_token

        token_username = verify_reset_token(reset_token)

        if not token_username:
            return jsonify({
                'success': False,
                'error': 'Token không hợp lệ hoặc đã hết hạn'
            }), 401

        if token_username != username:
            return jsonify({
                'success': False,
                'error': 'Token không khớp với username'
            }), 401

        # Generate new password hash
        new_password_hash = hash_password(new_password)

        # Invalidate token (use once)
        invalidate_reset_token(reset_token)

        # Auto-update .env file with new password hash
        try:
            env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
            with open(env_path, 'r') as f:
                lines = f.readlines()

            with open(env_path, 'w') as f:
                for line in lines:
                    if line.startswith('ADMIN_PASSWORD_HASH='):
                        f.write(f'ADMIN_PASSWORD_HASH={new_password_hash}\n')
                    else:
                        f.write(line)

            print(f"[Auth] Password hash updated successfully in .env file")

            return jsonify({
                'success': True,
                'message': 'Password đã được reset thành công! Bạn có thể login ngay với password mới.'
            }), 200

        except Exception as e:
            print(f"[Auth] Failed to update .env file: {e}")
            return jsonify({
                'success': True,
                'message': 'Password đã được reset nhưng không thể tự động cập nhật file .env. Vui lòng liên hệ admin.',
                'new_hash': new_password_hash
            }), 200

    except Exception as e:
        print(f"[Auth] Reset password error: {e}")
        return jsonify({
            'success': False,
            'error': 'Lỗi server'
        }), 500

# Cleanup expired tokens periodically (can be called by scheduler)
def cleanup_expired_tokens():
    """Remove expired tokens from database"""
    return cleanup_expired_auth_tokens()
