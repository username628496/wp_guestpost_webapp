import React, { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"

export default function WordPressSiteForm({ site, onSubmit, onCancel }) {
  const [showAppPassword, setShowAppPassword] = useState(false)
  const [showWpPassword, setShowWpPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    site_url: '',
    username: '',
    app_password: '',
    wordpress_password: '',
    wordpress_url: ''
  })

  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name || '',
        site_url: site.site_url || '',
        username: site.username || '',
        app_password: site.app_password || '',
        wordpress_password: site.wordpress_password || '',
        wordpress_url: site.wordpress_url || ''
      })
    }
  }, [site])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {site ? 'Chỉnh sửa WordPress Site' : 'Thêm WordPress Site Mới'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Site Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Blog"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Site URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={formData.site_url}
            onChange={(e) => setFormData({ ...formData, site_url: e.target.value })}
            placeholder="https://your-site.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WordPress URL
          </label>
          <input
            type="url"
            value={formData.wordpress_url}
            onChange={(e) => setFormData({ ...formData, wordpress_url: e.target.value })}
            placeholder="https://your-site.com/wp-admin"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-500"
          />
          <p className="text-xs text-gray-500 mt-1">Link trực tiếp đến WordPress admin</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="admin"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WordPress Password
          </label>
          <div className="relative">
            <input
              type={showWpPassword ? "text" : "password"}
              value={formData.wordpress_password}
              onChange={(e) => setFormData({ ...formData, wordpress_password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-500"
            />
            <button
              type="button"
              onClick={() => setShowWpPassword(!showWpPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showWpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Password thông thường để login WordPress</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Application Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showAppPassword ? "text" : "password"}
              value={formData.app_password}
              onChange={(e) => setFormData({ ...formData, app_password: e.target.value })}
              placeholder="xxxx xxxx xxxx xxxx"
              required
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowAppPassword(!showAppPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showAppPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Application Password để kết nối REST API</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-mint-500 text-white rounded-lg font-medium hover:bg-mint-600 transition-colors"
          >
            {site ? 'Update Site' : 'Add Site'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
