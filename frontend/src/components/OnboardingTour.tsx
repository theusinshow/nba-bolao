import { useEffect, useMemo, useRef } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

interface OnboardingTourProps {
  show: boolean
  onComplete: () => void
}

export function OnboardingTour({ show, onComplete }: OnboardingTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)

  const steps = useMemo<DriveStep[]>(() => {
    return [
      {
        popover: {
          title: 'Bem-vindo ao Bolão NBA 2026',
          description: 'Você vai palpitar séries e jogos, acompanhar seus pontos e disputar o topo do ranking em tempo real.',
          side: 'over',
          align: 'center',
        },
      },
      {
        element: '#bracket-highlight',
        popover: {
          title: 'Seu Bracket',
          description: 'Use este acesso para abrir o bracket e clicar em cada série para registrar seus palpites.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#bracket-highlight',
        popover: {
          title: 'Como funciona o modal',
          description: 'Dentro do bracket, ao tocar numa série você abre o SeriesModal para escolher vencedor e número de jogos.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#scoring-guide-highlight',
        popover: {
          title: 'Pontuação e cravada',
          description: 'Acertar vencedor gera pontos. Se também acertar em quantos jogos termina, vira cravada e vale mais.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#ranking-nav',
        popover: {
          title: 'Ranking ao vivo',
          description: 'Acompanhe sua posição em tempo real na aba Ranking conforme os resultados são atualizados.',
          side: 'top',
          align: 'center',
        },
      },
    ]
  }, [])

  useEffect(() => {
    if (!show) return

    const timeout = window.setTimeout(() => {
      const instance = driver({
        animate: true,
        showProgress: true,
        allowClose: true,
        overlayColor: 'rgba(10, 10, 15, 0.85)',
        popoverClass: 'nba-tour-popover',
        nextBtnText: 'Próximo →',
        prevBtnText: '← Voltar',
        doneBtnText: 'Começar!',
        steps,
        onDestroyed: () => {
          onComplete()
        },
      })

      driverRef.current = instance
      instance.drive()
    }, 350)

    return () => {
      window.clearTimeout(timeout)
      driverRef.current?.destroy()
      driverRef.current = null
    }
  }, [onComplete, show, steps])

  return null
}
