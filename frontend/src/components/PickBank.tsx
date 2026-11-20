import { useEffect, useState } from 'react'
import { usd } from '../format'

type Bank = {
  id: string
  name: string
  // Decimal serialized as a string, in percent, e.g. "7.4900".
  apr: string
}

type Props = {
  // Car price to finance (the quote total); null when there is no quote yet.
  price: number | null
}

function PickBank({ price }: Props) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankId, setBankId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/bank', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`GET /bank failed: ${res.status}`)
        return res.json() as Promise<Bank[]>
      })
      .then((data) => {
        setBanks(data)
        setBankId(data[0]?.id ?? '')
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => controller.abort()
  }, [])

  if (error) {
    return <p className="text-red-400">Could not load banks: {error}</p>
  }

  const bank = banks.find((b) => b.id === bankId)
  const apr = bank ? Number(bank.apr) : null
  // Simple interest over one year: price × APR.
  const interest = apr !== null && price !== null ? (price * apr) / 100 : null

  return (
    <div className="inline-flex flex-col items-stretch gap-4">
      <label className="inline-flex items-center gap-2">
        <span className="text-gray-300">Select a bank</span>
        <select
          value={bankId}
          onChange={(e) => setBankId(e.target.value)}
          disabled={banks.length === 0}
          className="rounded-md border border-gray-500 bg-gray-800 px-3 py-2 text-gray-100 scheme-dark"
        >
          {banks.length === 0 && <option value="">Loading…</option>}
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({Number(b.apr).toFixed(2)}% APR)
            </option>
          ))}
        </select>
      </label>
      {price === null && <p className="text-gray-400">No quote yet.</p>}
      {price !== null && apr !== null && interest !== null && (
        <table className="text-left text-sm">
          <tbody>
            <tr>
              <td className="pr-4 text-gray-400">car price</td>
              <td className="text-right">{usd.format(price)}</td>
            </tr>
            <tr>
              <td className="pr-4 text-gray-400">
                interest ({apr.toFixed(2)}% APR, 1 year)
              </td>
              <td className="text-right">+{usd.format(interest)}</td>
            </tr>
            <tr className="border-t border-gray-600 font-semibold">
              <td className="pr-4">total to repay</td>
              <td className="text-right">{usd.format(price + interest)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}

export default PickBank
