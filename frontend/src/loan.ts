export type Loan = {
  // Empty until a bank is chosen.
  bankId: string
  years: number
}

export const MIN_YEARS = 1
export const MAX_YEARS = 10

/** Loan term in whole years; an empty or out-of-range entry falls back into range. */
export function clampYears(input: string): number {
  const typed = Number.parseInt(input, 10)
  return Number.isNaN(typed) ? MIN_YEARS : Math.min(MAX_YEARS, Math.max(MIN_YEARS, typed))
}

/**
 * Fixed monthly instalment that pays off `principal` in `months` payments,
 * with interest at `aprPercent` / 12 charged monthly on the remaining balance.
 */
export function monthlyPayment(principal: number, aprPercent: number, months: number): number {
  const rate = aprPercent / 100 / 12
  if (rate === 0) return principal / months
  return (principal * rate) / (1 - (1 + rate) ** -months)
}
