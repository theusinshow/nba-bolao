declare module 'driver.js' {
  export type DriverHook = (element: Element | undefined, step: DriveStep, opts: {
    driver: Driver
    config: DriverOptions
    state: Record<string, unknown>
  }) => void

  export interface DriveStep {
    element?: string | Element
    onHighlightStarted?: DriverHook
    onHighlighted?: DriverHook
    onDeselected?: DriverHook
    popover?: {
      title?: string
      description?: string
      side?: 'top' | 'right' | 'bottom' | 'left' | 'over'
      align?: 'start' | 'center' | 'end'
      nextBtnText?: string
      prevBtnText?: string
      doneBtnText?: string
      showButtons?: Array<'next' | 'previous' | 'close'>
      disableButtons?: Array<'next' | 'previous' | 'close'>
      onNextClick?: DriverHook
      onPrevClick?: DriverHook
      onCloseClick?: DriverHook
    }
  }

  export interface DriverOptions {
    animate?: boolean
    showProgress?: boolean
    allowClose?: boolean
    overlayColor?: string
    popoverClass?: string
    nextBtnText?: string
    prevBtnText?: string
    doneBtnText?: string
    steps?: DriveStep[]
    onNextClick?: DriverHook
    onPrevClick?: DriverHook
    onCloseClick?: DriverHook
    onDestroyed?: () => void
  }

  export interface Driver {
    isActive: () => boolean
    drive: () => void
    moveNext: () => void
    movePrevious: () => void
    getActiveIndex: () => number | undefined
    isFirstStep: () => boolean
    isLastStep: () => boolean
    setSteps: (steps: DriveStep[]) => void
    destroy: () => void
  }

  export function driver(options?: DriverOptions): Driver
}
