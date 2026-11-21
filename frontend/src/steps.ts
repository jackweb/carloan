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

/** The backend's order lifecycle (backend/src/backend/models.py `OrderState`). */
export type OrderState = 'draft' | 'model_set' | 'configuring' | 'quoted' | 'funded' | 'confirmed'

// Mirrors the editability rules in backend/src/backend/routing/orders.py.
const MODEL_LOCKED_STATES: readonly OrderState[] = ['funded', 'confirmed']
const PARTS_EDITABLE_STATES: readonly OrderState[] = ['model_set', 'configuring', 'quoted']
const LOAN_EDITABLE_STATES: readonly OrderState[] = ['quoted', 'funded']

/**
 * Whether Back may leave `step` for the step before it, given the order's state
 * (`null` while no order exists yet).
 */
export function canGoBack(step: Step, state: OrderState | null): boolean {
  if (isFirst(step)) return false
  // Choosing funding commits to the configured car, so the car steps are behind us.
  if (step === STEP.FUNDING) return false
  const target = prev(step)
  // Once an order exists, Start (which creates one) is behind us for good.
  if (target === STEP.START) return state === null
  if (state === null) return true
  if (target === STEP.PICK_MODEL) return !MODEL_LOCKED_STATES.includes(state)
  if (target === STEP.CONFIGURE_PARTS) return PARTS_EDITABLE_STATES.includes(state)
  if (target === STEP.FUNDING) return LOAN_EDITABLE_STATES.includes(state)
  return true
}

/** Returns the step after `step`; the last step returns itself. */
export function next(step: Step): Step {
  const i = STEPS.indexOf(step)
  return STEPS[Math.min(i + 1, STEPS.length - 1)]
}
