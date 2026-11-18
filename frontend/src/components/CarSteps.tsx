import type { Step } from '../steps'
import CarStep from './CarStep'
import ConfigureParts from './ConfigureParts'
import PickBank from './PickBank'
import PickModel from './PickModel'

type Props = {
  step: Step
  model: string
  onModelChange: (model: string) => void
}

function CarSteps({ step, model, onModelChange }: Props) {
  return (
    <>
      {step === 'Start' && (
        <CarStep>Welcome to the car purchase simulator</CarStep>
      )}
      {step === 'Pick model' && (
        <CarStep>
          <PickModel value={model} onChange={onModelChange} />
        </CarStep>
      )}
      {step === 'Configure parts' && (
        <CarStep>
          <ConfigureParts />
        </CarStep>
      )}
      {step === 'Quote' && (
        <CarStep>
          Estimated quote: <span className="font-semibold">$1,000</span>
        </CarStep>
      )}
      {step === 'Funding (loan)' && (
        <CarStep>
          <PickBank />
        </CarStep>
      )}
      {step === 'Confirm' && <CarStep />}
    </>
  )
}

export default CarSteps
