import { useState } from 'react'

// Sample data until the model list comes from the backend.
const MODELS = ['Hatchback', 'Sedan', 'Estate', 'SUV', 'Coupe']

function PickModel() {
  const [model, setModel] = useState(MODELS[0])

  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-gray-700">Model</span>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        {MODELS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </label>
  )
}

export default PickModel
