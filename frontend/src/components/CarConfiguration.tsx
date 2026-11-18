import { useState } from 'react'
import Breadcrumbs from './Breadcrumbs'
import { isFirst, isLast, next, prev, type Step } from '../steps'
import CarSteps from './CarSteps'
import { allPartsSet, type PartSettings } from '../parts'

async function createOrder(): Promise<string> {
  const res = await fetch('/api/order', { method: 'POST' })
  if (!res.ok) throw new Error(`POST /order failed: ${res.status}`)
  const { id } = (await res.json()) as { id: string; state: string }
  return id
}

async function setOrderModel(id: string | null, model: string): Promise<void> {
  if (!id) throw new Error('No order found; go back to Start and create one.')
  const res = await fetch(`/api/order/${encodeURIComponent(id)}/model`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  })
  if (!res.ok) throw new Error(`PUT /order/{id}/model failed: ${res.status}`)
}

/** The backend's `detail` message if it sent one, else a generic message. */
async function errorMessage(res: Response, what: string): Promise<string> {
  try {
    const { detail } = (await res.json()) as { detail?: unknown }
    if (typeof detail === 'string') return detail
  } catch {
    // Not JSON; fall through.
  }
  return `${what} failed: ${res.status}`
}

/**
 * Sends each part with PUT /order/{id}/parts/{slot}. Parts go one at a time, so a
 * valid combination can still clash with what the order held before (e.g. turbo20
 * while the order still has a manual gearbox). A part rejected with 409 is retried
 * after the others; only when a whole pass saves nothing is the conflict real.
 */
async function setOrderParts(id: string | null, parts: PartSettings): Promise<void> {
  if (!id) throw new Error('No order found; go back to Start and create one.')
  let remaining = Object.entries(parts)
  while (remaining.length > 0) {
    const rejected: [string, string][] = []
    let lastConflict = ''
    for (const [slot, option] of remaining) {
      const res = await fetch(
        `/api/order/${encodeURIComponent(id)}/parts/${encodeURIComponent(slot)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: option }),
        },
      )
      if (res.ok) continue
      const message = await errorMessage(res, `PUT /order/{id}/parts/${slot}`)
      if (res.status !== 409) throw new Error(message)
      rejected.push([slot, option])
      lastConflict = message
    }
    if (rejected.length === remaining.length) throw new Error(lastConflict)
    remaining = rejected
  }
}

function CarConfiguration() {
  const [step, setStep] = useState<Step>("Start");
  const [orderId, setOrderId] = useState<string | null>(null)
  const [model, setModel] = useState('')
  const [parts, setParts] = useState<PartSettings>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Runs the API call that completes `step`; resolves when it's safe to advance. */
  async function submitStep(step: Step): Promise<void> {
    if (step === 'Start') {
      setOrderId(await createOrder())
    } else if (step === 'Pick model') {
      await setOrderModel(orderId, model)
    } else if (step === 'Configure parts') {
      await setOrderParts(orderId, parts)
    }
  }

  async function handleGo() {
    setError(null)
    setPending(true)
    try {
      await submitStep(step)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return
    } finally {
      setPending(false)
    }
    setStep((step) => next(step))
  }

  return (
    <section className="mt-6 rounded-lg border border-gray-200 p-6 shadow-sm">
      <Breadcrumbs current={step} />
      <img
        src="/car.svg"
        alt="Sample car"
        className="mt-4 w-full rounded-md"
      />
      <div className="mt-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setStep((step) => prev(step))}
          // Once an order exists, Start (which creates one) is behind us for good.
          disabled={isFirst(step) || (orderId !== null && isFirst(prev(step)))}
          className="cursor-pointer select-none rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
        >
          Back
        </button>
        <div className="flex-1 text-center">
          <CarSteps
            step={step}
            model={model}
            onModelChange={setModel}
            parts={parts}
            onPartsChange={setParts}
          />
          {orderId && (
            <p className="mt-2 text-sm text-gray-500">
              Order ID: <span className="font-mono">{orderId}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleGo}
          disabled={
            isLast(step) ||
            pending ||
            (step === 'Pick model' && !model) ||
            (step === 'Configure parts' && !allPartsSet(parts))
          }
          className="cursor-pointer select-none rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isFirst(step) ? 'Create' : 'Next'}
        </button>
      </div>
      {error && <p className="mt-2 text-right text-red-600">{error}</p>}
    </section>
  )
}

export default CarConfiguration
