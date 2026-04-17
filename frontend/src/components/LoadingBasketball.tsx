import loadingIcon from '../../../assets/loading.svg'

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
        className="loading-basketball-aura"
        aria-hidden="true"
        style={{
          width: size * 1.18,
          height: size * 1.18,
        }}
      />
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
        src={loadingIcon}
        alt=""
        aria-hidden="true"
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
      />
    </div>
  )
}
