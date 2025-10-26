"""
Input validation utilities for security
"""
import re
from urllib.parse import urlparse

def validate_url(url):
    """
    Validate URL format
    Returns: (is_valid: bool, error_message: str or None)
    """
    if not url or not isinstance(url, str):
        return False, "URL không được để trống"

    url = url.strip()

    # Basic length check
    if len(url) > 2048:
        return False, "URL quá dài (tối đa 2048 ký tự)"

    # Check for valid URL scheme
    if not url.startswith(('http://', 'https://')):
        return False, "URL phải bắt đầu với http:// hoặc https://"

    # Parse URL
    try:
        parsed = urlparse(url)

        # Check for valid hostname
        if not parsed.hostname:
            return False, "URL không hợp lệ - thiếu hostname"

        # Check hostname format (basic)
        hostname_pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
        if not re.match(hostname_pattern, parsed.hostname):
            return False, "Hostname không hợp lệ"

        return True, None

    except Exception as e:
        return False, f"URL không hợp lệ: {str(e)}"

def validate_domain(domain):
    """
    Validate domain format
    Returns: (is_valid: bool, error_message: str or None)
    """
    if not domain or not isinstance(domain, str):
        return False, "Domain không được để trống"

    domain = domain.strip().lower()

    # Basic length check
    if len(domain) > 253:
        return False, "Domain quá dài (tối đa 253 ký tự)"

    # Domain pattern (allows subdomains)
    domain_pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$'

    if not re.match(domain_pattern, domain):
        return False, "Domain không hợp lệ"

    return True, None

def validate_email(email):
    """
    Validate email format
    Returns: (is_valid: bool, error_message: str or None)
    """
    if not email or not isinstance(email, str):
        return False, "Email không được để trống"

    email = email.strip().lower()

    # Basic length check
    if len(email) > 254:
        return False, "Email quá dài (tối đa 254 ký tự)"

    # Email pattern (basic but covers most cases)
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not re.match(email_pattern, email):
        return False, "Email không hợp lệ"

    return True, None

def validate_username(username):
    """
    Validate username format
    Returns: (is_valid: bool, error_message: str or None)
    """
    if not username or not isinstance(username, str):
        return False, "Username không được để trống"

    username = username.strip()

    # Length check
    if len(username) < 3:
        return False, "Username phải có ít nhất 3 ký tự"

    if len(username) > 50:
        return False, "Username quá dài (tối đa 50 ký tự)"

    # Alphanumeric and underscore only
    username_pattern = r'^[a-zA-Z0-9_]+$'

    if not re.match(username_pattern, username):
        return False, "Username chỉ được chứa chữ cái, số và dấu gạch dưới"

    return True, None

def sanitize_string(text, max_length=None):
    """
    Sanitize string input - remove dangerous characters
    Returns: sanitized string
    """
    if not text or not isinstance(text, str):
        return ""

    # Strip whitespace
    text = text.strip()

    # Remove null bytes
    text = text.replace('\x00', '')

    # Limit length if specified
    if max_length and len(text) > max_length:
        text = text[:max_length]

    return text

def validate_post_id(post_id):
    """
    Validate WordPress post ID
    Returns: (is_valid: bool, error_message: str or None)
    """
    try:
        post_id_int = int(post_id)
        if post_id_int <= 0:
            return False, "Post ID phải là số nguyên dương"
        return True, None
    except (ValueError, TypeError):
        return False, "Post ID phải là số nguyên"

def validate_session_id(session_id):
    """
    Validate session ID format (UUID-like or alphanumeric)
    Returns: (is_valid: bool, error_message: str or None)
    """
    if not session_id or not isinstance(session_id, str):
        return False, "Session ID không được để trống"

    session_id = session_id.strip()

    # Check length
    if len(session_id) < 8 or len(session_id) > 128:
        return False, "Session ID không hợp lệ"

    # Alphanumeric and hyphens only
    session_pattern = r'^[a-zA-Z0-9_-]+$'

    if not re.match(session_pattern, session_id):
        return False, "Session ID chỉ được chứa chữ cái, số, gạch ngang và gạch dưới"

    return True, None
