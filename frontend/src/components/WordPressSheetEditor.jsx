import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table'
import { Editor } from '@tinymce/tinymce-react'
import { Loader2, RefreshCw, AlertCircle, ExternalLink, Save, X, Edit2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Archive, Globe } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts'

const API_URL = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5050"

// Status Cell Component (Display only)
function StatusCell({ getValue }) {
  const status = getValue()

  const statusColors = {
    publish: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20',
    draft: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20',
    pending: 'bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20',
    private: 'bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/20'
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${statusColors[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}

export default function WordPressSheetEditor({ selectedUrls, wpConfig, cachedData, setCachedData }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [editingPost, setEditingPost] = useState(null)
  const [contentValue, setContentValue] = useState('')
  const [savingContent, setSavingContent] = useState(false)
  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem('wp_editor_session_id') || null)
  const editorRef = useRef(null)
  const hasLoadedDataRef = useRef(false) // Track if we've loaded data to prevent re-loading

  // Debug: Track data changes
  useEffect(() => {
    console.log('[WordPressSheetEditor] DATA STATE CHANGED:', data.length, 'posts')
  }, [data])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'escape': () => {
      if (editingPost) {
        closeContentEditor()
      }
    },
    'ctrl+s': () => {
      if (editingPost) {
        saveContent()
      }
    }
  })

  // Sync data with cachedData when it changes (e.g., loaded from snapshot or localStorage)
  useEffect(() => {
    console.log('[WordPressSheetEditor] cachedData changed:', cachedData?.length || 0, 'posts')
    if (cachedData && cachedData.length > 0) {
      console.log('[WordPressSheetEditor] Setting data from cachedData')
      setData(cachedData)

      // Update sessionId from sessionStorage (in case it was changed by WP History)
      const storedSessionId = sessionStorage.getItem('wp_editor_session_id')
      if (storedSessionId && storedSessionId !== sessionId) {
        console.log('[WordPressSheetEditor] Updating sessionId from sessionStorage:', storedSessionId)
        setSessionId(storedSessionId)
      }
    }
  }, [cachedData])

  // Refresh posts from WordPress (re-fetch from WP API)
  const refreshPostsFromWordPress = async () => {
    if (!wpConfig || !wpConfig.site_url || !wpConfig.username || !wpConfig.app_password) {
      toast.error('Chưa cấu hình WordPress. Vui lòng vào Settings để cấu hình')
      return
    }

    if (!data || data.length === 0) {
      toast.error('Không có bài viết để refresh')
      return
    }

    // Extract URLs from current data
    const urls = data.map(post => post.url).filter(url => url)

    if (urls.length === 0) {
      toast.error('Không tìm thấy URLs trong dữ liệu hiện tại')
      return
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn refresh ${urls.length} bài viết từ WordPress?\n\n` +
      `Thao tác này sẽ lấy dữ liệu mới nhất từ WordPress và cập nhật toàn bộ bài viết.`
    )

    if (!confirmed) return

    setLoading(true)
    setLoadingMessage(`Đang refresh ${urls.length} bài viết từ WordPress...`)

    try {
      console.log('[WordPressSheetEditor] Refreshing posts from WordPress for URLs:', urls)

      // Fetch fresh posts from WordPress
      const postsRes = await fetch(`${API_URL}/api/wordpress/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_url: wpConfig.site_url,
          username: wpConfig.username,
          app_password: wpConfig.app_password,
          urls: urls,
          wp_site_id: wpConfig.id
        })
      })

      if (!postsRes.ok) {
        throw new Error('Failed to fetch posts from WordPress')
      }

      const postsData = await postsRes.json()
      const allPosts = postsData.posts || []
      const validPosts = allPosts.filter(post => post.id && !post.error)
      const errorPosts = allPosts.filter(post => post.error)

      console.log(`[WordPressSheetEditor] Refreshed ${validPosts.length}/${allPosts.length} posts (${errorPosts.length} errors)`)

      // Update session with fresh data
      if (sessionId && validPosts.length > 0) {
        try {
          // Update session in database
          const updateRes = await fetch(`${API_URL}/api/editor-session/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              posts: validPosts
            })
          })

          if (updateRes.ok) {
            console.log('[WordPressSheetEditor] Session updated with fresh posts')
          }
        } catch (error) {
          console.error('[WordPressSheetEditor] Error updating session:', error)
        }
      }

      // Update data and cache
      setData(allPosts)
      setCachedData(allPosts)

      if (errorPosts.length > 0) {
        toast(`Đã refresh ${validPosts.length}/${allPosts.length} bài viết (${errorPosts.length} không tìm thấy)`, {
          duration: 6000,
          icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          style: {
            background: '#FEF3C7',
            color: '#92400E',
            border: '1px solid #FCD34D'
          }
        })
      } else {
        toast.success(`Đã refresh ${validPosts.length} bài viết từ WordPress`)
      }

    } catch (error) {
      console.error('[WordPressSheetEditor] Error refreshing posts:', error)
      toast.error('Lỗi khi refresh bài viết từ WordPress')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // Manual refresh outgoing links
  const refreshOutgoingLinks = async () => {
    if (!wpConfig || !data || data.length === 0) {
      toast.error('Không thể refresh outgoing links - chưa có dữ liệu')
      return
    }

    if (!sessionId) {
      toast.error('Session chưa được tạo. Vui lòng đợi load posts hoàn tất.')
      return
    }

    setLoading(true)
    setLoadingMessage('Đang phân tích outgoing links...')

    try {
      const res = await fetch(`${API_URL}/api/editor-session/${sessionId}/refresh-outgoing-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wp_config: {
            id: wpConfig.id,
            site_url: wpConfig.site_url,
            username: wpConfig.username,
            app_password: wpConfig.app_password
          }
        })
      })

      if (res.ok) {
        const result = await res.json()
        console.log('[WordPressSheetEditor] Refreshed outgoing links:', result.updated_count, 'posts')

        // Update data with fresh session
        if (result.session && result.session.posts) {
          setData(result.session.posts)
          setCachedData(result.session.posts)
          toast.success(`Đã phân tích ${result.updated_count} outgoing links`)
        }
      } else if (res.status === 404) {
        // Session not found - this can happen if session was deleted or expired
        console.warn('[WordPressSheetEditor] Session not found (404). Need to reload posts.')
        toast.error('Session không tồn tại. Vui lòng load lại posts.')
        // Clear session ID to force recreation on next load
        setSessionId(null)
        sessionStorage.removeItem('wp_editor_session_id')
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('[WordPressSheetEditor] Error refreshing outgoing links:', errorData)
        toast.error(errorData.error || 'Lỗi khi phân tích outgoing links')
      }
    } catch (error) {
      console.error('[WordPressSheetEditor] Error refreshing outgoing links:', error)
      toast.error('Lỗi kết nối khi phân tích outgoing links')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // Load posts from WordPress
  const loadPosts = useCallback(async (forceReload = false) => {
    // Prevent re-loading if we already have data (unless forced)
    if (hasLoadedDataRef.current && !forceReload) {
      console.log('[WordPressSheetEditor] Skipping loadPosts - data already loaded')
      return
    }

    // If no selected URLs, only use cache if available
    if (!selectedUrls || selectedUrls.length === 0) {
      if (cachedData && cachedData.length > 0) {
        console.log('[WordPressSheetEditor] Using cached posts data (no selectedUrls):', cachedData.length, 'posts')
        setData(cachedData)
        hasLoadedDataRef.current = true // Mark as loaded

        // Check if sessionId exists in sessionStorage (from WP History)
        const existingSessionId = sessionStorage.getItem('wp_editor_session_id')

        if (existingSessionId && !sessionId) {
          // Verify session still exists in database before reusing
          console.log('[WordPressSheetEditor] Checking if session exists:', existingSessionId)
          try {
            const verifyRes = await fetch(`${API_URL}/api/editor-session/${existingSessionId}`)
            if (verifyRes.ok) {
              console.log('[WordPressSheetEditor] Reusing existing session from sessionStorage:', existingSessionId)
              setSessionId(existingSessionId)
            } else {
              console.log('[WordPressSheetEditor] Session not found in database, creating new one')
              sessionStorage.removeItem('wp_editor_session_id')
              // Create new session below
              if (wpConfig?.id) {
                const domain = cachedData[0]?.url ? new URL(cachedData[0].url).hostname : 'unknown'
                console.log('[WordPressSheetEditor] Creating session from cached data for domain:', domain)

                const sessionRes = await fetch(`${API_URL}/api/editor-session`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    wp_site_id: wpConfig.id,
                    domain: domain,
                    posts: cachedData
                  })
                })

                if (sessionRes.ok) {
                  const sessionData = await sessionRes.json()
                  console.log('[WordPressSheetEditor] Session created from cache:', sessionData.session_id)
                  setSessionId(sessionData.session_id)
                  sessionStorage.setItem('wp_editor_session_id', sessionData.session_id)
                }
              }
            }
          } catch (error) {
            console.error('[WordPressSheetEditor] Error verifying session:', error)
            sessionStorage.removeItem('wp_editor_session_id')
          }
        } else if (!existingSessionId && !sessionId && wpConfig?.id) {
          // Create new session from cached data only if no session exists
          const domain = cachedData[0]?.url ? new URL(cachedData[0].url).hostname : 'unknown'
          console.log('[WordPressSheetEditor] Creating session from cached data for domain:', domain)

          try {
            const sessionRes = await fetch(`${API_URL}/api/editor-session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                wp_site_id: wpConfig.id,
                domain: domain,
                posts: cachedData
              })
            })

            if (sessionRes.ok) {
              const sessionData = await sessionRes.json()
              console.log('[WordPressSheetEditor] Session created from cache:', sessionData.session_id)
              setSessionId(sessionData.session_id)
              sessionStorage.setItem('wp_editor_session_id', sessionData.session_id)
            }
          } catch (error) {
            console.error('[WordPressSheetEditor] Error creating session from cache:', error)
          }
        }
      } else {
        console.log('[WordPressSheetEditor] No cached data and no selected URLs')
      }
      return
    }

    // If we have selectedUrls, check if we should use cache or fetch new data
    if (!forceReload && cachedData && cachedData.length > 0) {
      // Check if cached data matches the selected URLs (same domain)
      // Extract domain from first URL in cache and first URL in selection
      const cachedDomain = cachedData[0]?.url ? new URL(cachedData[0].url).hostname : null
      const selectedDomain = selectedUrls[0] ? new URL(selectedUrls[0]).hostname : null

      console.log('[WordPressSheetEditor] Comparing domains - cached:', cachedDomain, 'selected:', selectedDomain)

      if (cachedDomain === selectedDomain) {
        console.log('[WordPressSheetEditor] Using cached posts data (same domain):', cachedData.length, 'posts')
        setData(cachedData)
        hasLoadedDataRef.current = true // Mark as loaded
        return
      } else {
        console.log('[WordPressSheetEditor] Domain changed, fetching new data...')
        // Clear old session when domain changes
        setSessionId(null)
        sessionStorage.removeItem('wp_editor_session_id')
        console.log('[WordPressSheetEditor] Cleared old session for new domain')
      }
    }

    if (!wpConfig || !wpConfig.site_url || !wpConfig.username || !wpConfig.app_password) {
      toast.error("Chưa cấu hình WordPress. Vui lòng vào Settings để cấu hình")
      return
    }

    // Clear any old session when loading new posts from WordPress
    if (sessionId) {
      console.log('[WordPressSheetEditor] Clearing existing session before loading new posts')
      setSessionId(null)
      sessionStorage.removeItem('wp_editor_session_id')
    }

    setLoading(true)
    setLoadingMessage(`Đang load ${selectedUrls.length} bài viết từ WordPress...`)

    try {
      console.log('[WordPressSheetEditor] Fetching posts from WordPress API for URLs:', selectedUrls)
      const startTime = Date.now()

      // Fetch posts
      const postsRes = await fetch(`${API_URL}/api/wordpress/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_url: wpConfig.site_url,
          username: wpConfig.username,
          app_password: wpConfig.app_password,
          urls: selectedUrls,
          wp_site_id: wpConfig.id
        })
      })

      if (!postsRes.ok) {
        throw new Error('Failed to fetch posts')
      }

      const postsData = await postsRes.json()
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

      // Separate valid posts and error posts
      const validPosts = (postsData.posts || []).filter(post => post.id && !post.error)
      const errorPosts = (postsData.posts || []).filter(post => post.error)

      // Combine ALL posts (valid + errors) for display in table
      const allPosts = postsData.posts || []

      if (errorPosts.length > 0) {
        console.warn('[WordPressSheetEditor] Failed to fetch', errorPosts.length, 'posts:')
        // Log first 3 errors with details
        errorPosts.slice(0, 3).forEach((post, idx) => {
          console.warn(`  [${idx + 1}] ${post.url} - Error: ${post.error}`)
        })
        if (errorPosts.length > 3) {
          console.warn(`  ... and ${errorPosts.length - 3} more errors`)
        }
      }

      console.log(`[WordPressSheetEditor] Successfully fetched ${validPosts.length}/${allPosts.length} posts (${errorPosts.length} errors)`)

      // Check if all posts failed
      if (validPosts.length === 0 && allPosts.length > 0) {
        const firstError = errorPosts[0]?.error || 'Unknown error'
        toast.error(`Không thể load bài viết nào. Lỗi: ${firstError}`)
        console.error('[WordPressSheetEditor] All posts failed. First error:', firstError)
        setLoading(false)
        setLoadingMessage('')
        return
      }

      // Create editor session in database with ONLY valid posts (not errors)
      const domain = selectedUrls[0] ? new URL(selectedUrls[0]).hostname : 'unknown'
      console.log('[WordPressSheetEditor] Creating editor session for domain:', domain, 'with', validPosts.length, 'valid posts (out of', allPosts.length, 'total)')
      console.log('[WordPressSheetEditor] Valid posts data:', validPosts)

      const sessionRes = await fetch(`${API_URL}/api/editor-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wp_site_id: wpConfig.id,
          domain: domain,
          posts: validPosts
        })
      })

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        console.log('[WordPressSheetEditor] Session created:', sessionData.session_id)
        setSessionId(sessionData.session_id)
        sessionStorage.setItem('wp_editor_session_id', sessionData.session_id)
      }

      // Set data and cache with ALL posts (including errors for display)
      console.log('[WordPressSheetEditor] Posts data loaded from API:', validPosts.length, 'valid posts /', allPosts.length, 'total in', elapsed, 's')
      setData(allPosts)  // Display ALL posts including errors
      setCachedData(allPosts)  // Cache ALL posts
      hasLoadedDataRef.current = true // Mark as loaded

      if (errorPosts.length > 0) {
        toast(`Đã load ${validPosts.length}/${allPosts.length} bài viết trong ${elapsed}s (${errorPosts.length} không tìm thấy trên WordPress)`, {
          duration: 6000,
          icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          style: {
            background: '#FEF3C7',
            color: '#92400E',
            border: '1px solid #FCD34D'
          }
        })
      } else {
        toast.success(`Đã load ${validPosts.length} bài viết trong ${elapsed}s`)
      }

    } catch (error) {
      console.error('[WordPressSheetEditor] Error loading posts:', error)
      toast.error('Lỗi khi load bài viết từ WordPress')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }, [selectedUrls, wpConfig, cachedData, setCachedData])

  // Load posts when selectedUrls changes
  useEffect(() => {
    console.log('[WordPressSheetEditor] selectedUrls changed:', selectedUrls?.length || 0, 'urls')
    if (selectedUrls && selectedUrls.length > 0) {
      console.log('[WordPressSheetEditor] Triggering loadPosts due to selectedUrls change')
      loadPosts()
    }
  }, [selectedUrls]) // Re-run when selectedUrls changes

  // Load posts on mount (for cached data from localStorage or snapshot)
  useEffect(() => {
    console.log('[WordPressSheetEditor] Component mounted, checking for data...')
    console.log('[WordPressSheetEditor] cachedData:', cachedData?.length || 0, 'posts')
    console.log('[WordPressSheetEditor] selectedUrls:', selectedUrls?.length || 0, 'urls')

    // Only load if no selectedUrls (meaning we're restoring from cache/snapshot)
    if (!selectedUrls || selectedUrls.length === 0) {
      loadPosts()
    }
  }, []) // Empty dependency array - only run once on mount

  // Save snapshot to history
  const handleSaveSnapshot = async () => {
    if (!data || data.length === 0) {
      toast.error("Không có dữ liệu để lưu")
      return
    }

    if (!sessionId) {
      toast.error("Không tìm thấy session. Vui lòng reload dữ liệu.")
      return
    }

    const sessionName = prompt('Nhập tên cho snapshot này:')
    if (!sessionName || sessionName.trim().length === 0) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/editor-session/${sessionId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_name: sessionName.trim()
        })
      })

      if (!res.ok) {
        throw new Error('Failed to save snapshot')
      }

      const result = await res.json()

      if (result.action === 'overwritten') {
        toast.success(`Đã ghi đè snapshot cho domain này!`)
      } else {
        toast.success('Đã lưu snapshot thành công!')
      }

      console.log('Snapshot saved:', result)
    } catch (error) {
      console.error('Error saving snapshot:', error)
      toast.error('Lỗi khi lưu snapshot')
    }
  }

  // Open content editor
  const openContentEditor = async (post) => {
    console.log('[WordPressSheetEditor] Opening content editor for post:', {
      id: post.id,
      url: post.url,
      title: post.title,
      hasContent: !!post.content,
      allKeys: Object.keys(post)
    })

    // If content is not available, fetch it from WordPress
    if (!post.content && wpConfig) {
      setLoading(true)
      setLoadingMessage('Đang tải nội dung bài viết...')

      try {
        const res = await fetch(`${API_URL}/api/wordpress/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_url: wpConfig.site_url,
            username: wpConfig.username,
            app_password: wpConfig.app_password,
            urls: [post.url],
            wp_site_id: wpConfig.id
          })
        })

        if (res.ok) {
          const responseData = await res.json()
          console.log('[WordPressSheetEditor] Fetched content response:', responseData)

          if (responseData.posts && responseData.posts.length > 0) {
            const fetchedPost = responseData.posts[0]

            // Check if post has error (not found on WordPress)
            if (fetchedPost.error) {
              console.error('[WordPressSheetEditor] Post not found on WordPress:', fetchedPost.error)
              toast.error(`Bài viết không tồn tại trên WordPress: ${fetchedPost.error}`)
              setLoading(false)
              setLoadingMessage('')
              return // Don't open editor for error posts
            }

            const fetchedContent = fetchedPost.content || ''
            post.content = fetchedContent

            // Get the correct post ID
            const currentPostId = post.post_id || post.id

            // Update local data with fetched content using functional update
            // Note: We don't update cachedData here to avoid re-mounting the component
            // Content will be saved to cachedData when user saves changes
            setData(currentData => {
              const updatedData = currentData.map(row => {
                const rowId = row.post_id || row.id
                return rowId === currentPostId ? { ...row, content: post.content } : row
              })
              console.log('[WordPressSheetEditor] Content fetched, updated from currentData:', currentData.length, 'posts')
              return updatedData
            })

            console.log('[WordPressSheetEditor] Content fetched successfully, length:', fetchedContent.length)
          } else {
            console.warn('[WordPressSheetEditor] No content in response')
            toast.error('Không tìm thấy nội dung bài viết')
            setLoading(false)
            setLoadingMessage('')
            return
          }
        } else {
          const errorText = await res.text()
          console.error('[WordPressSheetEditor] Error response:', errorText)
          toast.error('Lỗi khi tải nội dung từ WordPress')
        }
      } catch (error) {
        console.error('[WordPressSheetEditor] Error fetching content:', error)
        toast.error('Lỗi khi tải nội dung')
      } finally {
        setLoading(false)
        setLoadingMessage('')
      }
    }

    console.log('[WordPressSheetEditor] Setting editing post, content length:', post.content?.length || 0)
    setEditingPost(post)
    setContentValue(post.content || '')
  }

  // Close content editor
  const closeContentEditor = () => {
    // Use functional read to get latest data length
    setData(currentData => {
      console.log('[WordPressSheetEditor] Closing content editor, current data length:', currentData.length)
      return currentData // No change, just read
    })
    setEditingPost(null)
    setContentValue('')
  }

  // Save content
  const saveContent = async () => {
    if (!editingPost || !wpConfig) return

    // Validate editingPost has required fields (use post_id, not id)
    const postId = editingPost.post_id || editingPost.id
    if (!postId) {
      console.error('[WordPressSheetEditor] Cannot save: post has no ID', editingPost)
      toast.error('Lỗi: Bài viết không có ID')
      return
    }

    setSavingContent(true)
    try {
      const updatePayload = {
        site_url: wpConfig.site_url,
        username: wpConfig.username,
        app_password: wpConfig.app_password,
        content: contentValue,
        wp_site_id: wpConfig.id,
        url: editingPost.url
      }

      console.log('[WordPressSheetEditor] Saving post:', {
        postId,
        site_url: updatePayload.site_url,
        username: updatePayload.username,
        hasAppPassword: !!updatePayload.app_password,
        hasContent: !!updatePayload.content,
        url: updatePayload.url
      })

      const res = await fetch(`${API_URL}/api/wordpress/post/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      if (res.ok) {
        const result = await res.json()
        const updatedPost = result.post

        // Update local state and cache using functional setState to get latest value
        setData(currentData => {
          const updatedData = currentData.map(row => {
            // Match by post_id or id
            const rowId = row.post_id || row.id
            if (rowId === postId) {
              return {
                ...row,
                content: contentValue,
                // Update date_modified from WordPress response to trigger red highlight
                date_modified: updatedPost?.modified || new Date().toISOString()
              }
            }
            return row
          })
          console.log('[WordPressSheetEditor] Save successful, updatedData length:', updatedData.length, 'from currentData:', currentData.length)
          // Also update cache
          setCachedData(updatedData)
          return updatedData
        })
        toast.success('Đã lưu content')
        closeContentEditor()
      } else {
        // Log detailed error information
        const errorData = await res.json().catch(() => ({}))
        console.error('[WordPressSheetEditor] Save failed:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData
        })
        toast.error(`Lỗi khi lưu content: ${errorData.error || res.statusText}`)
      }
    } catch (error) {
      console.error('Error saving content:', error)
      toast.error('Lỗi khi lưu')
    } finally {
      setSavingContent(false)
    }
  }

  // Save a single cell
  const updateData = async (postId, field, value) => {
    if (!wpConfig) return false

    try {
      // Find the post to get its URL
      const post = data.find(p => p.id === postId)

      const updatePayload = {
        site_url: wpConfig.site_url,
        username: wpConfig.username,
        app_password: wpConfig.app_password,
        wp_site_id: wpConfig.id,
        url: post?.url || '',
        [field]: value
      }

      const res = await fetch(`${API_URL}/api/wordpress/post/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      if (res.ok) {
        const result = await res.json()
        const updatedPost = result.post

        // Update session in database (if session exists)
        if (sessionId) {
          await fetch(`${API_URL}/api/editor-session/${sessionId}/post/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, value })
          })

          // Also update date_modified in session
          if (updatedPost?.modified) {
            await fetch(`${API_URL}/api/editor-session/${sessionId}/post/${postId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field: 'date_modified', value: updatedPost.modified })
            })
          }
        }

        // Update local state and cache
        const updatedData = data.map(row => {
          if (row.id === postId) {
            return {
              ...row,
              [field]: value,
              // Update date_modified from WordPress response to trigger red highlight
              date_modified: updatedPost?.modified || new Date().toISOString()
            }
          }
          return row
        })
        setData(updatedData)
        setCachedData(updatedData)
        toast.success(`Đã lưu ${field}`)
        return true
      } else {
        toast.error(`Lỗi khi lưu ${field}`)
        return false
      }
    } catch (error) {
      console.error('Error saving cell:', error)
      toast.error('Lỗi khi lưu')
      return false
    }
  }

  // Column definitions
  const columnHelper = createColumnHelper()

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'index',
      header: '#',
      size: 35,
      cell: info => (
        <div className="text-center text-[10px] font-medium text-slate-400">
          {info.row.index + 1}
        </div>
      )
    }),
    columnHelper.accessor('id', {
      header: 'ID',
      size: 60,
      cell: info => {
        const id = info.getValue()
        const row = info.row.original
        const hasError = row.error

        if (hasError) {
          return (
            <span className="font-mono text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
              ERROR
            </span>
          )
        }

        return (
          <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">
            {id || 'N/A'}
          </span>
        )
      }
    }),
    columnHelper.accessor('title', {
      header: 'Title',
      size: 180,
      cell: info => {
        const title = info.getValue()
        const row = info.row.original
        const hasError = row.error

        if (hasError) {
          return (
            <div
              className="truncate text-[11px] font-medium text-red-600 italic"
              style={{ maxWidth: '180px' }}
              title={`Error: ${row.error}`}
            >
              ⚠️ {row.error || 'Post not found'}
            </div>
          )
        }

        return (
          <div
            className="truncate text-[11px] font-medium text-slate-900 hover:text-blue-600 transition-colors cursor-help"
            style={{ maxWidth: '180px' }}
            title={title}
          >
            {title}
          </div>
        )
      }
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 85,
      cell: StatusCell
    }),
    columnHelper.accessor('outgoing_links', {
      header: 'Outgoing Links',
      size: 280,
      cell: info => {
        const links = info.getValue() || []

        if (!links || links.length === 0) {
          return (
            <div className="text-[10px] text-slate-400 italic">
              No outgoing links
            </div>
          )
        }

        return (
          <div className="flex flex-wrap gap-1">
            {links.slice(0, 3).map((link, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded text-[9px]"
                title={`${link.url}\nAnchor: ${link.anchor}`}
              >
                <span className="font-bold text-red-700">{link.domain}</span>
                <span className="text-red-600">"{link.anchor.substring(0, 20)}{link.anchor.length > 20 ? '...' : ''}"</span>
              </div>
            ))}
            {links.length > 3 && (
              <span className="text-[9px] text-slate-500 font-medium">
                +{links.length - 3} more
              </span>
            )}
          </div>
        )
      }
    }),
    columnHelper.accessor('date_modified', {
      header: 'Modified',
      size: 115,
      cell: info => {
        const date = info.getValue()
        if (!date) return null

        const modifiedDate = new Date(date)
        const now = new Date()
        const hoursDiff = (now - modifiedDate) / (1000 * 60 * 60)
        const isRecent = hoursDiff < 24

        const formatted = modifiedDate.toLocaleString('vi-VN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })

        return (
          <div
            className={`text-[10px] whitespace-nowrap font-medium ${
              isRecent
                ? 'text-rose-600 font-bold'
                : 'text-slate-500'
            }`}
            title={modifiedDate.toLocaleString('vi-VN')}
          >
            {formatted}
          </div>
        )
      }
    }),
    columnHelper.accessor('url', {
      header: 'URL',
      size: 320,
      cell: info => {
        const url = info.getValue()
        return (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 text-[11px] group"
            title={url}
          >
            <span className="truncate">{url}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
          </a>
        )
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      size: 50,
      cell: info => {
        const row = info.row.original
        const hasError = row.error

        if (hasError) {
          return (
            <button
              disabled
              className="p-1 text-slate-300 cursor-not-allowed"
              title="Cannot edit - post not found"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )
        }

        return (
          <button
            onClick={() => openContentEditor(row)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit Content"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )
      }
    })
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      updateData
    }
  })

  // Extract domain from first post
  const currentDomain = useMemo(() => {
    if (data.length > 0 && data[0].url) {
      try {
        return new URL(data[0].url).hostname
      } catch {
        return null
      }
    }
    return null
  }, [data])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentDomain && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {currentDomain}
              </span>
            </div>
          )}
          <h3 className="font-semibold text-gray-900">
            {data.length} bài viết
          </h3>
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={refreshPostsFromWordPress}
            disabled={loading || data.length === 0}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Lấy dữ liệu mới nhất từ WordPress"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh from WP
          </button>
          <button
            onClick={refreshOutgoingLinks}
            disabled={loading || data.length === 0}
            className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Phân tích lại outgoing links từ WordPress"
          >
            <ExternalLink className="w-4 h-4" />
            Refresh Links
          </button>
          <button
            onClick={handleSaveSnapshot}
            disabled={loading || data.length === 0}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Archive className="w-4 h-4" />
            Save Snapshot
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800">
        <strong>Hướng dẫn:</strong> Click vào ô để chỉnh sửa • Enter để lưu • Esc để hủy • Ctrl+Enter để lưu textarea
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-800 font-medium text-lg mb-1">
                {loadingMessage || 'Đang load bài viết...'}
              </p>
              <p className="text-gray-500 text-sm">
                Đang sử dụng concurrent requests để tăng tốc độ...
              </p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p>Chưa có bài viết</p>
              <p className="text-sm mt-1">Chọn URLs từ tab Results để bắt đầu</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full bg-white">
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b border-slate-200">
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-2 py-1.5 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider"
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={header.column.getCanSort() ? 'cursor-pointer select-none flex items-center gap-1 hover:text-blue-600 transition-colors' : ''}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: ' ↑',
                                desc: ' ↓',
                              }[header.column.getIsSorted()] ?? null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => {
                    const hasError = row.original.error
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors border-b border-slate-100 group ${
                          hasError
                            ? 'bg-red-50/50 hover:bg-red-50 border-red-100'
                            : 'hover:bg-blue-50/30'
                        }`}
                        title={hasError ? `Error: ${row.original.error}` : ''}
                      >
                        {row.getVisibleCells().map(cell => (
                          <td
                            key={cell.id}
                            className="px-2 py-1.5"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-white border-t border-gray-300 px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">
                  Hiển thị {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}
                </span>
                <span className="text-gray-500">trên tổng</span>
                <span className="font-semibold text-blue-600">{data.length} bài viết</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Trang <span className="font-semibold">{table.getState().pagination.pageIndex + 1}</span> / <span className="font-semibold">{table.getPageCount()}</span>
                  </span>
                </div>

                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>

                <select
                  value={table.getState().pagination.pageSize}
                  onChange={e => table.setPageSize(Number(e.target.value))}
                  className="ml-2 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[10, 20, 30, 50, 100].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize} / trang
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Editor Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Content</h3>
                <p className="text-sm text-gray-600 mt-1 truncate max-w-xl">{editingPost.title}</p>
              </div>
              <button
                onClick={closeContentEditor}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              <Editor
                apiKey="0ks75tim1u0ek72inaubhld3rg4ttu84o6r3ugsc0y2nnpxi"
                onInit={(_evt, editor) => editorRef.current = editor}
                value={contentValue}
                onEditorChange={(newValue) => setContentValue(newValue)}
                init={{
                  height: 500,
                  menubar: true,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat | code | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  promotion: false,
                  branding: false
                }}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Post ID: <span className="font-mono">{editingPost.id}</span>
                </div>
                <div className="text-xs text-gray-500">
                  <kbd className="px-2 py-1 bg-gray-200 rounded border border-gray-300">Ctrl+S</kbd> to save • <kbd className="px-2 py-1 bg-gray-200 rounded border border-gray-300">Esc</kbd> to close
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeContentEditor}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveContent}
                  disabled={savingContent}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingContent ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Content
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
