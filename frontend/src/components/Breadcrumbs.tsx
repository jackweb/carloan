import { STEPS, type Step } from '../steps'

type Props = {
  current: Step
}

function Breadcrumbs({ current }: Props) {
  const currentIndex = STEPS.indexOf(current)

  return (
    <nav aria-label="Purchase steps">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {STEPS.map((step, i) => {
          const isCurrent = i === currentIndex
          const isDone = i < currentIndex
          return (
            <li key={step}>
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={`rounded-full border px-3 py-1 ${
                  isCurrent
                    ? 'border-sky-400 bg-sky-400/20 font-semibold text-sky-200'
                    : isDone
                      ? 'border-gray-500 bg-gray-800 text-gray-300'
                      : 'border-gray-700 text-gray-500'
                }`}
              >
                {step}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
