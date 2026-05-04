interface Props {
  size?: number
}

export function HomeCourtBadge({ size = 18 }: Props) {
  return (
    <img
      src="/svg-mando.svg"
      width={size}
      height={size}
      title="Mando de quadra"
      alt="Mando de quadra"
      style={{ flexShrink: 0, cursor: 'default', display: 'block' }}
    />
  )
}
