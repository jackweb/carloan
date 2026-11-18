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
