// Sample data mirroring the backend catalog until it is fetched from GET /slot.
export const PARTS: Record<string, string[]> = {
  engine: ['petrol15', 'turbo20', 'electric'],
  gearbox: ['manual', 'auto'],
  wheels: ['17', '18', '19'],
  suspension: ['comfort', 'sport'],
  paint: ['white', 'grey', 'metallic_blue'],
  interior: ['cloth', 'leather'],
  extras: ['tow_bar', 'roof_rails', 'sunroof', 'heated_seats'],
}

export const PART_NAMES = Object.keys(PARTS)

/** Chosen setting per part, e.g. { engine: 'turbo20', gearbox: 'auto' }. */
export type PartSettings = Record<string, string>

export function allPartsSet(settings: PartSettings): boolean {
  return PART_NAMES.every((p) => p in settings)
}

/** The first part with no setting yet, or the first part once every part is set. */
export function firstUnsetPart(settings: PartSettings): string {
  return PART_NAMES.find((p) => !(p in settings)) ?? PART_NAMES[0]
}

/**
 * The next part with no setting yet, searching forward from `current` and wrapping
 * around; `current` itself once every other part is set.
 */
export function nextUnsetPart(current: string, settings: PartSettings): string {
  const i = PART_NAMES.indexOf(current)
  const others = [...PART_NAMES.slice(i + 1), ...PART_NAMES.slice(0, i)]
  return others.find((p) => !(p in settings)) ?? current
}
