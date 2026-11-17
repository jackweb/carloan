import { useState } from 'react'

// Sample data mirroring the backend catalog until it is fetched from GET /slot.
const PARTS: Record<string, string[]> = {
  engine: ['petrol15', 'turbo20', 'electric'],
  gearbox: ['manual', 'auto'],
  wheels: ['17', '18', '19'],
  suspension: ['comfort', 'sport'],
  paint: ['white', 'grey', 'metallic_blue'],
  interior: ['cloth', 'leather'],
  extras: ['tow_bar', 'roof_rails', 'sunroof', 'heated_seats'],
}

const PART_NAMES = Object.keys(PARTS)

const selectClass = 'rounded-md border border-gray-300 px-3 py-2'

function ConfigureParts() {
  const [part, setPart] = useState(PART_NAMES[0])
  // Chosen setting per part, e.g. { engine: 'turbo20', gearbox: 'auto' }.
  const [matches, setMatches] = useState<Record<string, string>>({})

  function changeSetting(setting: string) {
    setMatches((prev) => ({ ...prev, [part]: setting }))
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="inline-flex flex-wrap items-center justify-center gap-4">
        <label className="inline-flex items-center gap-2">
          <span className="text-gray-700">Part</span>
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
          <span className="text-gray-700">Setting</span>
          <select
            value={matches[part] ?? ''}
            onChange={(e) => changeSetting(e.target.value)}
            className={selectClass}
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
              <span className="text-gray-500">{p}:</span>{' '}
              <span className="font-medium">{matches[p]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ConfigureParts
