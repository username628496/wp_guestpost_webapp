"""
Pytest configuration and fixtures
Provides common test utilities and fixtures for all tests
"""
import pytest
import tempfile
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app as flask_app
from models.database import init_db, DB_PATH


@pytest.fixture
def app():
    """Create Flask app for testing"""
    flask_app.config.update({
        'TESTING': True,
        'DEBUG': False,
    })

    yield flask_app


@pytest.fixture
def client(app):
    """Create Flask test client"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create Flask CLI test runner"""
    return app.test_cli_runner()


@pytest.fixture(scope='function')
def temp_db():
    """
    Create a temporary database for testing
    Automatically cleaned up after test
    """
    # Create temporary database file
    db_fd, db_path = tempfile.mkstemp(suffix='.db')

    # Temporarily replace DB_PATH
    import models.database as db_module
    original_db_path = db_module.DB_PATH
    db_module.DB_PATH = db_path

    # Also update in all imported modules
    import models.auth_tokens
    import models.check_history
    import models.wp_sites
    import models.wp_edit_history
    import models.wp_editor_sessions
    import models.wp_outgoing_urls

    for module in [models.auth_tokens, models.check_history, models.wp_sites,
                   models.wp_edit_history, models.wp_editor_sessions, models.wp_outgoing_urls]:
        module.DB_PATH = db_path

    # Initialize database
    init_db()

    yield db_path

    # Cleanup: restore original path and delete temp file
    db_module.DB_PATH = original_db_path
    for module in [models.auth_tokens, models.check_history, models.wp_sites,
                   models.wp_edit_history, models.wp_editor_sessions, models.wp_outgoing_urls]:
        module.DB_PATH = original_db_path

    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def sample_wp_site():
    """Sample WordPress site data for testing"""
    return {
        'name': 'Test Site',
        'site_url': 'https://test.example.com',
        'username': 'testuser',
        'app_password': 'test_app_password_1234',
        'wordpress_password': 'testpass123',
        'wordpress_url': 'https://test.example.com/wp-admin'
    }


@pytest.fixture
def sample_post():
    """Sample WordPress post data for testing"""
    return {
        'id': 123,
        'url': 'https://test.example.com/sample-post',
        'title': 'Sample Test Post',
        'content': '<p>This is a test post with <a href="https://example.com">a link</a>.</p>',
        'excerpt': 'Test excerpt',
        'status': 'publish',
        'categories': [{'id': 1, 'name': 'Test Category'}],
        'featured_image': None,
        'seo_title': 'Sample Test Post SEO',
        'seo_description': 'Test description',
        'date_modified': '2025-01-01T10:00:00',
        'author_id': 1
    }


@pytest.fixture
def sample_session_data():
    """Sample editor session data for testing"""
    return {
        'session_id': 'test-session-123',
        'wp_site_id': 1,
        'domain': 'test.example.com',
        'session_name': 'Test Session',
        'posts': [
            {
                'id': 1,
                'url': 'https://test.example.com/post-1',
                'title': 'Post 1',
                'status': 'publish',
                'date_modified': '2025-01-01T10:00:00'
            },
            {
                'id': 2,
                'url': 'https://test.example.com/post-2',
                'title': 'Post 2',
                'status': 'publish',
                'date_modified': '2025-01-01T11:00:00'
            }
        ]
    }


@pytest.fixture
def auth_token(client, temp_db):
    """
    Create authenticated user and return auth token
    Requires client and temp_db fixtures
    """
    # This would require setting up admin credentials in .env for testing
    # For now, return a mock token
    return 'test_auth_token_123'


# Helper functions for tests
def assert_json_response(response, status_code=200):
    """Assert response is JSON with expected status code"""
    assert response.status_code == status_code
    assert response.is_json
    return response.get_json()


def assert_error_response(response, status_code, error_message=None):
    """Assert response is an error with expected status code"""
    assert response.status_code == status_code
    data = response.get_json()
    assert 'error' in data
    if error_message:
        assert error_message in data['error']
    return data
