import React, { useState, useEffect, useMemo } from "react"
import {Rocket, Search, Download, CheckCircle, XCircle, AlertCircle, Loader2, ChevronDown, ChevronRight, Trash2, FileEdit, Settings, Menu, X, Clock, LogOut, BookOpen, Home } from "lucide-react"
import { Toaster, toast } from "react-hot-toast"
import WordPressSheetEditor from "./components/WordPressSheetEditor"
import WordPressSitesPage from "./components/wordpress/WordPressSitesPage"
import WPHistoryPage from "./components/WPHistoryPageNew"
import LoginPage from "./components/LoginPage"
import GuidePage from "./components/GuidePage"
import TextHomePage from "./components/TextHomePage"
import { useApp } from "./contexts/AppContext"

const API_URL = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5050"

export default function App() {
  // Use Context for authentication and WordPress sites
  const {
    isAuthenticated,
    user: currentUser,
    wpSites,
    activeSite,
    loadWpSites,
    logout: contextLogout
  } = useApp()

  const [checkingAuth, setCheckingAuth] = useState(true)

  // Navigation state
  const [currentPage, setCurrentPage] = useState("index-checker") // index-checker, history, wp-sites, wordpress-editor, wp-history, guide, texthome
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_open')
    return saved !== null ? saved === 'true' : true
  })

  // Index checker states
  const [domains, setDomains] = useState("")
  const [processing, setProcessing] = useState(false)
  const [currentResults, setCurrentResults] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedDomains, setExpandedDomains] = useState(new Set())
  const [expandedHistory, setExpandedHistory] = useState(new Set())
  const [historyDetails, setHistoryDetails] = useState({})

  // WordPress states
  const [selectedUrls, setSelectedUrls] = useState([])
  const [activeWpSite, setActiveWpSite] = useState(null) // Currently active site (local legacy)
  const [wpConfig, setWpConfig] = useState(null) // Legacy single config

  // Load cached posts from localStorage on mount
  const [cachedPostsData, setCachedPostsData] = useState(() => {
    try {
      const saved = localStorage.getItem('wp_cached_posts')
      const parsed = saved ? JSON.parse(saved) : null
      console.log('[AppWithSidebar] Loading from localStorage:', parsed?.length || 0, 'posts')
      return parsed
    } catch (error) {
      console.error('[AppWithSidebar] Error loading cached posts from localStorage:', error)
      return null
    }
  })

  // Save sidebar preference to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_open', sidebarOpen.toString())
  }, [sidebarOpen])

  // Save cached posts to localStorage whenever it changes
  useEffect(() => {
    try {
      console.log('[AppWithSidebar] cachedPostsData changed:', {
        isNull: cachedPostsData === null,
        isArray: Array.isArray(cachedPostsData),
        length: cachedPostsData?.length,
        firstUrl: cachedPostsData?.[0]?.url
      })

      if (cachedPostsData && cachedPostsData.length > 0) {
        console.log('[AppWithSidebar] Saving to localStorage:', cachedPostsData.length, 'posts')
        localStorage.setItem('wp_cached_posts', JSON.stringify(cachedPostsData))
      } else if (cachedPostsData === null) {
        // Only remove if explicitly set to null (not just empty array)
        console.log('[AppWithSidebar] Removing from localStorage (explicitly set to null)')
        localStorage.removeItem('wp_cached_posts')
      } else {
        console.log('[AppWithSidebar] cachedPostsData is empty array - keeping localStorage unchanged')
      }
    } catch (error) {
      console.error('[AppWithSidebar] Error saving cached posts to localStorage:', error)
    }
  }, [cachedPostsData])

  // Check authentication on mount (Context handles auth verification)
  useEffect(() => {
    // Context's verifyAuth is called automatically on mount
    // Just need to mark checking complete
    setCheckingAuth(false)
  }, [])

  // Handle login success (Context already handles state, just for compatibility)
  const handleLoginSuccess = (user, token) => {
    // Context already updated state through login()
    // This callback is just for parent component compatibility
    console.log('[AppWithSidebar] Login success:', user.username)
  }

  // Handle logout (uses Context)
  const handleLogout = async () => {
    await contextLogout()
    toast.success('Đã đăng xuất')
  }

  // Load WordPress sites on mount (Context handles the actual loading)
  useEffect(() => {
    if (isAuthenticated) {
      loadWpSites()
    }
  }, [isAuthenticated, loadWpSites])

  // Sync active site from Context to local state (for legacy compatibility)
  useEffect(() => {
    if (activeSite) {
      setActiveWpSite(activeSite)
      setWpConfig({
        id: activeSite.id,
        site_url: activeSite.site_url,
        username: activeSite.username,
        app_password: activeSite.app_password
      })
    }
  }, [activeSite])

  // Load history on mount
  useEffect(() => {
    if (currentPage === "history") {
      loadHistory()
    }
  }, [currentPage])

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/domain-checks?limit=50`)
      const data = await res.json()
      setHistoryData(data.domain_checks || [])
    } catch (error) {
      console.error("Failed to load history:", error)
    }
  }

  // Clear all history
  const handleClearHistory = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử? Hành động này không thể hoàn tác.")) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/clear-history`, {
        method: "DELETE"
      })

      if (res.ok) {
        toast.success("Đã xóa toàn bộ lịch sử")
        setHistoryData([])
        setHistoryDetails({})
        setExpandedHistory(new Set())
      } else {
        toast.error("Không thể xóa lịch sử")
      }
    } catch (error) {
      console.error("Failed to clear history:", error)
      toast.error("Lỗi khi xóa lịch sử")
    }
  }

  // Toggle domain expansion in results
  const toggleDomain = (domain) => {
    setExpandedDomains(prev => {
      const newSet = new Set(prev)
      if (newSet.has(domain)) {
        newSet.delete(domain)
      } else {
        newSet.add(domain)
      }
      return newSet
    })
  }

  // Toggle history item expansion and fetch details if needed
  const toggleHistory = async (historyId) => {
    setExpandedHistory(prev => {
      const newSet = new Set(prev)
      if (newSet.has(historyId)) {
        newSet.delete(historyId)
      } else {
        newSet.add(historyId)
      }
      return newSet
    })

    // Fetch details if not already loaded
    if (!historyDetails[historyId]) {
      try {
        const res = await fetch(`${API_URL}/api/domain-checks/${historyId}`)
        const data = await res.json()
        setHistoryDetails(prev => ({
          ...prev,
          [historyId]: data.urls || []
        }))
      } catch (error) {
        console.error(`Failed to load details for check ${historyId}:`, error)
      }
    }
  }

  // Process single domain
  const handleProcess = async () => {
    const domain = domains.trim()

    if (domain.length === 0) {
      toast.error("Vui lòng nhập domain")
      return
    }

    setProcessing(true)
    setCurrentResults([])

    try {
      // Step 1: Fetch sitemap
      toast.loading("Đang lấy sitemap...", { id: 'fetch' })

      const res = await fetch(`${API_URL}/api/fetch-sitemap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, max_urls: 10000 })
      })
      const data = await res.json()

      let allUrls = []
      if (data.urls && data.urls.length > 0) {
        allUrls = data.urls
      } else {
        // Fallback to homepage
        const homepage = domain.startsWith("http") ? domain : `https://${domain}`
        allUrls.push(homepage)
      }

      toast.success(`Tìm thấy ${allUrls.length} URLs`, { id: 'fetch' })

      // Step 2: Check index status
      toast.loading(`Đang kiểm tra ${allUrls.length} URLs...`, { id: 'check' })

      const checkRes = await fetch(`${API_URL}/api/check-index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: allUrls })
      })

      const checkData = await checkRes.json()

      // Flatten results
      let results = []
      if (checkData.domain_groups) {
        Object.values(checkData.domain_groups).forEach(group => {
          results = results.concat(group)
        })
      }

      setCurrentResults(results)
      toast.success(`Hoàn thành ${results.length} URLs`, { id: 'check' })

      // Reload history
      loadHistory()

    } catch (error) {
      toast.error("Lỗi khi xử lý", { id: 'check' })
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  // Export current results
  const handleExport = async (filter) => {
    if (currentResults.length === 0) {
      toast.error("Chưa có dữ liệu để export")
      return
    }

    // Get first check ID from history
    if (historyData.length > 0) {
      const checkId = historyData[0].id
      window.open(`${API_URL}/api/export/${checkId}?filter=${filter}`, '_blank')
      toast.success(`Đang tải file ${filter}...`)
    }
  }

  // Group results by domain
  const groupedResults = useMemo(() => {
    const groups = {}
    currentResults.forEach(result => {
      try {
        const url = new URL(result.url)
        const domain = url.hostname
        if (!groups[domain]) {
          groups[domain] = []
        }
        groups[domain].push(result)
      } catch {
        // If URL parsing fails, use a fallback
        if (!groups['other']) {
          groups['other'] = []
        }
        groups['other'].push(result)
      }
    })
    return groups
  }, [currentResults])

  // Filtered results by domain with stats
  const filteredGroupedResults = useMemo(() => {
    const filtered = {}
    Object.entries(groupedResults).forEach(([domain, results]) => {
      let filteredUrls = results
      if (statusFilter === "indexed") {
        filteredUrls = results.filter(r => r.status?.includes("Indexed ✅"))
      } else if (statusFilter === "not_indexed") {
        filteredUrls = results.filter(r => r.status?.includes("Not Indexed ❌"))
      } else if (statusFilter === "error") {
        filteredUrls = results.filter(r => r.status?.includes("Error"))
      }

      if (filteredUrls.length > 0) {
        filtered[domain] = {
          urls: filteredUrls,
          total: results.length,
          indexed: results.filter(r => r.status?.includes("Indexed ✅")).length,
          notIndexed: results.filter(r => r.status?.includes("Not Indexed ❌")).length,
          errors: results.filter(r => r.status?.includes("Error")).length
        }
      }
    })
    return filtered
  }, [groupedResults, statusFilter])

  // History (can add filters later)
  const filteredHistory = historyData

  // Stats
  const stats = useMemo(() => {
    const indexed = currentResults.filter(r => r.status?.includes("Indexed ✅")).length
    const notIndexed = currentResults.filter(r => r.status?.includes("Not Indexed ❌")).length
    const errors = currentResults.filter(r => r.status?.includes("Error")).length

    return {
      total: currentResults.length,
      indexed,
      notIndexed,
      errors
    }
  }, [currentResults])

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra xác thực...</p>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Logo & Toggle */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">GuestPost SEO1</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">
              {!sidebarOpen ? "" : "Index Checker"}
            </div>
            <NavItem
              icon={<Search className="w-5 h-5" />}
              label="Index Checker"
              active={currentPage === "index-checker"}
              onClick={() => setCurrentPage("index-checker")}
              collapsed={!sidebarOpen}
            />
            <NavItem
              icon={<Clock className="w-5 h-5" />}
              label="Lịch Sử"
              active={currentPage === "history"}
              onClick={() => setCurrentPage("history")}
              collapsed={!sidebarOpen}
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">
              {!sidebarOpen ? "" : "WordPress"}
            </div>
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="My WordPress Sites"
              active={currentPage === "wp-sites"}
              onClick={() => setCurrentPage("wp-sites")}
              collapsed={!sidebarOpen}
            />
            <NavItem
              icon={<FileEdit className="w-5 h-5" />}
              label="WordPress Editor"
              active={currentPage === "wordpress-editor"}
              onClick={() => setCurrentPage("wordpress-editor")}
              collapsed={!sidebarOpen}
            />
            <NavItem
              icon={<Clock className="w-5 h-5" />}
              label="WP History"
              active={currentPage === "wp-history"}
              onClick={() => setCurrentPage("wp-history")}
              collapsed={!sidebarOpen}
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">
              {!sidebarOpen ? "" : "Tools"}
            </div>
            <NavItem
              icon={<Home className="w-5 h-5" />}
              label="TextHome"
              active={currentPage === "texthome"}
              onClick={() => setCurrentPage("texthome")}
              collapsed={!sidebarOpen}
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">
              {!sidebarOpen ? "" : "Support"}
            </div>
            <NavItem
              icon={<BookOpen className="w-5 h-5" />}
              label="Hướng Dẫn"
              active={currentPage === "guide"}
              onClick={() => setCurrentPage("guide")}
              collapsed={!sidebarOpen}
            />
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-200">
          {sidebarOpen ? (
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {currentUser?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentUser?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{currentUser?.role || 'Admin'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-4 flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-4 py-3 text-xs text-center text-gray-500">
            Version 1.0.0 - Hello World © 2025
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {currentPage === "index-checker" && (
          <IndexCheckerPage
            domains={domains}
            setDomains={setDomains}
            processing={processing}
            handleProcess={handleProcess}
            currentResults={currentResults}
            stats={stats}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            filteredGroupedResults={filteredGroupedResults}
            expandedDomains={expandedDomains}
            toggleDomain={toggleDomain}
            handleExport={handleExport}
            onOpenWordPressEditor={(urls) => {
              setSelectedUrls(urls)
              setCurrentPage("wordpress-editor")
            }}
          />
        )}

        {currentPage === "history" && (
          <HistoryPage
            historyData={historyData}
            loadHistory={loadHistory}
            handleClearHistory={handleClearHistory}
            filteredHistory={filteredHistory}
            expandedHistory={expandedHistory}
            toggleHistory={toggleHistory}
            historyDetails={historyDetails}
          />
        )}

        {currentPage === "wp-sites" && (
          <WordPressSitesPage
            setWpConfig={setWpConfig}
          />
        )}

        {currentPage === "wordpress-editor" && (
          <WordPressEditorPage
            selectedUrls={selectedUrls}
            wpConfig={wpConfig}
            cachedPostsData={cachedPostsData}
            setCachedPostsData={setCachedPostsData}
          />
        )}

        {currentPage === "wp-history" && (
          <WPHistoryPage
            setCachedPostsData={setCachedPostsData}
            setCurrentPage={setCurrentPage}
            setSelectedUrls={setSelectedUrls}
            reloadWpSites={loadWpSites}
          />
        )}

        {currentPage === "guide" && <GuidePage />}

        {currentPage === "texthome" && <TextHomePage />}
      </main>

      <Toaster position="top-center" />
    </div>
  )
}

// Navigation Item Component
function NavItem({ icon, label, active, onClick, collapsed, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <span className={active ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left font-medium text-sm">{label}</span>
          {badge && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  )
}

// Index Checker Page Component (Combined Form + Results)
function IndexCheckerPage({
  domains,
  setDomains,
  processing,
  handleProcess,
  currentResults,
  stats,
  statusFilter,
  setStatusFilter,
  filteredGroupedResults,
  expandedDomains,
  toggleDomain,
  handleExport,
  onOpenWordPressEditor
}) {
  const [selectedUrls, setSelectedUrls] = useState(new Set())

  // Get indexed URLs
  const indexedResults = useMemo(() => {
    return currentResults.filter(r => r.status?.includes("Indexed ✅"))
  }, [currentResults])

  // Toggle select URL
  const toggleSelectUrl = (url) => {
    setSelectedUrls(prev => {
      const newSet = new Set(prev)
      if (newSet.has(url)) {
        newSet.delete(url)
      } else {
        newSet.add(url)
      }
      return newSet
    })
  }

  // Select all indexed
  const selectAllIndexed = () => {
    const allIndexed = indexedResults.map(r => r.url)
    setSelectedUrls(new Set(allIndexed))
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedUrls(new Set())
  }

  // Handle open WordPress Editor
  const handleOpenWP = () => {
    if (selectedUrls.size === 0) {
      toast.error("Vui lòng chọn ít nhất 1 URL")
      return
    }
    onOpenWordPressEditor(Array.from(selectedUrls))
  }
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Index Checker</h1>
              <p className="text-sm text-gray-500 mt-1">Kiểm tra trạng thái index của URLs trên Google Search</p>
            </div>

            {currentResults.length > 0 && (
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.indexed}</div>
                  <div className="text-gray-500">Indexed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.notIndexed}</div>
                  <div className="text-gray-500">Not Indexed</div>
                </div>
                {stats.errors > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                    <div className="text-gray-500">Errors</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Form Section */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              placeholder="Nhập domain (VD: k9win.com.vc)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={processing}
            />
            <button
              onClick={handleProcess}
              disabled={processing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Kiểm Tra
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          {currentResults.length > 0 && (
            <div className="col-span-12 lg:col-span-3 space-y-4">
              {/* WordPress Editor Card */}
              {indexedResults.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileEdit className="w-4 h-4" />
                    WordPress Editor
                  </h3>

                  <div className="space-y-3">
                    <div className="text-xs text-gray-600">
                      Có <span className="font-semibold text-blue-600">{indexedResults.length}</span> URLs đã indexed
                    </div>

                    {selectedUrls.size > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm font-medium text-blue-900">
                          Đã chọn: {selectedUrls.size} URLs
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <button
                        onClick={selectAllIndexed}
                        className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Chọn tất cả Indexed
                      </button>

                      {selectedUrls.size > 0 && (
                        <button
                          onClick={clearSelection}
                          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Bỏ chọn tất cả
                        </button>
                      )}

                      <button
                        onClick={handleOpenWP}
                        disabled={selectedUrls.size === 0}
                        className="w-full px-3 py-2.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <FileEdit className="w-4 h-4" />
                        Mở WordPress Editor
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Export Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Kết Quả
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleExport('indexed')}
                    className="w-full px-3 py-2 text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Export Indexed ({stats.indexed})
                  </button>
                  <button
                    onClick={() => handleExport('not_indexed')}
                    className="w-full px-3 py-2 text-sm bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    Export Not Indexed ({stats.notIndexed})
                  </button>
                  <button
                    onClick={() => handleExport('all')}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Export All ({stats.total})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className={`${currentResults.length > 0 ? 'col-span-12 lg:col-span-9' : 'col-span-12'}`}>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">URLs Đã Kiểm Tra</h2>

                {currentResults.length > 0 && (
                  <div className="flex gap-2">
                    <FilterButton
                      active={statusFilter === "all"}
                      onClick={() => setStatusFilter("all")}
                      label="All"
                      count={stats.total}
                    />
                    <FilterButton
                      active={statusFilter === "indexed"}
                      onClick={() => setStatusFilter("indexed")}
                      label="Indexed"
                      count={stats.indexed}
                      color="green"
                    />
                    <FilterButton
                      active={statusFilter === "not_indexed"}
                      onClick={() => setStatusFilter("not_indexed")}
                      label="Not Indexed"
                      count={stats.notIndexed}
                      color="amber"
                    />
                    {stats.errors > 0 && (
                      <FilterButton
                        active={statusFilter === "error"}
                        onClick={() => setStatusFilter("error")}
                        label="Error"
                        count={stats.errors}
                        color="red"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: '700px' }}>
                {currentResults.length === 0 ? (
                  <EmptyState
                    icon={<Search className="w-12 h-12 text-gray-400" />}
                    title="Chưa có kết quả"
                    description="Nhập domains ở form bên trên và nhấn 'Bắt Đầu Kiểm Tra'"
                  />
                ) : (
                  <div className="divide-y divide-gray-200">
                    {Object.entries(filteredGroupedResults).map(([domain, data]) => (
                      <div key={domain} className="border-b border-gray-100">
                        <button
                          onClick={() => toggleDomain(domain)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-blue-500">
                              {expandedDomains.has(domain) ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{domain}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{data.total} URLs</div>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-green-600 font-semibold">{data.indexed}</div>
                              <div className="text-xs text-gray-500">Indexed</div>
                            </div>
                            <div className="text-center">
                              <div className="text-amber-600 font-semibold">{data.notIndexed}</div>
                              <div className="text-xs text-gray-500">Not Indexed</div>
                            </div>
                            {data.errors > 0 && (
                              <div className="text-center">
                                <div className="text-red-600 font-semibold">{data.errors}</div>
                                <div className="text-xs text-gray-500">Errors</div>
                              </div>
                            )}
                          </div>
                        </button>

                        {expandedDomains.has(domain) && (
                          <div className="bg-gray-50">
                            <table className="w-full">
                              <thead className="bg-gray-100 border-y border-gray-200">
                                <tr>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">
                                    {indexedResults.length > 0 && (
                                      <input
                                        type="checkbox"
                                        className="rounded border-gray-300"
                                        checked={data.urls.every(r => r.status?.includes("Indexed ✅") ? selectedUrls.has(r.url) : true)}
                                        onChange={(e) => {
                                          const indexedInGroup = data.urls.filter(r => r.status?.includes("Indexed ✅"))
                                          if (e.target.checked) {
                                            indexedInGroup.forEach(r => toggleSelectUrl(r.url))
                                          } else {
                                            indexedInGroup.forEach(r => {
                                              if (selectedUrls.has(r.url)) toggleSelectUrl(r.url)
                                            })
                                          }
                                        }}
                                        title="Chọn tất cả indexed trong group này"
                                      />
                                    )}
                                  </th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {data.urls.map((result, idx) => {
                                  const isIndexed = result.status?.includes("Indexed ✅")
                                  const isSelected = selectedUrls.has(result.url)

                                  return (
                                    <tr key={idx} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                                      <td className="px-6 py-2">
                                        {isIndexed && (
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectUrl(result.url)}
                                            className="rounded border-gray-300"
                                          />
                                        )}
                                      </td>
                                      <td className="px-6 py-2 text-sm">
                                        <a href={result.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block max-w-md">
                                          {result.url}
                                        </a>
                                      </td>
                                      <td className="px-6 py-2">
                                        <StatusBadge status={result.status} />
                                      </td>
                                      <td className="px-6 py-2 text-sm text-gray-500">
                                        {new Date(result.checked_at).toLocaleString('vi-VN')}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// History Page Component
function HistoryPage({
  historyData,
  loadHistory,
  handleClearHistory,
  filteredHistory,
  expandedHistory,
  toggleHistory,
  historyDetails
}) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lịch Sử Kiểm Tra</h1>
              <p className="text-sm text-gray-500 mt-1">Xem lại các lần kiểm tra trước đó</p>
            </div>
            <div className="flex gap-2">
              {historyData.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa tất cả
                </button>
              )}
              <button
                onClick={loadHistory}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Làm mới
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-y-auto" style={{ maxHeight: '700px' }}>
            {historyData.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-12 h-12 text-gray-400" />}
                title="Chưa có lịch sử"
                description="Lịch sử kiểm tra sẽ hiển thị ở đây sau khi bạn thực hiện kiểm tra"
              />
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredHistory.map((item) => (
                  <div key={item.id} className="border-b border-gray-100">
                    <button
                      onClick={() => toggleHistory(item.id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-blue-500">
                          {expandedHistory.has(item.id) ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{item.domain}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(item.created_at).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-gray-900 font-semibold">{item.total_urls}</div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-600 font-semibold">{item.indexed_count}</div>
                          <div className="text-xs text-gray-500">Indexed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-amber-600 font-semibold">{item.not_indexed_count}</div>
                          <div className="text-xs text-gray-500">Not Indexed</div>
                        </div>
                      </div>
                    </button>

                    {expandedHistory.has(item.id) && (
                      <div className="bg-gray-50">
                        {historyDetails[item.id] ? (
                          <table className="w-full">
                            <thead className="bg-gray-100 border-y border-gray-200">
                              <tr>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {historyDetails[item.id].map((url, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-6 py-2 text-sm">
                                    <a href={url.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block max-w-md">
                                      {url.url}
                                    </a>
                                  </td>
                                  <td className="px-6 py-2">
                                    <StatusBadge status={url.status} />
                                  </td>
                                  <td className="px-6 py-2 text-sm text-gray-500">
                                    {new Date(url.checked_at).toLocaleString('vi-VN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="px-6 py-4 text-center text-sm text-gray-500">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// WordPress Editor Page
function WordPressEditorPage({ selectedUrls, wpConfig, cachedPostsData, setCachedPostsData }) {
  // Load WordPress config from localStorage
  useEffect(() => {
    if (!wpConfig) {
      const siteUrl = localStorage.getItem('wp_site_url')
      const username = localStorage.getItem('wp_username')
      const appPassword = localStorage.getItem('wp_app_password')

      if (siteUrl && username && appPassword) {
        // wpConfig will be passed from parent
      }
    }
  }, [wpConfig])

  const hasConfig = wpConfig && wpConfig.site_url && wpConfig.username && wpConfig.app_password

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-full px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">WordPress Sheet Editor</h1>
          <p className="text-sm text-gray-500 mt-1">Chỉnh sửa hàng loạt bài viết WordPress theo dạng spreadsheet</p>
        </div>
      </header>

      <div className="flex-1">
        {!hasConfig ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa cấu hình WordPress</h3>
              <p className="text-gray-500 mb-6">
                Vui lòng vào Settings để cấu hình WordPress REST API trước khi sử dụng tính năng này.
              </p>
            </div>
          </div>
        ) : (
          <WordPressSheetEditor
            selectedUrls={selectedUrls}
            wpConfig={wpConfig}
            cachedData={cachedPostsData}
            setCachedData={setCachedPostsData}
          />
        )}
      </div>
    </div>
  )
}

// WordPress Sites Page - Now using component from /components/wordpress/WordPressSitesPage.jsx

// Helper Components
function FilterButton({ active, onClick, label, count, color = "gray" }) {
  const colors = {
    gray: active ? 'bg-gray-100 text-gray-900 border-gray-300' : 'bg-white text-gray-600 border-gray-200',
    green: active ? 'bg-green-100 text-green-900 border-green-300' : 'bg-white text-green-600 border-green-200',
    amber: active ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white text-amber-600 border-amber-200',
    red: active ? 'bg-red-100 text-red-900 border-red-300' : 'bg-white text-red-600 border-red-200',
  }

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium border rounded-lg hover:opacity-80 transition-colors ${colors[color]}`}
    >
      {label} ({count})
    </button>
  )
}

function StatusBadge({ status }) {
  if (status?.includes("Indexed ✅")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
        <CheckCircle className="w-3.5 h-3.5" />
        Indexed
      </span>
    )
  }
  if (status?.includes("Not Indexed ❌")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
        <XCircle className="w-3.5 h-3.5" />
        Not Indexed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
      <AlertCircle className="w-3.5 h-3.5" />
      Error
    </span>
  )
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  )
}
