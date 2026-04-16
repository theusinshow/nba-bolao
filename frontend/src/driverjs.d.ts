declare module 'driver.js' {
  export interface DriveStep {
    element?: string | Element
    popover?: {
      title?: string
      description?: string
      side?: 'top' | 'right' | 'bottom' | 'left' | 'over'
      align?: 'start' | 'center' | 'end'
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
    onDestroyed?: () => void
  }

  export interface Driver {
    drive: () => void
    destroy: () => void
  }

  export function driver(options?: DriverOptions): Driver
}
