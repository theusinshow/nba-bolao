import type { CSSProperties } from 'react'

interface SkeletonCardProps {
  width?: string | number
  height?: string | number
  radius?: number
  style?: CSSProperties
  className?: string
}

export function SkeletonCard({
  width = '100%',
  height = 16,
  radius = 6,
  style,
  className = '',
}: SkeletonCardProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
      aria-hidden="true"
    />
  )
}
