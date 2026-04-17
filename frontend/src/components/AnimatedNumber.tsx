import { useEffect, useState } from 'react'
import { animate, useMotionValue, useTransform } from 'motion/react'

interface Props {
  value: number
  className?: string
  style?: React.CSSProperties
  format?: (value: number) => string
}

export function AnimatedNumber({ value, className, style, format }: Props) {
  const motionValue = useMotionValue(value)
  const rounded = useTransform(() => Math.round(motionValue.get()))
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.48,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: () => setDisplay(rounded.get()),
    })

    return () => controls.stop()
  }, [motionValue, rounded, value])

  return (
    <span className={className} style={style}>
      {format ? format(display) : display}
    </span>
  )
}
