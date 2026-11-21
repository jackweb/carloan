import { describe, expect, it } from 'vitest'
import {
  PART_NAMES,
  PARTS,
  allPartsSet,
  firstUnsetPart,
  nextUnsetPart,
  type PartSettings,
} from './parts'

/** Settings for just the given parts (each part's first option). */
function only(...names: string[]): PartSettings {
  return Object.fromEntries(names.map((p) => [p, PARTS[p][0]]))
}

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

describe('firstUnsetPart', () => {
  it('starts on the first part when nothing is set', () => {
    expect(firstUnsetPart({})).toBe('engine')
  })

  it('skips parts that are already set', () => {
    expect(firstUnsetPart(only('engine', 'gearbox'))).toBe('wheels')
  })

  it('finds a gap in the middle', () => {
    expect(firstUnsetPart(only('engine', 'gearbox', 'suspension'))).toBe('wheels')
  })

  it('falls back to the first part once every part is set', () => {
    expect(firstUnsetPart(everyPart())).toBe('engine')
  })
})

describe('nextUnsetPart', () => {
  it('moves to the following part', () => {
    expect(nextUnsetPart('engine', only('engine'))).toBe('gearbox')
  })

  it('skips parts that are already set', () => {
    expect(nextUnsetPart('engine', only('engine', 'gearbox', 'wheels'))).toBe('suspension')
  })

  it('wraps around past the last part', () => {
    expect(nextUnsetPart('extras', only('engine', 'extras'))).toBe('gearbox')
  })

  it('searches forward before wrapping', () => {
    // Both gearbox (behind) and interior (ahead) are unset; ahead wins.
    expect(nextUnsetPart('paint', only('engine', 'wheels', 'suspension', 'paint', 'extras'))).toBe(
      'interior',
    )
  })

  it('stays on the current part once every part is set', () => {
    expect(nextUnsetPart('paint', everyPart())).toBe('paint')
  })

  it('stays on the current part when it is the only one unset', () => {
    const settings = everyPart()
    delete settings.wheels
    expect(nextUnsetPart('wheels', settings)).toBe('wheels')
  })
})
