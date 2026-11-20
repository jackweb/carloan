import { useState } from 'react'
import { PART_NAMES, PARTS, type PartSettings } from '../parts'

const selectBase = 'rounded-md border px-3 py-2 scheme-dark'
const selectClass = `${selectBase} border-gray-500 bg-gray-800 text-gray-100`
// Draws attention to a select that still needs a choice.
const selectPendingClass = `${selectBase} border-sky-400 bg-blue-900 text-gray-100 ring-2 ring-sky-400/50`

type Props = {
  value: PartSettings
  onChange: (settings: PartSettings) => void
}

function ConfigureParts({ value: matches, onChange }: Props) {
  // Start on the first part still to set (e.g. when coming back to this step).
  const [part, setPart] = useState(
    () => PART_NAMES.find((p) => !(p in matches)) ?? PART_NAMES[0],
  )

  function changeSetting(setting: string) {
    const updated = { ...matches, [part]: setting }
    onChange(updated)
    // Move on to the next part that has no setting yet, searching forward from
    // this one and wrapping around; once every part is set, stay where we are.
    const i = PART_NAMES.indexOf(part)
    const unset = [...PART_NAMES.slice(i + 1), ...PART_NAMES.slice(0, i)].find(
      (p) => !(p in updated),
    )
    if (unset) setPart(unset)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="inline-flex flex-wrap items-center justify-center gap-4">
        <label className="inline-flex items-center gap-2">
          <span className="text-gray-300">Part</span>
          <select
            value={part}
            onChange={(e) => setPart(e.target.value)}
            className={selectClass}
          >
            {PART_NAMES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-gray-300">Setting</span>
          <select
            value={matches[part] ?? ''}
            onChange={(e) => changeSetting(e.target.value)}
            className={part in matches ? selectClass : selectPendingClass}
          >
            <option value="" disabled>
              — choose —
            </option>
            {PARTS[part].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {Object.keys(matches).length > 0 && (
        <ul className="text-left text-sm">
          {PART_NAMES.filter((p) => p in matches).map((p) => (
            <li key={p}>
              <span className="text-gray-400">{p}:</span>{' '}
              <span className="font-medium">{matches[p]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ConfigureParts
