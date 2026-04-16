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
      <svg
        className="loading-basketball-icon"
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 2000 2000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: size,
          height: size,
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
        }}
      >
        {/* Corpo da bola */}
        <circle cx="1000" cy="1000" r="940" fill="#1a1a24" stroke="#C8963C" strokeWidth="80" />

        {/* Linhas curvas do basquete */}
        <g stroke="#E05C3A" strokeWidth="55" strokeLinecap="round" fill="none" opacity="0.85">
          {/* Linha central horizontal */}
          <path d="M 62 1000 Q 500 820 1000 820 Q 1500 820 1938 1000" />
          <path d="M 62 1000 Q 500 1180 1000 1180 Q 1500 1180 1938 1000" />

          {/* Linha central vertical */}
          <path d="M 1000 62 Q 820 500 820 1000 Q 820 1500 1000 1938" />
          <path d="M 1000 62 Q 1180 500 1180 1000 Q 1180 1500 1000 1938" />
        </g>
      </svg>
    </div>
  )
}
