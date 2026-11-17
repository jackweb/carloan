export const STEPS = [
  'Start',
  'Pick model',
  'Configure parts',
  'Quote',
  'Funding (loan)',
  'Confirm',
] as const

export type Step = (typeof STEPS)[number]

export function isLast(step: Step): boolean {
  return step === STEPS[STEPS.length - 1]
}

export function isFirst(step: Step): boolean {
  return step === STEPS[0]
}

/** Returns the step before `step`; the first step returns itself. */
export function prev(step: Step): Step {
  const i = STEPS.indexOf(step)
  return STEPS[Math.max(i - 1, 0)]
}

/** Returns the step after `step`; the last step returns itself. */
export function next(step: Step): Step {
  const i = STEPS.indexOf(step)
  return STEPS[Math.min(i + 1, STEPS.length - 1)]
}
