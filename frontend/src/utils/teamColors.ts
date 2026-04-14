/**
 * Team color utilities for dark-background contrast.
 *
 * primary_color values are official team colors optimised for light or
 * neutral backgrounds. Many are too dark to read on the app's #13131a surface.
 *
 * getTeamTextColor() returns the colour unchanged when it is already legible
 * and linearly lightens it toward white when it is not, preserving hue/identity.
 *
 * Use this function only for TEXT. For decorative elements (card gradients,
 * borders, accent bars) use primary_color directly — dark colours look fine
 * with low opacity.
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null
}

function perceivedBrightness(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 128
  // ITU-R BT.601 luma approximation
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
}

const TARGET_BRIGHTNESS = 112 // minimum for comfortable reading on #13131a

export function getTeamTextColor(primaryColor: string | null | undefined): string {
  if (!primaryColor) return 'var(--nba-text-muted)'
  const brightness = perceivedBrightness(primaryColor)
  if (brightness >= TARGET_BRIGHTNESS) return primaryColor
  const rgb = hexToRgb(primaryColor)
  if (!rgb) return primaryColor
  // Linear mix toward white — stronger lift for very dark colours
  const factor = Math.min(1, ((TARGET_BRIGHTNESS - brightness) / (255 - brightness)) * 1.35)
  const r = Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * factor))
  const g = Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * factor))
  const b = Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * factor))
  return `rgb(${r},${g},${b})`
}
