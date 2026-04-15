import { useEffect, useState } from 'react'

const STORAGE_KEY = 'nba_bolao_onboarding_done'
const RESTART_EVENT = 'nba-bolao:restart-onboarding'

export function useOnboarding() {
  const [show, setShow] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== 'true'
  })

  useEffect(() => {
    function handleRestartEvent() {
      localStorage.removeItem(STORAGE_KEY)
      setShow(true)
    }

    window.addEventListener(RESTART_EVENT, handleRestartEvent)
    return () => window.removeEventListener(RESTART_EVENT, handleRestartEvent)
  }, [])

  function complete() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setShow(false)
  }

  function skip() {
    complete()
  }

  return { show, complete, skip }
}

export function restartOnboardingTour() {
  window.dispatchEvent(new Event(RESTART_EVENT))
}
