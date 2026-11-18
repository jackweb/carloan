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
