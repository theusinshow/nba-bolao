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
      }}
      aria-label="Carregando"
      role="status"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="32" cy="32" r="28" fill="var(--nba-gold)" />
        <circle cx="32" cy="32" r="28" stroke="var(--nba-gold-light)" strokeWidth="2.5" />
        <path d="M32 6C23 14 18 23 18 32C18 41 23 50 32 58" stroke="#11131A" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M32 6C41 14 46 23 46 32C46 41 41 50 32 58" stroke="#11131A" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M8 25C14 23 21 22 32 22C43 22 50 23 56 25" stroke="#11131A" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M8 39C14 41 21 42 32 42C43 42 50 41 56 39" stroke="#11131A" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
