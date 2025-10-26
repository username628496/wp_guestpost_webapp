/**
 * useEditorSession - Custom hook for managing WordPress editor sessions
 * Handles session creation, loading, updating, and snapshot management
 */
import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'

export function useEditorSession() {
  const { API_URL } = useApp()
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)

  /**
   * Create a new editor session
   */
  const createSession = useCallback(async (wpSiteId, domain, posts) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${API_URL}/api/editor-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wp_site_id: wpSiteId,
          domain,
          posts
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSession(data)
        return { success: true, sessionId: data.session_id }
      } else {
        setError(data.error || 'Failed to create session')
        toast.error('Không thể tạo session')
        return { success: false, error: data.error }
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error'
      setError(errorMsg)
      toast.error('Lỗi kết nối')
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  /**
   * Load an existing session
   */
  const loadSession = useCallback(async (sessionId) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${API_URL}/api/editor-session/${sessionId}`)
      const data = await res.json()

      if (res.ok) {
        setSession(data)
        return { success: true, session: data }
      } else {
        setError(data.error || 'Session not found')
        toast.error('Không tìm thấy session')
        return { success: false, error: data.error }
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error'
      setError(errorMsg)
      toast.error('Lỗi khi load session')
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  /**
   * Update a post in the session
   */
  const updatePost = useCallback(async (sessionId, postId, field, value) => {
    try {
      const res = await fetch(`${API_URL}/api/editor-session/${sessionId}/post/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value })
      })

      const data = await res.json()

      if (res.ok) {
        return { success: true }
      } else {
        toast.error('Không thể cập nhật post')
        return { success: false, error: data.error }
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật post')
      return { success: false, error: err.message }
    }
  }, [API_URL])

  /**
   * Save snapshot from current session
   */
  const saveSnapshot = useCallback(async (sessionId, snapshotName) => {
    try {
      setLoading(true)

      const res = await fetch(`${API_URL}/api/editor-session/${sessionId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot_name: snapshotName })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Đã lưu snapshot')
        return { success: true, snapshotId: data.snapshot_session_id }
      } else {
        toast.error('Không thể lưu snapshot')
        return { success: false, error: data.error }
      }
    } catch (err) {
      toast.error('Lỗi khi lưu snapshot')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  /**
   * Refresh outgoing links for session
   */
  const refreshOutgoingLinks = useCallback(async (sessionId, wpConfig) => {
    try {
      setLoading(true)

      const res = await fetch(`${API_URL}/api/editor-session/${sessionId}/refresh-outgoing-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wp_config: wpConfig })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`Đã cập nhật ${data.updated_count} posts`)
        return { success: true, updatedCount: data.updated_count, session: data.session }
      } else {
        toast.error('Không thể refresh outgoing links')
        return { success: false, error: data.error }
      }
    } catch (err) {
      toast.error('Lỗi khi refresh outgoing links')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  /**
   * Delete a session
   */
  const deleteSession = useCallback(async (sessionId) => {
    try {
      const res = await fetch(`${API_URL}/api/editor-session/${sessionId}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Đã xóa session')
        setSession(null)
        return { success: true }
      } else {
        toast.error('Không thể xóa session')
        return { success: false, error: data.error }
      }
    } catch (err) {
      toast.error('Lỗi khi xóa session')
      return { success: false, error: err.message }
    }
  }, [API_URL])

  /**
   * Clear current session state
   */
  const clearSession = useCallback(() => {
    setSession(null)
    setError(null)
  }, [])

  return {
    // State
    session,
    loading,
    error,

    // Actions
    createSession,
    loadSession,
    updatePost,
    saveSnapshot,
    refreshOutgoingLinks,
    deleteSession,
    clearSession
  }
}
