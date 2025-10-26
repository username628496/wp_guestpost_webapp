export default function HistorySection({ history = [], loading }) {
    if (loading) {
      return (
        <div className="rounded-xl border bg-white p-4 text-gray-600">
          Đang tải lịch sử…
        </div>
      )
    }
  
    if (!history.length) {
      return (
        <div className="rounded-xl border bg-white p-4 text-gray-500">
          Chưa có lịch sử gần đây.
        </div>
      )
    }
  
    return (
      <div className="rounded-xl border bg-white p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 pr-4">URL</th>
              <th className="py-2 pr-4">Trạng thái</th>
              <th className="py-2">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i} className="border-b last:border-none">
                <td className="py-2 pr-4">
                  <a className="text-brand-700 hover:underline break-all" href={h.url} target="_blank" rel="noreferrer">
                    {h.url}
                  </a>
                </td>
                <td className="py-2 pr-4">{h.status}</td>
                <td className="py-2 text-gray-600">{formatTime(h.checked_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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