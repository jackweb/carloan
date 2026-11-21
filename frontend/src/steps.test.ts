import { describe, expect, it } from 'vitest'
import { STEP, STEPS, canGoBack, isFirst, isLast, next, prev, type OrderState, type Step } from './steps'

const STATES = [null, 'draft', 'model_set', 'configuring', 'quoted', 'funded', 'confirmed'] as const

/**
 * Where Back is allowed, per step: the order states (`null` = no order yet) in which
 * Back is enabled. Every other state must keep Back disabled.
 */
const BACK_ALLOWED: Record<Step, readonly (OrderState | null)[]> = {
  // Nothing before the first step.
  [STEP.START]: [],
  // Start creates the order, so it can only be revisited while there is none.
  [STEP.PICK_MODEL]: [null],
  // The model can be changed until a loan is chosen.
  [STEP.CONFIGURE_PARTS]: [null, 'draft', 'model_set', 'configuring', 'quoted'],
  // Parts need a model (not `draft`) and are locked once funded.
  [STEP.QUOTE]: [null, 'model_set', 'configuring', 'quoted'],
  // Choosing funding commits to the configured car.
  [STEP.FUNDING]: [],
  // The loan can be changed until the order is confirmed.
  [STEP.CONFIRM]: [null, 'quoted', 'funded'],
}

describe('canGoBack', () => {
  const cases = STEPS.flatMap((step) =>
    STATES.map((state) => ({ step, state, expected: BACK_ALLOWED[step].includes(state) })),
  )

  it.each(cases)('$step with state $state → $expected', ({ step, state, expected }) => {
    expect(canGoBack(step, state)).toBe(expected)
  })
})

describe('step navigation', () => {
  it('isFirst / isLast mark only the ends', () => {
    expect(STEPS.filter(isFirst)).toEqual([STEP.START])
    expect(STEPS.filter(isLast)).toEqual([STEP.CONFIRM])
  })

  it('next walks forward and stops at the last step', () => {
    for (let i = 0; i < STEPS.length - 1; i++) expect(next(STEPS[i])).toBe(STEPS[i + 1])
    expect(next(STEP.CONFIRM)).toBe(STEP.CONFIRM)
  })

  it('prev walks back and stops at the first step', () => {
    for (let i = 1; i < STEPS.length; i++) expect(prev(STEPS[i])).toBe(STEPS[i - 1])
    expect(prev(STEP.START)).toBe(STEP.START)
  })
})
