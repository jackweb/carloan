import { describe, expect, it } from 'vitest'
import { MAX_YEARS, MIN_YEARS, clampYears, monthlyPayment } from './loan'

describe('monthlyPayment', () => {
  it('splits the principal evenly at 0% APR', () => {
    expect(monthlyPayment(12_000, 0, 12)).toBe(1_000)
  })

  it('matches the standard amortization formula', () => {
    // $20,000 at 6% APR over 5 years.
    expect(monthlyPayment(20_000, 6, 60)).toBeCloseTo(386.66, 2)
  })

  it('charges one month of interest on a single payment', () => {
    // 12% APR is 1% a month.
    expect(monthlyPayment(10_000, 12, 1)).toBeCloseTo(10_100, 6)
  })

  it('repays more than the principal when interest is charged', () => {
    const months = 36
    expect(monthlyPayment(15_000, 7.49, months) * months).toBeGreaterThan(15_000)
  })

  it('costs more per month at a higher APR and less over a longer term', () => {
    expect(monthlyPayment(20_000, 8, 60)).toBeGreaterThan(monthlyPayment(20_000, 6, 60))
    expect(monthlyPayment(20_000, 6, 120)).toBeLessThan(monthlyPayment(20_000, 6, 60))
  })
})

describe('clampYears', () => {
  it.each([
    ['7', 7],
    [String(MIN_YEARS), MIN_YEARS],
    [String(MAX_YEARS), MAX_YEARS],
  ])('keeps %s as is', (input, expected) => {
    expect(clampYears(input)).toBe(expected)
  })

  it.each([
    ['0', MIN_YEARS],
    ['-3', MIN_YEARS],
    ['11', MAX_YEARS],
    ['999', MAX_YEARS],
  ])('clamps out-of-range %s to %i', (input, expected) => {
    expect(clampYears(input)).toBe(expected)
  })

  it.each([
    ['', MIN_YEARS],
    ['abc', MIN_YEARS],
    ['-', MIN_YEARS],
  ])('falls back to the minimum for %j', (input, expected) => {
    expect(clampYears(input)).toBe(expected)
  })

  it('drops the fraction of a decimal entry', () => {
    expect(clampYears('2.7')).toBe(2)
  })
})
