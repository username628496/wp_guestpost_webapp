import React, { useState, useEffect, useMemo } from 'react'
import { Clock, Eye, ExternalLink, FileEdit, Globe, Trash2, Search, X, ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Breadcrumbs from './Breadcrumbs'

const API_URL = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5050"

export default function WPHistoryPage({ setCachedPostsData, setCurrentPage, setSelectedUrls, reloadWpSites }) {
  const [historyList, setHistoryList] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewingSnapshot, setViewingSnapshot] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/editor-sessions?snapshots_only=true&limit=50`)
      const data = await res.json()

      // Backend already returns grouped by domain: {domain: [sessions]}
      // No need to group again, just use it directly
      setHistoryList(data.sessions || {})
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Lỗi khi load lịch sử')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadToEditor = async (session) => {
    try {
      console.log('[WPHistory] Loading snapshot:', session.session_id)
      const res = await fetch(`${API_URL}/api/editor-session/${session.session_id}`)
      const data = await res.json()

      if (data && data.posts && Array.isArray(data.posts) && data.posts.length > 0) {
        // Auto-set active WP site
        const firstPostUrl = data.posts[0]?.url
        if (firstPostUrl) {
          try {
            const domain = new URL(firstPostUrl).hostname
            const findRes = await fetch(`${API_URL}/api/wp-sites/find-by-domain`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain })
            })

            if (findRes.ok) {
              const findData = await findRes.json()
              if (findData.success && findData.site) {
                const activeRes = await fetch(`${API_URL}/api/wp-sites/${findData.site.id}/active`, {
                  method: 'PUT'
                })

                if (activeRes.ok) {
                  toast.success(`Tự động chọn WP site: ${findData.site.name}`)
                  if (reloadWpSites) {
                    await reloadWpSites()
                  }
                }
              } else {
                toast.error(`Không tìm thấy WP site cho ${domain}. Vui lòng thêm site trước!`)
              }
            }
          } catch (urlError) {
            console.error('[WPHistory] Error extracting domain:', urlError)
          }
        }

        // Clear storage and load
        sessionStorage.clear()
        sessionStorage.setItem('wp_editor_session_id', session.session_id)

        if (setSelectedUrls) {
          setSelectedUrls([])
        }

        // Set cachedPostsData and persist to localStorage
        setCachedPostsData(data.posts)
        localStorage.setItem('wp_cached_posts', JSON.stringify(data.posts))

        setCurrentPage('wordpress-editor')
        toast.success(`Đã load ${data.posts.length} bài viết từ snapshot`)
      } else {
        toast.error('Snapshot không có dữ liệu')
      }
    } catch (error) {
      console.error('[WPHistory] Error loading snapshot:', error)
      toast.error('Lỗi khi load snapshot')
    }
  }

  const handleViewDetails = async (session) => {
    try {
      const res = await fetch(`${API_URL}/api/editor-session/${session.session_id}`)
      const data = await res.json()
      setViewingSnapshot({ ...session, posts: data.posts })
    } catch (error) {
      console.error('Error loading snapshot details:', error)
      toast.error('Lỗi khi load chi tiết')
    }
  }

  const handleDeleteSnapshot = async (session, e) => {
    // Prevent triggering parent click events
    e.stopPropagation()

    // Confirm deletion
    if (!window.confirm(`Bạn có chắc muốn xóa snapshot "${session.session_name || session.domain}"?\n\nThao tác này không thể hoàn tác.`)) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/editor-session/${session.session_id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Đã xóa snapshot')
        // Reload history list
        loadHistory()
      } else {
        const error = await res.json()
        toast.error(`Lỗi khi xóa snapshot: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('[WPHistory] Error deleting snapshot:', error)
      toast.error('Lỗi khi xóa snapshot')
    }
  }

  // Filter history list based on search query (MUST be before early returns)
  const filteredHistoryList = useMemo(() => {
    if (!searchQuery.trim()) {
      return historyList
    }

    const query = searchQuery.toLowerCase()
    const filtered = {}

    Object.entries(historyList).forEach(([domain, sessions]) => {
      // Filter sessions within this domain
      const matchingSessions = sessions.filter(session => {
        return (
          domain.toLowerCase().includes(query) ||
          session.session_name.toLowerCase().includes(query) ||
          session.session_id.toLowerCase().includes(query)
        )
      })

      if (matchingSessions.length > 0) {
        filtered[domain] = matchingSessions
      }
    })

    return filtered
  }, [historyList, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Đang tải lịch sử...</p>
        </div>
      </div>
    )
  }

  if (viewingSnapshot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Breadcrumbs
              items={[
                { label: 'WP History', onClick: () => setViewingSnapshot(null) },
                { label: viewingSnapshot.session_name }
              ]}
              onNavigate={setCurrentPage}
            />
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => setViewingSnapshot(null)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to History
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{viewingSnapshot.session_name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  {viewingSnapshot.domain} • {viewingSnapshot.total_posts} bài viết
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    handleDeleteSnapshot(viewingSnapshot, e)
                    setViewingSnapshot(null)
                  }}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa
                </button>
                <button
                  onClick={() => handleLoadToEditor(viewingSnapshot)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FileEdit className="w-4 h-4" />
                  Load to Editor
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modified</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outgoing Links</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {viewingSnapshot.posts.map((post, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{post.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-md truncate" title={post.title}>
                        {post.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        post.status === 'publish' ? 'bg-green-100 text-green-800' :
                        post.status === 'draft' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {post.date_modified ? (() => {
                        const modifiedDate = new Date(post.date_modified)
                        const now = new Date()
                        const hoursDiff = (now - modifiedDate) / (1000 * 60 * 60)
                        const isRecent = hoursDiff < 24

                        const formatted = modifiedDate.toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })

                        return (
                          <span
                            className={`font-medium ${isRecent ? 'text-red-600' : 'text-gray-500'}`}
                            title={isRecent ? 'Modified gần đây (< 24h)' : ''}
                          >
                            {formatted}
                          </span>
                        )
                      })() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {post.outgoing_links && post.outgoing_links.length > 0 ? (
                        <div className="space-y-1">
                          {post.outgoing_links.slice(0, 3).map((link, linkIdx) => (
                            <div key={linkIdx} className="flex items-start gap-2">
                              <ExternalLink className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-xs break-all"
                                  title={link.url}
                                >
                                  {link.domain}
                                </a>
                                {link.anchor && (
                                  <div className="text-gray-500 text-xs truncate" title={link.anchor}>
                                    "{link.anchor}"
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {post.outgoing_links.length > 3 && (
                            <div className="text-xs text-gray-400 italic">
                              +{post.outgoing_links.length - 3} more...
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No links</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">WP History</h1>
              <p className="text-sm text-gray-500 mt-1">
                {Object.keys(historyList).length} domains • {
                  Object.values(historyList).reduce((acc, sessions) => acc + sessions.length, 0)
                } snapshots
              </p>
            </div>

            {/* Search Box */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm domain, tên snapshot..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {Object.keys(filteredHistoryList).length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có lịch sử</h3>
              <p className="text-gray-500">Lưu snapshot từ WordPress Editor để xem tại đây</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(filteredHistoryList).map(([domain, sessions]) => {
              const latestSession = sessions[0]
              return (
                <div key={domain} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                          <Globe className="w-5 h-5 text-blue-600" />
                          {domain}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {sessions.length} snapshot{sessions.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSnapshot(latestSession, e)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa snapshot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Latest:</span>
                        <span className="font-medium text-gray-900">{latestSession.session_name}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Posts:</span>
                        <span className="font-medium text-gray-900">{latestSession.total_posts}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Created:</span>
                        <span className="text-gray-500">{new Date(latestSession.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(latestSession)}
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Xem chi tiết
                      </button>
                      <button
                        onClick={() => handleLoadToEditor(latestSession)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <FileEdit className="w-4 h-4" />
                        Load
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
