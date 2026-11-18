import { useEffect, useState } from 'react'

function PickModel() {
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/car-model', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`GET /car-model failed: ${res.status}`)
        return res.json() as Promise<string[]>
      })
      .then((data) => {
        setModels(data)
        setModel(data[0] ?? '')
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => controller.abort()
  }, [])

  if (error) {
    return <p className="text-red-600">Could not load car models: {error}</p>
  }

  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-gray-700">Model</span>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        disabled={models.length === 0}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        {models.length === 0 && <option value="">Loading…</option>}
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </label>
  )
}

export default PickModel
