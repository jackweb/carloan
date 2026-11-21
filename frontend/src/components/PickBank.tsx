import { useEffect, useState } from 'react'
import { usd } from '../format'
import { MAX_YEARS, MIN_YEARS, clampYears, monthlyPayment, type Loan } from '../loan'

type Bank = {
  id: string
  name: string
  // Decimal serialized as a string, in percent, e.g. "7.4900".
  apr: string
}

type Props = {
  // Car price to finance (the quote total); null when there is no quote yet.
  price: number | null
  value: Loan
  onChange: (loan: Loan) => void
}

function PickBank({ price, value, onChange }: Props) {
  const [banks, setBanks] = useState<Bank[]>([])
  // Kept as typed so the field can be cleared while editing; `value.years` holds the clamped number.
  const [yearsInput, setYearsInput] = useState(String(value.years))
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
        // Keep a choice made earlier (e.g. after Back); otherwise default to the first.
        if (!data.some((b) => b.id === value.bankId)) {
          onChange({ ...value, bankId: data[0]?.id ?? '' })
        }
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
    return <p className="text-red-400">Could not load banks: {error}</p>
  }

  const bank = banks.find((b) => b.id === value.bankId)
  const apr = bank ? Number(bank.apr) : null
  const { years } = value
  const months = years * 12
  const monthly =
    apr !== null && price !== null ? monthlyPayment(price, apr, months) : null
  const totalToRepay = monthly !== null ? monthly * months : null

  return (
    <div className="inline-flex flex-col items-stretch gap-4">
      <div className="inline-flex flex-wrap items-center justify-center gap-4">
        <label className="inline-flex items-center gap-2">
          <span className="text-gray-300">Select a bank</span>
          <select
            value={value.bankId}
            onChange={(e) => onChange({ ...value, bankId: e.target.value })}
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
        <label className="inline-flex items-center gap-2">
          <span className="text-gray-300">Years</span>
          <input
            type="number"
            min={MIN_YEARS}
            max={MAX_YEARS}
            step={1}
            value={yearsInput}
            onChange={(e) => {
              setYearsInput(e.target.value)
              onChange({ ...value, years: clampYears(e.target.value) })
            }}
            // Show the value actually used once the field loses focus.
            onBlur={() => setYearsInput(String(years))}
            className="w-20 rounded-md border border-gray-500 bg-gray-800 px-3 py-2 text-gray-100 scheme-dark"
          />
        </label>
      </div>
      {price === null && <p className="text-gray-400">No quote yet.</p>}
      {price !== null &&
        apr !== null &&
        monthly !== null &&
        totalToRepay !== null && (
          <div className="flex flex-col items-center gap-3">
            <p>
              <span className="text-gray-400">Monthly payment </span>
              <span className="text-2xl font-semibold text-sky-300">
                {usd.format(monthly)}
              </span>
              <span className="text-gray-400"> × {months} months</span>
            </p>
            <table className="text-left text-sm">
              <tbody>
                <tr>
                  <td className="pr-4 text-gray-400">car price</td>
                  <td className="text-right">{usd.format(price)}</td>
                </tr>
                <tr>
                  <td className="pr-4 text-gray-400">
                    interest ({apr.toFixed(2)}% APR, {years}{' '}
                    {years === 1 ? 'year' : 'years'})
                  </td>
                  <td className="text-right">
                    +{usd.format(totalToRepay - price)}
                  </td>
                </tr>
                <tr className="border-t border-gray-600 font-semibold">
                  <td className="pr-4">total to repay</td>
                  <td className="text-right">{usd.format(totalToRepay)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

export default PickBank
