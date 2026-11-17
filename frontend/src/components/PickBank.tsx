import { useState } from 'react'

// Hardcoded until the list comes from GET /bank.
const BANKS = ['Bank A', 'Bank B', 'Bank C', 'Bank D']

function PickBank() {
  const [bank, setBank] = useState(BANKS[0])

  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-gray-700">Select a bank</span>
      <select
        value={bank}
        onChange={(e) => setBank(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        {BANKS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
    </label>
  )
}

export default PickBank
