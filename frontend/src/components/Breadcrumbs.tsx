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
            <li key={step} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden="true" className="text-gray-400">
                  →
                </span>
              )}
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={
                  isCurrent
                    ? 'font-semibold text-blue-700'
                    : isDone
                      ? 'text-gray-700'
                      : 'text-gray-400'
                }
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
