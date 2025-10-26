import React, { useState, useEffect } from 'react'
import { Clock, Trash2, Eye, Download, AlertCircle, FileEdit } from 'lucide-react'
import { toast } from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5050"

export default function WPHistoryPage({ setCachedPostsData, setCurrentPage, setSelectedUrls, reloadWpSites }) {
  const [historyList, setHistoryList] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewingHistory, setViewingHistory] = useState(null)

  // Load history list
  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      // Load snapshots from new editor_sessions table
      const res = await fetch(`${API_URL}/api/editor-sessions?snapshots_only=true&limit=50`)
      const data = await res.json()
      setHistoryList(data.sessions || [])
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Lỗi khi load lịch sử')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (sessionId) => {
    if (!confirm('Bạn có chắc muốn xóa snapshot này?')) return

    try {
      const res = await fetch(`${API_URL}/api/editor-session/${sessionId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Đã xóa snapshot')
        loadHistory()
      } else {
        toast.error('Lỗi khi xóa')
      }
    } catch (error) {
      console.error('Error deleting snapshot:', error)
      toast.error('Lỗi khi xóa')
    }
  }

  const handleView = async (sessionId) => {
    try {
      const res = await fetch(`${API_URL}/api/editor-session/${sessionId}`)
      const data = await res.json()
      setViewingHistory(data)
    } catch (error) {
      console.error('Error loading snapshot detail:', error)
      toast.error('Lỗi khi load chi tiết')
    }
  }

  const handleExport = (snapshot) => {
    const dataStr = JSON.stringify(snapshot.posts, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `wp-snapshot-${snapshot.session_id}-${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleLoadToEditor = async (sessionId) => {
    try {
      console.log('[WPHistory] Loading snapshot:', sessionId)
      const res = await fetch(`${API_URL}/api/editor-session/${sessionId}`)
      const data = await res.json()
      console.log('[WPHistory] Received snapshot data:', data)

      // New API returns session with posts array
      if (data && data.posts && Array.isArray(data.posts) && data.posts.length > 0) {
        console.log('[WPHistory] Setting cachedPostsData:', data.posts.length, 'posts')

        // Extract domain from posts and auto-set active WP site
        const firstPostUrl = data.posts[0]?.url
        if (firstPostUrl) {
          try {
            const domain = new URL(firstPostUrl).hostname
            console.log('[WPHistory] Extracted domain from template:', domain)

            // Auto-set active WP site for this domain
            const findRes = await fetch(`${API_URL}/api/wp-sites/find-by-domain`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain })
            })

            if (findRes.ok) {
              const findData = await findRes.json()
              if (findData.success && findData.site) {
                console.log('[WPHistory] Found matching WP site:', findData.site.name)

                // Set this site as active
                const activeRes = await fetch(`${API_URL}/api/wp-sites/${findData.site.id}/active`, {
                  method: 'PUT'
                })

                if (activeRes.ok) {
                  console.log('[WPHistory] Auto-set active WP site:', findData.site.name)
                  toast.success(`Tự động chọn WP site: ${findData.site.name}`)

                  // Reload sites to update active badge in My WordPress Sites
                  if (reloadWpSites) {
                    await reloadWpSites()
                    console.log('[WPHistory] Reloaded WP sites to refresh active badge')
                  }
                }
              } else {
                console.warn('[WPHistory] No matching WP site found for domain:', domain)
                toast.error(`Không tìm thấy WP site cho ${domain}. Vui lòng thêm site trước!`)
              }
            }
          } catch (urlError) {
            console.error('[WPHistory] Error extracting domain:', urlError)
          }
        }

        // Clear ALL storage to prevent conflicts
        sessionStorage.clear()
        localStorage.removeItem('wp_cached_posts')
        console.log('[WPHistory] Cleared sessionStorage and localStorage')

        // Set new snapshot session_id
        sessionStorage.setItem('wp_editor_session_id', sessionId)
        console.log('[WPHistory] Set new session_id in sessionStorage:', sessionId)

        // Clear selectedUrls to prevent fetching from old domain
        if (setSelectedUrls) {
          setSelectedUrls([])
          console.log('[WPHistory] Cleared selectedUrls to prevent conflict')
        }

        // Load posts to cache - this will trigger AppWithSidebar to update localStorage
        setCachedPostsData(data.posts)

        // Switch to WordPress Editor page
        console.log('[WPHistory] Switching to wordpress-editor page')
        setCurrentPage('wordpress-editor')
        toast.success(`Đã load ${data.posts.length} bài viết từ snapshot`)
      } else {
        console.error('[WPHistory] Invalid snapshot data:', data)
        toast.error('Snapshot không có dữ liệu')
      }
    } catch (error) {
      console.error('[WPHistory] Error loading snapshot to editor:', error)
      toast.error('Lỗi khi load snapshot')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang load lịch sử...</p>
        </div>
      </div>
    )
  }

  if (viewingHistory) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{viewingHistory.session_name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {viewingHistory.site_name} • {new Date(viewingHistory.created_at).toLocaleString('vi-VN')}
            </p>
          </div>
          <button
            onClick={() => setViewingHistory(null)}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {viewingHistory.posts && viewingHistory.posts.map((post, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="text-xs font-mono text-slate-500 mb-2">ID: {post.post_id}</div>
                <h3 className="font-semibold text-sm text-slate-900 mb-2 line-clamp-2">{post.title}</h3>
                <div className="space-y-1 text-xs text-slate-600">
                  <div><span className="font-medium">Status:</span> {post.status}</div>
                  {post.outgoing_url && <div><span className="font-medium">Outgoing:</span> {post.outgoing_url}</div>}
                  <a href={post.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline block truncate">
                    {post.url}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white border-b px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900">WP History</h2>
        <p className="text-gray-600 mt-1">Lịch sử chỉnh sửa WordPress posts</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {historyList.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Chưa có lịch sử</p>
              <p className="text-sm mt-2">Hãy save snapshot từ WordPress Editor để tạo lịch sử</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {historyList.map((snapshot) => (
              <div
                key={snapshot.session_id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-slate-900">{snapshot.session_name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(snapshot.created_at).toLocaleString('vi-VN')}
                      </span>
                      {snapshot.domain && (
                        <span className="text-indigo-600 font-medium">{snapshot.domain}</span>
                      )}
                      {snapshot.total_posts > 0 && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {snapshot.total_posts} posts
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadToEditor(snapshot.session_id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Load vào WordPress Editor"
                    >
                      <FileEdit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleView(snapshot.session_id)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleExport(snapshot)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Export JSON"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(snapshot.session_id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
