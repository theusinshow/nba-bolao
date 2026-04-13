interface Props {
  size?: number
}

export function LoadingBasketball({ size = 32 }: Props) {
  return (
    <div
      className="animate-spin"
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.22))',
        transformOrigin: 'center',
      }}
      aria-label="Carregando"
      role="status"
    >
      <img
        src="/loading-basketball.svg"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          display: 'block',
          objectFit: 'contain',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
