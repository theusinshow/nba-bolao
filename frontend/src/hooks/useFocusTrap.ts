import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Traps keyboard focus inside the referenced container while active.
 * Also restores focus to the previously focused element on cleanup.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T>(null)
  const previousFocusRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!active) return

    previousFocusRef.current = document.activeElement

    const container = containerRef.current
    if (!container) return

    // Focus the first focusable element inside the container
    const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
    focusables[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const els = Array.from(container!.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that was focused before the modal opened
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus()
      }
    }
  }, [active])

  return containerRef
}
