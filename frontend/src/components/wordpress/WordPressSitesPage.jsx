import React, { useState, useMemo, useEffect } from "react"
import { Settings, Search } from "lucide-react"
import { toast } from "react-hot-toast"
import WordPressSiteCard from "./WordPressSiteCard"
import WordPressSiteForm from "./WordPressSiteForm"
import { useApp } from "../../contexts/AppContext"

export default function WordPressSitesPage({ setWpConfig }) {
  const { wpSites, activeSite, loadingSites, loadWpSites, setActiveWpSite, addWpSite, updateWpSite, deleteWpSite } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editingSite, setEditingSite] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Load sites on mount
  useEffect(() => {
    loadWpSites()
  }, [])

  // Add or update site
  const handleSubmitSite = async (formData) => {
    try {
      let result
      if (editingSite) {
        result = await updateWpSite(editingSite.id, formData)
      } else {
        result = await addWpSite(formData)
      }

      if (result.success) {
        // Update wpConfig if there's an active site
        const activeSiteData = wpSites.find(s => s.is_active) || result.site
        if (activeSiteData && setWpConfig) {
          setWpConfig({
            id: activeSiteData.id,
            site_url: activeSiteData.site_url,
            username: activeSiteData.username,
            app_password: activeSiteData.app_password
          })
        }

        toast.success(editingSite ? 'Đã cập nhật site' : `Đã thêm site: ${formData.name}`)
        setShowForm(false)
        setEditingSite(null)
      } else {
        toast.error(result.error || `Lỗi khi ${editingSite ? 'cập nhật' : 'thêm'} site`)
      }
    } catch (error) {
      console.error('Error submitting site:', error)
      toast.error(`Lỗi khi ${editingSite ? 'cập nhật' : 'thêm'} site`)
    }
  }

  // Edit site
  const handleEditSite = (site) => {
    setEditingSite(site)
    setShowForm(true)
  }

  // Set active site
  const handleSetActive = async (site) => {
    try {
      const result = await setActiveWpSite(site.id)

      // setActiveWpSite returns true/false, not an object
      // Toast is already shown in AppContext, so we just update wpConfig here
      if (result) {
        // Update wpConfig for parent component
        if (setWpConfig && activeSite) {
          setWpConfig({
            id: activeSite.id,
            site_url: activeSite.site_url,
            username: activeSite.username,
            app_password: activeSite.app_password
          })
        }
      }
      // Note: Toast messages are handled in AppContext
    } catch (error) {
      console.error('Error setting active site:', error)
      // Don't show toast here - AppContext already handles it
    }
  }

  // Delete site
  const handleDeleteSite = async (siteId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa site này?")) return

    try {
      const result = await deleteWpSite(siteId)

      if (result.success) {
        // Update wpConfig based on remaining sites
        const remainingSites = wpSites.filter(s => s.id !== siteId)
        const newActiveSite = remainingSites.find(s => s.is_active)

        if (newActiveSite && setWpConfig) {
          setWpConfig({
            id: newActiveSite.id,
            site_url: newActiveSite.site_url,
            username: newActiveSite.username,
            app_password: newActiveSite.app_password
          })
        } else if (setWpConfig) {
          setWpConfig(null)
        }

        toast.success("Đã xóa site")
      } else {
        toast.error(result.error || "Lỗi khi xóa site")
      }
    } catch (error) {
      console.error('Error deleting site:', error)
      toast.error("Lỗi khi xóa site")
    }
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingSite(null)
  }

  // Filter sites based on search query
  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return wpSites

    const query = searchQuery.toLowerCase()
    return wpSites.filter(site => {
      const name = site.name?.toLowerCase() || ''
      const siteUrl = site.site_url?.toLowerCase() || ''
      const username = site.username?.toLowerCase() || ''

      return name.includes(query) ||
             siteUrl.includes(query) ||
             username.includes(query)
    })
  }, [wpSites, searchQuery])

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">My WordPress Sites</h1>
              <p className="text-sm text-gray-500 mt-1">
                {wpSites.length} sites
                {activeSite && (
                  <>
                    {' • '}
                    <span className="text-green-600 font-medium">Active: {activeSite.name}</span>
                  </>
                )}
              </p>
            </div>

            {/* Search Bar - Inline trong header */}
            {wpSites.length > 0 && (
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm sites..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 text-sm border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600 font-bold text-lg"
                    >
                      ×
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="mt-1 text-xs text-blue-600">
                    {filteredSites.length} / {wpSites.length} sites
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setEditingSite(null)
                setShowForm(true)
              }}
              className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Settings className="w-4 h-4" />
              Add New Site
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Add/Edit Site Form */}
        {showForm && (
          <div className="mb-6">
            <WordPressSiteForm
              site={editingSite}
              onSubmit={handleSubmitSite}
              onCancel={handleCancelForm}
            />
          </div>
        )}

        {/* Sites Grid */}
        {wpSites.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có WordPress sites</h3>
            <p className="text-gray-500 mb-6">Thêm WordPress site đầu tiên để bắt đầu</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-mint-500 text-white rounded-lg font-medium hover:bg-mint-600 transition-colors"
            >
              Add New Site
            </button>
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy kết quả</h3>
            <p className="text-gray-500 mb-4">Không có site nào khớp với "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSites.map((site) => (
              <WordPressSiteCard
                key={site.id}
                site={site}
                onEdit={handleEditSite}
                onDelete={handleDeleteSite}
                onSetActive={handleSetActive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
