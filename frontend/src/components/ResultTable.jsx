import { useMemo } from "react"
import { CheckCircle2, XCircle, AlertTriangle, Copy } from "lucide-react"
import toast from "react-hot-toast"

export default function ResultTable({ results }) {
  const rows = useMemo(() => results || [], [results])

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url)
    toast.success("Đã copy URL")
  }

  const exportCSV = () => {
    if (!rows.length) return
    const header = "url,status,checked_at\n"
    const csv = header + rows.map(r => {
      const s = r.status?.replaceAll(",", " ")
      return `${r.url},${s},${r.checked_at||""}`
    }).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "index-results.csv"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center text-gray-500">
        Chưa có kết quả — hãy nhập URL và bấm “Kiểm tra Index”.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Kết quả</h2>
        <button onClick={exportCSV} className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50">
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 pr-4">URL</th>
              <th className="py-2 pr-4">Trạng thái</th>
              <th className="py-2">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-b last:border-none">
                <td className="py-2 pr-4 max-w-[520px]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={()=>copyUrl(r.url)}
                      className="p-1 rounded-md hover:bg-gray-100"
                      title="Copy URL"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline break-all">
                      {r.url}
                    </a>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <StatusPill status={r.status}/>
                </td>
                <td className="py-2 text-gray-600">{formatTime(r.checked_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusPill({ status }) {
  if (status?.startsWith("Indexed")) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
        <CheckCircle2 className="w-4 h-4" /> Indexed
      </span>
    )
  }
  if (status === "Error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-full">
        <AlertTriangle className="w-4 h-4" /> Error
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
      <XCircle className="w-4 h-4" /> Not Indexed
    </span>
  )
}

function formatTime(ts) {
  if (!ts) return "—"
  try {
    const d = new Date(ts)
    return d.toLocaleString()
  } catch {
    return ts
  }
}