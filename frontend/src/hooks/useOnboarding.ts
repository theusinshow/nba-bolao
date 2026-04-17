import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'nba_bolao_onboarding_done'
const ROUTE_KEY = 'nba_bolao_onboarding_route'
const RESTART_EVENT = 'nba-bolao:restart-onboarding'
const ONBOARDING_TOUR_DISABLED = false

export function useOnboarding() {
  const [show, setShow] = useState(() => {
    if (ONBOARDING_TOUR_DISABLED) return false
    return localStorage.getItem(STORAGE_KEY) !== 'true'
  })

  useEffect(() => {
    if (ONBOARDING_TOUR_DISABLED) {
      localStorage.setItem(STORAGE_KEY, 'true')
      sessionStorage.removeItem(ROUTE_KEY)
      setShow(false)
      return
    }

    function handleRestartEvent() {
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(ROUTE_KEY)
      setShow(true)
    }

    window.addEventListener(RESTART_EVENT, handleRestartEvent)
    return () => window.removeEventListener(RESTART_EVENT, handleRestartEvent)
  }, [])

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    sessionStorage.removeItem(ROUTE_KEY)
    setShow(false)
  }, [])

  const skip = complete

  return { show, complete, skip }
}

export function restartOnboardingTour() {
  if (ONBOARDING_TOUR_DISABLED) return
  window.dispatchEvent(new Event(RESTART_EVENT))
}
