import { useState } from 'react'
import Breadcrumbs from './Breadcrumbs'
import { STEP, isFirst, isLast, next, prev, type Step } from '../steps'
import CarStep from './CarStep'
import { allPartsSet, type PartSettings } from '../parts'
import type { Quote } from './QuoteSummary'

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

/** Sends all parts at once with PUT /order/{id}/parts as a `{slot: option}` map. */
async function setOrderParts(id: string | null, parts: PartSettings): Promise<void> {
  if (!id) throw new Error('No order found; go back to Start and create one.')
  const res = await fetch(`/api/order/${encodeURIComponent(id)}/parts`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parts),
  })
  if (!res.ok) throw new Error(await errorMessage(res, 'PUT /order/{id}/parts'))
}

/** POST /order/{id}/quote: prices the configured car and moves the order to `quoted`. */
async function fetchQuote(id: string | null): Promise<Quote> {
  if (!id) throw new Error('No order found; go back to Start and create one.')
  const res = await fetch(`/api/order/${encodeURIComponent(id)}/quote`, { method: 'POST' })
  if (!res.ok) throw new Error(await errorMessage(res, 'POST /order/{id}/quote'))
  return (await res.json()) as Quote
}

function CarConfiguration() {
  const [step, setStep] = useState<Step>(STEP.START);
  const [orderId, setOrderId] = useState<string | null>(null)
  const [model, setModel] = useState('')
  const [parts, setParts] = useState<PartSettings>({})
  const [quote, setQuote] = useState<Quote | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** API calls that complete each step; each resolves when it's safe to advance. Steps without one just advance. */
  const submitHandlers: Partial<Record<Step, () => Promise<void>>> = {
    [STEP.START]: async () => {
      setOrderId(await createOrder())
    },
    [STEP.PICK_MODEL]: async () => {
      await setOrderModel(orderId, model)
    },
    [STEP.CONFIGURE_PARTS]: async () => {
      // Saved parts invalidate any earlier quote; fetch a fresh one before showing the Quote step,
      // so a rule that only breaks once every slot is set keeps the user here with the error.
      setQuote(null)
      await setOrderParts(orderId, parts)
      setQuote(await fetchQuote(orderId))
    },
  }

  async function submitStep(step: Step): Promise<void> {
    await submitHandlers[step]?.()
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
    <section className="mt-6 rounded-lg border border-gray-700 bg-blue-950 p-6 shadow-sm">
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
          className="cursor-pointer select-none rounded-md border border-gray-500 px-4 py-2 font-medium text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600 disabled:hover:bg-transparent"
        >
          Back
        </button>
        <div className="flex-1 text-center">
          <CarStep
            key={step}
            step={step}
            model={model}
            onModelChange={setModel}
            parts={parts}
            onPartsChange={setParts}
            quote={quote}
          />
          {orderId && (
            <p className="mt-2 text-sm text-gray-400">
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
            (step === STEP.PICK_MODEL && !model) ||
            (step === STEP.CONFIGURE_PARTS && !allPartsSet(parts))
          }
          className="cursor-pointer select-none rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
        >
          {isFirst(step) ? 'Create' : 'Next'}
        </button>
      </div>
      {error && <p className="mt-2 text-right text-red-400">{error}</p>}
    </section>
  )
}

export default CarConfiguration
