import type React from 'react'

/**
 * Returns inline styles for team abbreviation text:
 * fill = primary_color, stroke = secondary_color (drawn behind fill via paint-order).
 *
 * width: stroke thickness in px (scale with font size — ~1/15 of font size is a good rule).
 */
export function teamAbbrStyle(
  primary_color: string | null | undefined,
  secondary_color: string | null | undefined,
  width = 1.5,
): React.CSSProperties {
  return {
    color: primary_color ?? 'var(--nba-text-muted)',
    WebkitTextStroke: secondary_color ? `${width}px ${secondary_color}` : undefined,
    paintOrder: 'stroke fill',
  }
}

/**
 * SVG-native equivalent — returns props for <text> elements.
 * paint-order="stroke fill" keeps the fill color clean on top.
 */
export function teamAbbrSVGProps(
  primary_color: string | null | undefined,
  secondary_color: string | null | undefined,
  strokeWidth = 0.8,
) {
  return {
    fill:       primary_color    ?? '#c8963c',
    stroke:     secondary_color  ?? 'none',
    strokeWidth: secondary_color ? strokeWidth : 0,
    paintOrder: 'stroke fill' as const,
  }
}
