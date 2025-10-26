import React, { useState } from "react"
import { Eye, EyeOff, Trash2, Edit2, Copy, ExternalLink } from "lucide-react"
import { toast } from "react-hot-toast"

export default function WordPressSiteCard({ site, onEdit, onDelete, onSetActive }) {
  const [visiblePassword, setVisiblePassword] = useState(false)
  const [visibleAppPassword, setVisibleAppPassword] = useState(false)
  const [visibleWpPassword, setVisibleWpPassword] = useState(false)

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`Đã copy ${label}`)
  }

  return (
    <div
      className={`bg-white rounded-lg border p-5 transition-all hover:shadow-md ${
        site.is_active
          ? 'border-mint-400 bg-linear-to-br from-mint-50 to-white shadow-sm'
          : 'border-gray-200'
      }`}
    >
      {/* Header with name and active badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate mb-1">
            {site.name}
          </h3>
          {site.is_active && (
            <span className="inline-flex items-center px-2 py-0.5 bg-mint-500 text-white text-xs rounded-full font-medium">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Site details */}
      <div className="space-y-2.5 mb-4">
        {/* Site URL */}
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Site URL</div>
          <a
            href={site.site_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-mint-600 hover:text-mint-700 flex items-center gap-1 truncate"
            title={site.site_url}
          >
            <span className="truncate">{site.site_url}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>

        {/* WordPress URL */}
        {site.wordpress_url && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">WordPress URL</div>
            <a
              href={site.wordpress_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-mint-600 hover:text-mint-700 flex items-center gap-1 truncate"
              title={site.wordpress_url}
            >
              <span className="truncate">{site.wordpress_url}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
        )}

        {/* Username */}
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Username</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-sm text-gray-700 truncate" title={site.username}>
              {site.username}
            </div>
            <button
              onClick={() => copyToClipboard(site.username, 'username')}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Copy username"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Application Password */}
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Application Password</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-xs text-gray-700 font-mono break-all">
              {visibleAppPassword ? site.app_password : '••••••••••••••••'}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => copyToClipboard(site.app_password, 'application password')}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Copy application password"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setVisibleAppPassword(!visibleAppPassword)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title={visibleAppPassword ? "Ẩn password" : "Hiện password"}
              >
                {visibleAppPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* WordPress Password */}
        {site.wordpress_password && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">WordPress Password</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-xs text-gray-700 font-mono break-all">
                {visibleWpPassword ? site.wordpress_password : '••••••••••••••••'}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => copyToClipboard(site.wordpress_password, 'WordPress password')}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  title="Copy WordPress password"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setVisibleWpPassword(!visibleWpPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  title={visibleWpPassword ? "Ẩn password" : "Hiện password"}
                >
                  {visibleWpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="text-xs text-gray-400 pt-1 space-y-0.5">
          <div>Added: {new Date(site.created_at).toLocaleString('vi-VN')}</div>
          {site.updated_at && (
            <div>Updated: {new Date(site.updated_at).toLocaleString('vi-VN')}</div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {!site.is_active && (
          <button
            onClick={() => onSetActive(site)}
            className="flex-1 px-3 py-1.5 text-xs bg-mint-500 text-white rounded-md hover:bg-mint-600 transition-colors font-medium"
          >
            Set Active
          </button>
        )}
        <button
          onClick={() => onEdit(site)}
          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
          title="Edit site"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(site.id)}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
          title="Delete site"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
