import { useState } from 'react'
import Breadcrumbs from './Breadcrumbs'
import { isFirst, isLast, next, prev, type Step } from '../steps'
import CarSteps from './CarSteps'

function CarConfiguration() {
  const [step, setStep] = useState<Step>("Start");

  return (
    <section className="mt-6 rounded-lg border border-gray-200 p-6 shadow-sm">
      <Breadcrumbs current={step} />
      <img
        src="/car.svg"
        alt="Sample car"
        className="mt-4 w-full rounded-md"
      />
      <CarSteps step={step} />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setStep((step) => prev(step))}
          disabled={isFirst(step)}
          className="cursor-pointer select-none rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep((step) => next(step))}
          disabled={isLast(step)}
          className="cursor-pointer select-none rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Go
        </button>
      </div>
    </section>
  )
}

export default CarConfiguration
