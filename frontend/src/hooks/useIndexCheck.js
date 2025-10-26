import { useState } from "react"
import { checkIndex } from "../services/api"
import toast from "react-hot-toast"

/**
 * Client-side batching để hiển thị progress realtime (mặc dù backend cũng batch).
 * Điều này giúp UX mượt khi dán 200-500 URL.
 */
export function useIndexCheck({ onResultsAppend, onBatchDone, onCheckStart, onCheckEnd }) {
  const [running, setRunning] = useState(false)
  const [batchSize, setBatchSize] = useState(20)

  const run = async (urls) => {
    if (!urls?.length) return
    setRunning(true)

    const uniq = Array.from(new Set(urls.map(s => s.trim()).filter(Boolean)))
    onCheckStart?.(uniq.length)

    let done = 0
    for (let i = 0; i < uniq.length; i += batchSize) {
      const chunk = uniq.slice(i, i + batchSize)
      try {
        const results = await checkIndex(chunk)
        onResultsAppend?.(results)
      } catch (e) {
        console.error(e)
        toast.error(`Batch lỗi: ${e.message}`)
      }
      done += chunk.length
      onBatchDone?.(done, uniq.length)
      // nhỏ giọt để tránh nghẽn UI
      await new Promise(r => setTimeout(r, 150))
    }

    setRunning(false)
    onCheckEnd?.()
    toast.success("Hoàn tất kiểm tra!")
  }

  return { running, run, batchSize, setBatchSize }
}