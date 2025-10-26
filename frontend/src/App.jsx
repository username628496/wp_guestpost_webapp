import React, { useState, useEffect, useMemo } from "react"
import { Search, Download, CheckCircle, XCircle, AlertCircle, History, Loader2, ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { Toaster, toast } from "react-hot-toast"

const API_URL = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5050"

export default function App() {
  const [domains, setDomains] = useState("")
  const [processing, setProcessing] = useState(false)
  const [currentResults, setCurrentResults] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [statusFilter, setStatusFilter] = useState("all") // all, indexed, not_indexed, error
  const [expandedDomains, setExpandedDomains] = useState(new Set()) // Track expanded domains in results
  const [expandedHistory, setExpandedHistory] = useState(new Set()) // Track expanded history items
  const [historyDetails, setHistoryDetails] = useState({}) // Store fetched history details

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [])

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

  // Process multiple domains
  const handleProcess = async () => {
    const domainList = domains.split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0)

    if (domainList.length === 0) {
      toast.error("Vui lòng nhập ít nhất 1 domain")
      return
    }

    setProcessing(true)
    setCurrentResults([])

    try {
      let allUrls = []

      // Step 1: Fetch sitemaps for all domains
      toast.loading("Đang lấy sitemap từ domains...", { id: 'fetch' })

      for (const domain of domainList) {
        try {
          const res = await fetch(`${API_URL}/api/fetch-sitemap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain, max_urls: 500 })
          })
          const data = await res.json()

          if (data.urls && data.urls.length > 0) {
            allUrls = allUrls.concat(data.urls)
          } else {
            // Fallback to homepage
            const homepage = domain.startsWith("http") ? domain : `https://${domain}`
            allUrls.push(homepage)
          }
        } catch (error) {
          console.error(`Failed to fetch sitemap for ${domain}:`, error)
        }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-mint-500 rounded-lg flex items-center justify-center">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Multi-Domain Index Checker</h1>
                <p className="text-sm text-gray-500">Kiểm tra Google index cho nhiều domains</p>
              </div>
            </div>

            {/* Stats in header */}
            {currentResults.length > 0 && (
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{stats.total}</div>
                  <div className="text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{stats.indexed}</div>
                  <div className="text-gray-500">Indexed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-600">{stats.notIndexed}</div>
                  <div className="text-gray-500">Not Indexed</div>
                </div>
                {stats.errors > 0 && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{stats.errors}</div>
                    <div className="text-gray-500">Errors</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Input Panel */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Input Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhập Domains (mỗi dòng 1 domain)
              </label>
              <textarea
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
                placeholder={"k9win.com.vc\nexample.com\nanother-domain.com"}
                rows="8"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-transparent resize-none"
                disabled={processing}
              />
              <button
                onClick={handleProcess}
                disabled={processing}
                className="w-full mt-3 px-4 py-3 bg-mint-500 text-white rounded-lg font-medium hover:bg-mint-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Crawl & Check Index
                  </>
                )}
              </button>
            </div>

            {/* Export Card */}
            {currentResults.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Kết Quả
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleExport('indexed')}
                    className="w-full px-3 py-2 text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100"
                  >
                    Export Indexed ({stats.indexed})
                  </button>
                  <button
                    onClick={() => handleExport('not_indexed')}
                    className="w-full px-3 py-2 text-sm bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100"
                  >
                    Export Not Indexed ({stats.notIndexed})
                  </button>
                  <button
                    onClick={() => handleExport('all')}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    Export All ({stats.total})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Results & History */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Current Results */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Kết Quả Mới Nhất</h2>

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

              <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                {currentResults.length === 0 ? (
                  <EmptyState
                    icon={<Search className="w-12 h-12 text-gray-400" />}
                    title="Chưa có kết quả"
                    description="Nhập domains và click 'Crawl & Check Index' để bắt đầu"
                  />
                ) : (
                  <div className="divide-y divide-gray-200">
                    {Object.entries(filteredGroupedResults).map(([domain, data]) => (
                      <div key={domain} className="border-b border-gray-100">
                        {/* Domain Header - Clickable */}
                        <button
                          onClick={() => toggleDomain(domain)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-mint-500">
                              {expandedDomains.has(domain) ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{domain}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {data.total} URLs
                              </div>
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

                        {/* URL List - Expandable */}
                        {expandedDomains.has(domain) && (
                          <div className="bg-gray-50">
                            <table className="w-full">
                              <thead className="bg-gray-100 border-y border-gray-200">
                                <tr>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {data.urls.map((result, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-2 text-sm">
                                      <a href={result.url} target="_blank" rel="noreferrer" className="text-mint-600 hover:underline truncate block max-w-md">
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
                                ))}
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

            {/* History */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Lịch Sử Kiểm Tra
                </h2>
                <div className="flex gap-2">
                  {historyData.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Xóa tất cả
                    </button>
                  )}
                  <button
                    onClick={loadHistory}
                    className="text-sm text-mint-600 hover:text-mint-700"
                  >
                    Làm mới
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                {historyData.length === 0 ? (
                  <EmptyState
                    icon={<History className="w-12 h-12 text-gray-400" />}
                    title="Chưa có lịch sử"
                    description="Lịch sử kiểm tra sẽ hiển thị ở đây"
                  />
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredHistory.map((item) => (
                      <div key={item.id} className="border-b border-gray-100">
                        {/* History Item Header - Clickable */}
                        <button
                          onClick={() => toggleHistory(item.id)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-mint-500">
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

                        {/* URL Details - Expandable */}
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
                                        <a href={url.url} target="_blank" rel="noreferrer" className="text-mint-600 hover:underline truncate block max-w-md">
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
      </div>

      <Toaster position="top-center" />
    </div>
  )
}

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
