/**
 * AppContext - Global Application State Management
 * Provides centralized state for authentication, WordPress sites, and app settings
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5050'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'))

  // WordPress sites state
  const [wpSites, setWpSites] = useState([])
  const [activeSite, setActiveSite] = useState(null)
  const [loadingSites, setLoadingSites] = useState(false)

  // App settings state
  const [appSettings, setAppSettings] = useState({
    theme: localStorage.getItem('theme') || 'light',
    autoSave: localStorage.getItem('autoSave') === 'true',
    autoRefreshInterval: parseInt(localStorage.getItem('autoRefreshInterval') || '0')
  })

  // Initialize authentication on mount
  useEffect(() => {
    if (authToken) {
      verifyToken()
    }
  }, [])

  /**
   * Verify authentication token
   */
  const verifyToken = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        setIsAuthenticated(true)
        setUser(data.user)
      } else {
        logout()
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      logout()
    }
  }

  /**
   * Login user
   */
  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (data.success) {
        setAuthToken(data.token)
        setUser(data.user)
        setIsAuthenticated(true)
        localStorage.setItem('auth_token', data.token)
        toast.success('Đăng nhập thành công!')
        return { success: true, user: data.user, token: data.token }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: 'Lỗi kết nối server' }
    }
  }

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      if (authToken) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setAuthToken(null)
      setUser(null)
      setIsAuthenticated(false)
      setWpSites([])
      setActiveSite(null)
      localStorage.removeItem('auth_token')
      toast.success('Đã đăng xuất')
    }
  }

  /**
   * Load WordPress sites
   */
  const loadWpSites = useCallback(async () => {
    try {
      setLoadingSites(true)
      const res = await fetch(`${API_URL}/api/wp-sites`)
      const data = await res.json()

      if (data.success) {
        setWpSites(data.sites)
        const active = data.sites.find(s => s.is_active)
        setActiveSite(active)
      }
    } catch (error) {
      console.error('Error loading WP sites:', error)
      toast.error('Không thể tải danh sách WordPress sites')
    } finally {
      setLoadingSites(false)
    }
  }, [])

  // Load WordPress sites when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadWpSites()
    }
  }, [isAuthenticated, loadWpSites])

  /**
   * Set active WordPress site
   */
  const setActiveWpSite = async (siteId) => {
    try {
      const res = await fetch(`${API_URL}/api/wp-sites/${siteId}/active`, {
        method: 'PUT'
      })

      const data = await res.json()

      if (data.success) {
        setActiveSite(data.site)
        // Update sites list
        setWpSites(prev => prev.map(site => ({
          ...site,
          is_active: site.id === siteId
        })))
        toast.success(`Đã chuyển sang site: ${data.site.name}`)
        return true
      } else {
        toast.error('Không thể chuyển site')
        return false
      }
    } catch (error) {
      console.error('Error setting active site:', error)
      toast.error('Lỗi khi chuyển site')
      return false
    }
  }

  /**
   * Add new WordPress site
   */
  const addWpSite = async (siteData) => {
    try {
      const res = await fetch(`${API_URL}/api/wp-sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteData)
      })

      const data = await res.json()

      if (data.success) {
        await loadWpSites()
        toast.success(`Đã thêm site: ${data.site.name}`)
        return { success: true, site: data.site }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: 'Lỗi kết nối server' }
    }
  }

  /**
   * Update WordPress site
   */
  const updateWpSite = async (siteId, updates) => {
    try {
      const res = await fetch(`${API_URL}/api/wp-sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const data = await res.json()

      if (data.success) {
        await loadWpSites()
        toast.success('Đã cập nhật site')
        return { success: true, site: data.site }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: 'Lỗi kết nối server' }
    }
  }

  /**
   * Delete WordPress site
   */
  const deleteWpSite = async (siteId) => {
    try {
      const res = await fetch(`${API_URL}/api/wp-sites/${siteId}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (data.success) {
        await loadWpSites()
        toast.success('Đã xóa site')
        return true
      } else {
        toast.error('Không thể xóa site')
        return false
      }
    } catch (error) {
      console.error('Error deleting site:', error)
      toast.error('Lỗi khi xóa site')
      return false
    }
  }

  /**
   * Update app settings
   */
  const updateSettings = (newSettings) => {
    const updated = { ...appSettings, ...newSettings }
    setAppSettings(updated)

    // Persist to localStorage
    Object.keys(newSettings).forEach(key => {
      localStorage.setItem(key, String(newSettings[key]))
    })
  }

  const value = {
    // Auth
    isAuthenticated,
    user,
    authToken,
    login,
    logout,

    // WordPress Sites
    wpSites,
    activeSite,
    loadingSites,
    loadWpSites,
    setActiveWpSite,
    addWpSite,
    updateWpSite,
    deleteWpSite,

    // Settings
    appSettings,
    updateSettings,

    // API URL
    API_URL
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/**
 * Custom hook to use App Context
 */
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
