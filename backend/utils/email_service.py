"""
Email Service for sending password reset emails
"""
import smtplib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
import os

# Gmail configuration
GMAIL_USER = os.getenv('GMAIL_USER', 'hoangphihongchoibet@gmail.com')
GMAIL_APP_PASSWORD = os.getenv('GMAIL_APP_PASSWORD', '')  # Must be set in .env

# In-memory storage for reset tokens (for production, use Redis or database)
reset_tokens = {}

def generate_reset_token(username):
    """Generate a secure reset token"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)  # Token valid for 1 hour

    reset_tokens[token] = {
        'username': username,
        'expires_at': expires_at,
        'created_at': datetime.now(timezone.utc)
    }

    return token

def verify_reset_token(token):
    """Verify if reset token is valid and not expired"""
    if token not in reset_tokens:
        return None

    token_data = reset_tokens[token]
    expires_at = token_data['expires_at']

    if datetime.now(timezone.utc) > expires_at:
        # Token expired, remove it
        del reset_tokens[token]
        return None

    return token_data['username']

def invalidate_reset_token(token):
    """Invalidate a reset token after use"""
    if token in reset_tokens:
        del reset_tokens[token]

def send_reset_email(to_email, reset_token):
    """
    Send password reset email via Gmail SMTP

    Args:
        to_email: Recipient email address
        reset_token: Reset token to include in email

    Returns:
        True if sent successfully, False otherwise
    """
    if not GMAIL_APP_PASSWORD:
        print("[Email] ERROR: GMAIL_APP_PASSWORD not set in .env")
        return False

    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Guest Post Tool - Password Reset Request'
        msg['From'] = GMAIL_USER
        msg['To'] = to_email

        # Create HTML content
        html = f"""
        <html>
          <head>
            <style>
              body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }}
              .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
              }}
              .content {{
                background-color: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }}
              .header {{
                text-align: center;
                color: #2563eb;
                margin-bottom: 30px;
              }}
              .token-box {{
                background-color: #f3f4f6;
                padding: 15px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 18px;
                text-align: center;
                margin: 20px 0;
                word-break: break-all;
              }}
              .warning {{
                color: #dc2626;
                font-size: 14px;
                margin-top: 20px;
              }}
              .footer {{
                text-align: center;
                margin-top: 30px;
                font-size: 12px;
                color: #666;
              }}
            </style>
          </head>
          <body>
            <div class="container">
              <div class="content">
                <h1 class="header">🔐 Password Reset Request</h1>
                <p>Chào bạn,</p>
                <p>Chúng tôi nhận được yêu cầu reset password cho tài khoản <strong>Guest Post Tool</strong> của bạn.</p>

                <p>Đây là <strong>Reset Token</strong> của bạn:</p>
                <div class="token-box">{reset_token}</div>

                <p><strong>Hướng dẫn sử dụng:</strong></p>
                <ol>
                  <li>Mở trang đăng nhập của Guest Post Tool</li>
                  <li>Click vào "Quên mật khẩu?"</li>
                  <li>Nhập username và reset token ở trên</li>
                  <li>Tạo mật khẩu mới của bạn</li>
                </ol>

                <p class="warning">
                  ⚠️ <strong>Lưu ý:</strong><br>
                  • Token này sẽ hết hạn sau <strong>1 giờ</strong><br>
                  • Chỉ sử dụng được <strong>1 lần</strong><br>
                  • Nếu bạn không yêu cầu reset password, vui lòng bỏ qua email này
                </p>
              </div>

              <div class="footer">
                <p>© 2025 Guest Post Tool. All rights reserved.</p>
                <p>Email này được gửi tự động, vui lòng không reply.</p>
              </div>
            </div>
          </body>
        </html>
        """

        # Attach HTML content
        html_part = MIMEText(html, 'html')
        msg.attach(html_part)

        # Send email via Gmail SMTP
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.send_message(msg)

        print(f"[Email] Password reset email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"[Email] Error sending email: {e}")
        return False

def cleanup_expired_tokens():
    """Remove expired reset tokens from memory"""
    now = datetime.now(timezone.utc)
    expired = [token for token, data in reset_tokens.items() if data['expires_at'] < now]
    for token in expired:
        del reset_tokens[token]
    return len(expired)
