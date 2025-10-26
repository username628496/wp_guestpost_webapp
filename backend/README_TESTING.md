# Testing Guide

## Overview

This project uses **pytest** for testing backend functionality. Tests are organized into unit tests, integration tests, and API tests.

## Setup

### 1. Install Testing Dependencies

```bash
pip install -r requirements-test.txt
```

### 2. Verify Installation

```bash
pytest --version
```

## Running Tests

### Run All Tests

```bash
pytest
```

### Run Specific Test File

```bash
pytest tests/test_models_wp_sites.py
```

### Run Specific Test Class

```bash
pytest tests/test_models_wp_sites.py::TestWPSitesModel
```

### Run Specific Test Method

```bash
pytest tests/test_models_wp_sites.py::TestWPSitesModel::test_add_wp_site
```

### Run Tests by Marker

```bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run only model tests
pytest -m models
```

### Run Tests with Coverage

```bash
pytest --cov=. --cov-report=html
```

View coverage report:
```bash
open htmlcov/index.html  # Mac
xdg-open htmlcov/index.html  # Linux
```

### Verbose Output

```bash
pytest -v
pytest -vv  # Extra verbose
```

### Stop on First Failure

```bash
pytest -x
```

### Run Last Failed Tests

```bash
pytest --lf
```

## Test Organization

```
tests/
├── __init__.py
├── conftest.py                     # Fixtures and configuration
├── test_models_wp_sites.py         # WordPress sites model tests
├── test_models_auth_tokens.py      # Auth tokens model tests
├── test_models_editor_sessions.py  # Editor sessions model tests
├── test_services_wordpress.py      # WordPress service tests
├── test_api_auth.py                # Authentication API tests
├── test_api_wp_sites.py            # WordPress sites API tests
└── test_api_editor_sessions.py     # Editor sessions API tests
```

## Test Categories

Tests are marked with categories for easy filtering:

- `@pytest.mark.unit` - Fast, isolated unit tests
- `@pytest.mark.integration` - Integration tests with database
- `@pytest.mark.api` - API endpoint tests
- `@pytest.mark.models` - Database model tests
- `@pytest.mark.services` - Service layer tests
- `@pytest.mark.slow` - Tests that take >1 second

Example:
```python
@pytest.mark.unit
@pytest.mark.models
def test_add_wp_site(temp_db, sample_wp_site):
    # Test code here
    pass
```

## Common Fixtures

Available fixtures (defined in `conftest.py`):

### Database Fixtures
- `temp_db` - Temporary SQLite database (cleaned up after test)
- `sample_wp_site` - Sample WordPress site data
- `sample_post` - Sample WordPress post data
- `sample_session_data` - Sample editor session data

### Flask Fixtures
- `app` - Flask application instance
- `client` - Flask test client for API testing
- `runner` - Flask CLI test runner

### Auth Fixtures
- `auth_token` - Mock authentication token

### Helper Functions
- `assert_json_response(response, status_code)` - Assert JSON response
- `assert_error_response(response, status_code, error_message)` - Assert error response

## Writing Tests

### Example Unit Test

```python
import pytest
from models.wp_sites import add_wp_site, get_wp_site_by_id

@pytest.mark.unit
@pytest.mark.models
def test_add_and_get_wp_site(temp_db, sample_wp_site):
    """Test adding and retrieving a WordPress site"""
    # Add site
    site_id = add_wp_site(**sample_wp_site)

    # Verify
    site = get_wp_site_by_id(site_id)
    assert site is not None
    assert site['name'] == sample_wp_site['name']
```

### Example API Test

```python
import pytest
from tests.conftest import assert_json_response

@pytest.mark.api
def test_get_wp_sites(client, temp_db):
    """Test GET /api/wp-sites endpoint"""
    response = client.get('/api/wp-sites')

    data = assert_json_response(response, 200)
    assert 'sites' in data
    assert isinstance(data['sites'], list)
```

### Example Service Test with Mocking

```python
import pytest
from unittest.mock import Mock, patch

@pytest.mark.unit
@pytest.mark.services
@patch('services.wordpress_service.requests.request')
def test_fetch_post(mock_request, wp_service):
    """Test fetching a post from WordPress API"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = [{'id': 123, 'title': 'Test'}]
    mock_request.return_value = mock_response

    post = wp_service.fetch_post_by_slug('test-post')

    assert post['id'] == 123
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install -r requirements-test.txt

    - name: Run tests
      run: pytest --cov=. --cov-report=xml

    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

## Best Practices

### 1. **Test Isolation**
- Each test should be independent
- Use `temp_db` fixture for database tests
- Don't rely on test execution order

### 2. **Test Naming**
- Test functions: `test_<what_is_tested>`
- Test classes: `Test<ComponentName>`
- Be descriptive: `test_add_wp_site_returns_valid_id`

### 3. **Arrange-Act-Assert Pattern**
```python
def test_example():
    # Arrange - Set up test data
    site_data = {'name': 'Test'}

    # Act - Perform the action
    result = add_wp_site(**site_data)

    # Assert - Verify the result
    assert result is not None
```

### 4. **Test Edge Cases**
- Test with valid data
- Test with invalid data
- Test with empty data
- Test with boundary values

### 5. **Mock External Dependencies**
- Mock HTTP requests to WordPress API
- Mock email sending
- Mock file system operations

## Troubleshooting

### Import Errors

If you get import errors, ensure:
1. You're running pytest from the `backend/` directory
2. `__init__.py` files exist in test directories
3. `sys.path` includes the backend directory

### Database Locked Errors

If tests fail with "database is locked":
1. Ensure tests use `temp_db` fixture
2. Don't share database connections between tests
3. Close connections properly

### Slow Tests

If tests are slow:
1. Run with `-x` to stop on first failure
2. Use markers to run specific test categories
3. Mock external API calls
4. Use smaller test datasets

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Pytest Best Practices](https://docs.pytest.org/en/latest/goodpractices.html)
- [Flask Testing](https://flask.palletsprojects.com/en/latest/testing/)
