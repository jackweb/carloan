import { describe, expect, it } from 'vitest'
import { PART_NAMES, PARTS, allPartsSet, type PartSettings } from './parts'

/** A setting for every part: each part's first option. */
function everyPart(): PartSettings {
  return Object.fromEntries(PART_NAMES.map((p) => [p, PARTS[p][0]]))
}

describe('allPartsSet', () => {
  it('is false when nothing is set', () => {
    expect(allPartsSet({})).toBe(false)
  })

  it('is false when only some parts are set', () => {
    expect(allPartsSet({ engine: 'turbo20', gearbox: 'auto' })).toBe(false)
  })

  it.each(PART_NAMES)('is false when only %s is missing', (missing) => {
    const settings = everyPart()
    delete settings[missing]
    expect(allPartsSet(settings)).toBe(false)
  })

  it('is true when every part is set', () => {
    expect(allPartsSet(everyPart())).toBe(true)
  })

  it('ignores keys that are not parts', () => {
    expect(allPartsSet({ ...everyPart(), spoiler: 'big' })).toBe(true)
    expect(allPartsSet({ spoiler: 'big' })).toBe(false)
  })
})
