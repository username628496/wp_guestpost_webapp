import { useState } from "react"
import { useIndexCheck } from "../hooks/useIndexCheck"
import { Search, Upload, Trash2, Settings2, Download } from "lucide-react"
import toast from "react-hot-toast"

export default function IndexCheckForm({ onResultsAppend, onBatchDone, onCheckStart, onCheckEnd }) {
  const [input, setInput] = useState("")
  const { running, run, batchSize, setBatchSize } = useIndexCheck({
    onResultsAppend, onBatchDone, onCheckStart, onCheckEnd
  })

  const urls = input.split(/\n+/).map(s => s.trim()).filter(Boolean)

  const handlePasteDemo = () => {
    setInput(["https://example.com","https://trms.uk.com/rut-tien-mayclub/"].join("\n"))
  }

  const handleUploadTxt = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setInput(prev => (prev ? prev + "\n" : "") + text.trim())
  }

  const handleExportTemplate = () => {
    const blob = new Blob(["https://example.com/page-1\nhttps://example.com/page-2"], { type: "text/plain;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "urls-template.txt"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleStart = () => {
    if (!urls.length) return toast.error("Nhập ít nhất 1 URL")
    run(urls)
  }

  const handleClear = () => setInput("")

  return (
    <section className="rounded-2xl border bg-white shadow-soft p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Kiểm tra Indexing</h2>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Nhập .txt</span>
            <input type="file" accept=".txt" className="hidden" onChange={handleUploadTxt}/>
          </label>
          <button onClick={handleExportTemplate} className="inline-flex items-center gap-2 text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Tải template
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr,260px] gap-3">
        <textarea
          className="w-full h-40 md:h-48 resize-y rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-brand-300"
          placeholder="Mỗi dòng 1 URL…"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={running}
        />

        <div className="space-y-3">
          <div className="rounded-xl border p-3">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <Settings2 className="w-4 h-4 text-brand-600" />
              Tuỳ chọn
            </div>
            <label className="text-sm text-gray-600">Batch size</label>
            <input
              type="number"
              min={5}
              max={100}
              step={5}
              value={batchSize}
              onChange={(e)=>setBatchSize(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
              disabled={running}
            />
            <p className="text-xs text-gray-500 mt-2">
              Gợi ý 10–30 để mượt và ổn định.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleStart}
              disabled={running || urls.length===0}
              className="inline-flex justify-center items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white py-2.5 disabled:opacity-60">
              <Search className="w-4 h-4" />
              {running ? "Đang kiểm tra…" : "Kiểm tra Index"}
            </button>
            <button
              onClick={handleClear}
              disabled={running || !input}
              className="inline-flex justify-center items-center gap-2 rounded-xl border py-2.5 hover:bg-gray-50">
              <Trash2 className="w-4 h-4" />
              Xoá
            </button>
            <button
              onClick={handlePasteDemo}
              disabled={running}
              className="col-span-2 inline-flex justify-center items-center gap-2 rounded-xl border py-2.5 hover:bg-gray-50">
              Dán ví dụ nhanh
            </button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            {urls.length} URL đã nhập
          </div>
        </div>
      </div>
    </section>
  )
}