interface Props {
  size?: number
}

export function LoadingBasketball({ size = 32 }: Props) {
  return (
    <div
      className="loading-basketball-shell"
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
      aria-label="Carregando"
      role="status"
    >
      <span
        className="loading-basketball-shadow"
        aria-hidden="true"
        style={{
          width: size * 0.62,
          height: Math.max(6, size * 0.14),
        }}
      />
      <img
        className="loading-basketball-icon"
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
          position: 'relative',
          zIndex: 1,
        }}
      />
    </div>
  )
}
