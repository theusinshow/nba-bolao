import type React from 'react'

/** Primary color as text, no stroke. */
export function teamAbbrStyle(
  primary_color: string | null | undefined,
): React.CSSProperties {
  return { color: primary_color ?? 'var(--nba-text-muted)' }
}

/** SVG fill only, no stroke. */
export function teamAbbrSVGProps(primary_color: string | null | undefined) {
  return { fill: primary_color ?? '#c8963c' }
}
