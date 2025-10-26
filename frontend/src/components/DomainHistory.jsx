import { useState, useEffect } from "react"
import { Download, ExternalLink, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"

const BASE_URL = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5050"

export default function DomainHistory() {
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [detailData, setDetailData] = useState({})

  useEffect(() => {
    loadDomainChecks()
  }, [])

  const loadDomainChecks = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/domain-checks?limit=50`)
      const data = await res.json()
      setChecks(data.domain_checks || [])
    } catch (error) {
      toast.error("Lỗi khi tải lịch sử")
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = async (checkId) => {
    if (expandedId === checkId) {
      setExpandedId(null)
      return
    }

    setExpandedId(checkId)

    // Load detail if not cached
    if (!detailData[checkId]) {
      try {
        const res = await fetch(`${BASE_URL}/api/domain-checks/${checkId}`)
        const data = await res.json()
        setDetailData(prev => ({ ...prev, [checkId]: data }))
      } catch (error) {
        toast.error("Lỗi khi tải chi tiết")
      }
    }
  }

  const handleExport = (checkId, filterType) => {
    const url = `${BASE_URL}/api/export/${checkId}?filter=${filterType}`
    window.open(url, '_blank')
    toast.success(`Đang tải file ${filterType}...`)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center text-gray-500">
        Đang tải lịch sử...
      </div>
    )
  }

  if (checks.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center text-gray-500">
        Chưa có lịch sử kiểm tra domain
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {checks.map(check => {
        const isExpanded = expandedId === check.id
        const detail = detailData[check.id]

        return (
          <div key={check.id} className="rounded-2xl border bg-white shadow-soft overflow-hidden">
            {/* Header */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(check.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{check.domain}</h3>
                    <a
                      href={`https://${check.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 hover:text-brand-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Tổng: <strong>{check.total_urls}</strong></span>
                    <span className="text-emerald-600">Indexed: <strong>{check.indexed_count}</strong></span>
                    <span className="text-amber-600">Not Indexed: <strong>{check.not_indexed_count}</strong></span>
                    {check.error_count > 0 && (
                      <span className="text-rose-600">Error: <strong>{check.error_count}</strong></span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(check.created_at).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  {/* Export Buttons */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExport(check.id, 'indexed') }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                    title="Export URLs đã index"
                  >
                    <Download className="w-3 h-3" />
                    Indexed
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExport(check.id, 'not_indexed') }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 flex items-center gap-1"
                    title="Export URLs chưa index"
                  >
                    <Download className="w-3 h-3" />
                    Not Indexed
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExport(check.id, 'all') }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 flex items-center gap-1"
                    title="Export tất cả URLs"
                  >
                    <Download className="w-3 h-3" />
                    All
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Detail */}
            {isExpanded && detail && (
              <div className="border-t bg-gray-50 p-4">
                <h4 className="font-medium mb-3 text-sm text-gray-700">
                  Chi tiết {detail.urls.length} URLs:
                </h4>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {detail.urls.map((urlData, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white p-2 rounded-lg text-sm border"
                    >
                      <a
                        href={urlData.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-700 hover:underline flex-1 truncate mr-2"
                      >
                        {urlData.url}
                      </a>
                      <StatusBadge status={urlData.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StatusBadge({ status }) {
  if (status?.includes('Indexed ✅')) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle className="w-3 h-3" />
        Indexed
      </span>
    )
  }
  if (status?.includes('Not Indexed ❌')) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <XCircle className="w-3 h-3" />
        Not Indexed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
      <AlertCircle className="w-3 h-3" />
      Error
    </span>
  )
}
