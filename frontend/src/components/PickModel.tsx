import { useEffect, useState } from 'react'

type Props = {
  value: string
  onChange: (model: string) => void
}

function PickModel({ value, onChange }: Props) {
  const [models, setModels] = useState<string[]>([])
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
        // Keep a choice made earlier (e.g. after Back); otherwise default to the first.
        if (!data.includes(value)) onChange(data[0] ?? '')
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => controller.abort()
    // Load once on mount; `value`/`onChange` are only read for the initial default.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return <p className="text-red-400">Could not load car models: {error}</p>
  }

  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-gray-300">Model</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={models.length === 0}
        className="rounded-md border border-gray-500 bg-gray-800 px-3 py-2 text-gray-100 scheme-dark"
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
