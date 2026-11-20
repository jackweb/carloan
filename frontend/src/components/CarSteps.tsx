import type { ReactNode } from 'react'
import { STEP, type Step } from '../steps'
import CarStep from './CarStep'
import type { PartSettings } from '../parts'
import ConfigureParts from './ConfigureParts'
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
}

function CarSteps({ step, model, onModelChange, parts, onPartsChange, quote }: Props) {
  const renderers: Record<Step, () => ReactNode> = {
    [STEP.START]: () => 'Welcome to the car purchase simulator',
    [STEP.PICK_MODEL]: () => <PickModel value={model} onChange={onModelChange} />,
    [STEP.CONFIGURE_PARTS]: () => <ConfigureParts value={parts} onChange={onPartsChange} />,
    [STEP.QUOTE]: () => <QuoteSummary quote={quote} />,
    [STEP.FUNDING]: () => <PickBank price={quote?.total ?? null} />,
    [STEP.CONFIRM]: () => null,
  }

  return <CarStep key={step}>{renderers[step]()}</CarStep>
}

export default CarSteps
