import type { ReactNode } from 'react'
import { STEP, type Step } from '../steps'
import type { PartSettings } from '../parts'
import ConfigureParts from './ConfigureParts'
import type { Loan } from '../loan'
import PickBank from './PickBank'
import PickModel from './PickModel'
import QuoteSummary, { type Quote } from './QuoteSummary'

type Props = {
  step: Step
  model: string
  onModelChange: (model: string) => void
  parts: PartSettings
  onPartsChange: (parts: PartSettings) => void
  quote: Quote | null
  loan: Loan
  onLoanChange: (loan: Loan) => void
}

function CarStep({
  step,
  model,
  onModelChange,
  parts,
  onPartsChange,
  quote,
  loan,
  onLoanChange,
}: Props) {
  const renderers: Record<Step, () => ReactNode> = {
    [STEP.START]: () => 'Welcome to the car purchase simulator',
    [STEP.PICK_MODEL]: () => <PickModel value={model} onChange={onModelChange} />,
    [STEP.CONFIGURE_PARTS]: () => <ConfigureParts value={parts} onChange={onPartsChange} />,
    [STEP.QUOTE]: () => <QuoteSummary quote={quote} />,
    [STEP.FUNDING]: () => (
      <PickBank price={quote?.total ?? null} value={loan} onChange={onLoanChange} />
    ),
    [STEP.CONFIRM]: () => null,
  }

  return renderers[step]()
}

export default CarStep
