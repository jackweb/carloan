import type { ReactNode } from 'react'

type Props = {
  children?: ReactNode
}

function CarStep({ children }: Props) {
  return <>{children}</>
}

export default CarStep
