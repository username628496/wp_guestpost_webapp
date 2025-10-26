"""
Unit tests for WordPress Sites model
Tests CRUD operations for wp_sites table
"""
import pytest
from models.wp_sites import (
    add_wp_site,
    get_all_wp_sites,
    get_wp_site_by_id,
    get_active_wp_site,
    set_active_wp_site,
    update_wp_site,
    delete_wp_site
)


class TestWPSitesModel:
    """Test suite for wp_sites model"""

    def test_add_wp_site(self, temp_db, sample_wp_site):
        """Test adding a new WordPress site"""
        site_id = add_wp_site(**sample_wp_site)

        assert site_id is not None
        assert isinstance(site_id, int)
        assert site_id > 0

    def test_get_all_wp_sites_empty(self, temp_db):
        """Test getting all sites when database is empty"""
        sites = get_all_wp_sites()

        assert sites == []

    def test_get_all_wp_sites(self, temp_db, sample_wp_site):
        """Test getting all WordPress sites"""
        # Add test site
        site_id = add_wp_site(**sample_wp_site)

        # Get all sites
        sites = get_all_wp_sites()

        assert len(sites) == 1
        assert sites[0]['id'] == site_id
        assert sites[0]['name'] == sample_wp_site['name']
        assert sites[0]['site_url'] == sample_wp_site['site_url']
        assert sites[0]['is_active'] == True  # First site is auto-active

    def test_get_wp_site_by_id(self, temp_db, sample_wp_site):
        """Test getting a site by ID"""
        site_id = add_wp_site(**sample_wp_site)

        site = get_wp_site_by_id(site_id)

        assert site is not None
        assert site['id'] == site_id
        assert site['name'] == sample_wp_site['name']
        assert site['username'] == sample_wp_site['username']

    def test_get_wp_site_by_id_not_found(self, temp_db):
        """Test getting non-existent site"""
        site = get_wp_site_by_id(999)

        assert site is None

    def test_get_active_wp_site(self, temp_db, sample_wp_site):
        """Test getting the active site"""
        site_id = add_wp_site(**sample_wp_site)

        active_site = get_active_wp_site()

        assert active_site is not None
        assert active_site['id'] == site_id
        assert active_site['is_active'] == True

    def test_get_active_wp_site_none(self, temp_db):
        """Test getting active site when none exists"""
        active_site = get_active_wp_site()

        assert active_site is None

    def test_set_active_wp_site(self, temp_db, sample_wp_site):
        """Test setting a site as active"""
        # Add two sites
        site1_id = add_wp_site(**sample_wp_site)
        sample_wp_site['name'] = 'Test Site 2'
        sample_wp_site['site_url'] = 'https://test2.example.com'
        site2_id = add_wp_site(**sample_wp_site)

        # Site 1 should be active (first site)
        assert get_active_wp_site()['id'] == site1_id

        # Set site 2 as active
        success = set_active_wp_site(site2_id)

        assert success == True
        assert get_active_wp_site()['id'] == site2_id

        # Verify site 1 is no longer active
        site1 = get_wp_site_by_id(site1_id)
        assert site1['is_active'] == False

    def test_update_wp_site(self, temp_db, sample_wp_site):
        """Test updating a WordPress site"""
        site_id = add_wp_site(**sample_wp_site)

        # Update site
        success = update_wp_site(
            site_id,
            name='Updated Name',
            site_url='https://updated.example.com'
        )

        assert success == True

        # Verify update
        site = get_wp_site_by_id(site_id)
        assert site['name'] == 'Updated Name'
        assert site['site_url'] == 'https://updated.example.com'
        # Other fields should remain unchanged
        assert site['username'] == sample_wp_site['username']

    def test_update_wp_site_not_found(self, temp_db):
        """Test updating non-existent site"""
        success = update_wp_site(999, name='Does Not Exist')

        assert success == False

    def test_update_wp_site_no_fields(self, temp_db, sample_wp_site):
        """Test updating with no fields provided"""
        site_id = add_wp_site(**sample_wp_site)

        success = update_wp_site(site_id)

        assert success == False

    def test_delete_wp_site(self, temp_db, sample_wp_site):
        """Test deleting a WordPress site"""
        site_id = add_wp_site(**sample_wp_site)

        success = delete_wp_site(site_id)

        assert success == True
        assert get_wp_site_by_id(site_id) is None

    def test_delete_active_site_promotes_next(self, temp_db, sample_wp_site):
        """Test deleting active site promotes next site"""
        # Add two sites
        site1_id = add_wp_site(**sample_wp_site)
        sample_wp_site['name'] = 'Test Site 2'
        sample_wp_site['site_url'] = 'https://test2.example.com'
        site2_id = add_wp_site(**sample_wp_site)

        # Delete active site (site 1)
        delete_wp_site(site1_id)

        # Site 2 should now be active
        active_site = get_active_wp_site()
        assert active_site is not None
        assert active_site['id'] == site2_id

    def test_delete_wp_site_not_found(self, temp_db):
        """Test deleting non-existent site"""
        success = delete_wp_site(999)

        assert success == False

    def test_first_site_is_auto_active(self, temp_db, sample_wp_site):
        """Test that first site added is automatically active"""
        site_id = add_wp_site(**sample_wp_site)

        site = get_wp_site_by_id(site_id)

        assert site['is_active'] == True

    def test_second_site_is_not_active(self, temp_db, sample_wp_site):
        """Test that second site added is not active"""
        add_wp_site(**sample_wp_site)

        sample_wp_site['name'] = 'Second Site'
        sample_wp_site['site_url'] = 'https://second.example.com'
        site2_id = add_wp_site(**sample_wp_site)

        site2 = get_wp_site_by_id(site2_id)

        assert site2['is_active'] == False
