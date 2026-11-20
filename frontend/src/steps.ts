export const STEP = {
  START: 'Start',
  PICK_MODEL: 'Pick model',
  CONFIGURE_PARTS: 'Configure parts',
  QUOTE: 'Quote',
  FUNDING: 'Funding (loan)',
  CONFIRM: 'Confirm',
} as const

export const STEPS = [
  STEP.START,
  STEP.PICK_MODEL,
  STEP.CONFIGURE_PARTS,
  STEP.QUOTE,
  STEP.FUNDING,
  STEP.CONFIRM,
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
