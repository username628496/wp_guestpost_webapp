const BASE_URL = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5050"

export async function checkIndex(urls = []) {
  const res = await fetch(`${BASE_URL}/api/check-index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls })
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  const data = await res.json()

  // Xử lý cả 2 format response: domain_groups (mới) và results (cũ)
  if (data?.domain_groups) {
    // Format mới: flatten domain_groups thành array
    const allResults = []
    Object.values(data.domain_groups).forEach(groupResults => {
      allResults.push(...groupResults)
    })
    return allResults
  }

  return data?.results || []
}

export async function fetchHistory() {
  try {
    const res = await fetch(`${BASE_URL}/api/history`)
    if (!res.ok) return []
    const data = await res.json()
    return data?.history || []
  } catch {
    return []
  }
}