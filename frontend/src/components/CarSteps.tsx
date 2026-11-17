import type { Step } from '../steps'
import CarStep from './CarStep'

type Props = {
  step: Step
}

function CarSteps({ step }: Props) {
  return (
    <>
      {step === 'Start' && <CarStep />}
      {step === 'Pick model' && <CarStep />}
      {step === 'Configure parts' && <CarStep />}
      {step === 'Quote' && <CarStep />}
      {step === 'Funding (loan)' && <CarStep />}
      {step === 'Confirm' && <CarStep />}
    </>
  )
}

export default CarSteps
