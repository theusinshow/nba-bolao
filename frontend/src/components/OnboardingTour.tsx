import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

interface OnboardingTourProps {
  show: boolean
  onComplete: () => void
  profilePath: string
}

const ROUTE_KEY = 'nba_bolao_onboarding_route'
const TOUR_START_TIMEOUT_MS = 4000

const TOUR_ROUTES = ['/', '/games', '/ranking', '/analysis', '/compare', '/profile'] as const
type TourRoute = (typeof TOUR_ROUTES)[number]

const TOUR_STEPS: Record<TourRoute, DriveStep[]> = {
  '/': [
    {
      popover: {
        title: 'Bem-vindo ao Bolão NBA 2026',
        description: 'Este tour passa pelas páginas principais do app para mostrar onde você acompanha contexto, fecha palpites e disputa o ranking.',
        side: 'over',
        align: 'center',
      },
    },
    {
      element: '#home-nav',
      popover: {
        title: 'Home é seu painel principal',
        description: 'Aqui você abre o dia entendendo urgências, resumo da rodada, alertas e o que merece atenção imediata.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#home-summary-tour',
      popover: {
        title: 'Painel executivo do bolão',
        description: 'Este bloco resume sua situação no bolão, pontos, leitura da rodada e prioridades do momento.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#bracket-highlight',
      popover: {
        title: 'Acesso direto ao seu bracket',
        description: 'Use este atalho para abrir a área de palpites série por série e montar sua cartela principal.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#home-results-tour',
      popover: {
        title: 'Resultados reais e chave oficial',
        description: 'Aqui você acompanha o playoff real da NBA com contexto de série, impacto e link para a chave oficial.',
        side: 'top',
        align: 'center',
        nextBtnText: 'Ir para Jogos →',
      },
    },
  ],
  '/games': [
    {
      element: '#games-nav',
      popover: {
        title: 'Jogos é a área operacional',
        description: 'Esta aba concentra a agenda dos jogos, o fechamento dos picks e o que precisa ser salvo antes do lock.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#games-hero-tour',
      popover: {
        title: 'Radar do dia',
        description: 'O topo mostra quantas séries estão pendentes, quais estão urgentes e onde a sua atenção precisa cair primeiro.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#games-alerts-tour',
      popover: {
        title: 'Alertas inteligentes',
        description: 'Este painel resume lock iminente, lesões no radar e o contexto mais sensível da sua cartela.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#games-autopick-tour',
      popover: {
        title: 'Vai na fé',
        description: 'Se estiver sem tempo, este botão monta palpites aleatórios para você revisar antes de confirmar.',
        side: 'left',
        align: 'start',
        nextBtnText: 'Ir para Ranking →',
      },
    },
  ],
  '/ranking': [
    {
      element: '#ranking-nav',
      popover: {
        title: 'Ranking ao vivo',
        description: 'Aqui você acompanha sua posição, a distância para o topo e o movimento do pelotão em tempo real.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#ranking-hero-tour',
      popover: {
        title: 'Visão geral da corrida',
        description: 'O hero mostra sua situação atual, o líder e o tamanho da perseguição sem precisar ler a tabela inteira.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#ranking-table-tour',
      popover: {
        title: 'Tabela detalhada',
        description: 'Nesta área você vê a classificação completa, rival direto, pontos e o simulador de cenários quando houver séries abertas.',
        side: 'top',
        align: 'center',
        nextBtnText: 'Ir para Análise →',
      },
    },
  ],
  '/analysis': [
    {
      element: '#analysis-nav',
      popover: {
        title: 'Análise é sua central editorial',
        description: 'Esta página cruza agenda, odds, notícias e lesões para ajudar a ler melhor a rodada antes de fechar picks.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#analysis-hero-tour',
      popover: {
        title: 'Resumo de inteligência',
        description: 'O topo concentra a leitura executiva da rodada e diz rapidamente o que está ativo no radar do mercado.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#analysis-pressure-tour',
      popover: {
        title: 'Onde a rodada pesa',
        description: 'Este bloco destaca os confrontos mais sensíveis da rodada e onde uma baixa ou mudança de contexto pode pesar mais.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#analysis-injuries-tour',
      popover: {
        title: 'Relatório de lesões',
        description: 'Aqui ficam as ausências e dúvidas mais relevantes dos times ativos da rodada, já filtradas para leitura rápida.',
        side: 'left',
        align: 'center',
        nextBtnText: 'Ir para Comparar →',
      },
    },
  ],
  '/compare': [
    {
      element: '#compare-selection-tour',
      popover: {
        title: 'Compare brackets lado a lado',
        description: 'Nesta página você abre um duelo direto entre dois participantes e enxerga onde os brackets se separam.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#compare-selection-tour',
      popover: {
        title: 'Escolha os participantes',
        description: 'Use este painel para montar a comparação e analisar dois brackets específicos da galera.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#compare-critical-tour',
      popover: {
        title: 'Corredor crítico do duelo',
        description: 'Aqui o app mostra o ponto mais sensível ainda vivo entre dois brackets e onde a disputa pode virar.',
        side: 'top',
        align: 'center',
        nextBtnText: 'Ir para Perfil →',
      },
    },
  ],
  '/profile': [
    {
      element: '#profile-hero-tour',
      popover: {
        title: 'Perfil do participante',
        description: 'Aqui você acompanha sua identidade competitiva no bolão, posição atual, pontuação e retrato geral da campanha.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#profile-competitive-tour',
      popover: {
        title: 'Leitura da sua corrida',
        description: 'Este bloco resume momento, melhor trecho e zona de atenção para entender rapidamente como a sua campanha está se comportando.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#profile-dna-tour',
      popover: {
        title: 'DNA da cartela',
        description: 'Aqui o app traduz padrões do seu bracket em badges e sinais simples para mostrar seu estilo de jogo no bolão.',
        side: 'top',
        align: 'center',
        doneBtnText: 'Fechar tour',
      },
    },
  ],
}

function isTourRoute(value: string): value is TourRoute {
  return TOUR_ROUTES.includes(value as TourRoute)
}

function getStepSelectors(steps: DriveStep[]) {
  return steps
    .map((step) => (typeof step.element === 'string' ? step.element : null))
    .filter((selector): selector is string => Boolean(selector))
}

function waitForTourTargets(selectors: string[], timeoutMs: number) {
  if (selectors.length === 0) return Promise.resolve(true)

  return new Promise<boolean>((resolve) => {
    const startedAt = window.performance.now()

    const check = () => {
      const allPresent = selectors.every((selector) => document.querySelector(selector))
      if (allPresent) {
        resolve(true)
        return
      }

      if (window.performance.now() - startedAt >= timeoutMs) {
        resolve(false)
        return
      }

      window.requestAnimationFrame(check)
    }

    check()
  })
}

export function OnboardingTour({ show, onComplete, profilePath }: OnboardingTourProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const driverRef = useRef<ReturnType<typeof driver> | null>(null)
  const actionRef = useRef<'next-route' | 'prev-route' | 'finish' | 'skip' | null>(null)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  const storedRoute = sessionStorage.getItem(ROUTE_KEY)

  const currentRoute = useMemo<TourRoute>(() => {
    if (storedRoute && isTourRoute(storedRoute)) return storedRoute
    if (location.pathname.startsWith('/profile/')) return '/profile'
    if (isTourRoute(location.pathname)) return location.pathname
    return '/'
  }, [location.pathname, storedRoute])

  const routeIndex = TOUR_ROUTES.indexOf(currentRoute)
  const steps = TOUR_STEPS[currentRoute]

  useEffect(() => {
    if (!show) return

    const routePathname = location.pathname.startsWith('/profile/') ? '/profile' : location.pathname

    // Só inicia automaticamente do zero na Home. As demais rotas só participam
    // quando o tour já está em progresso via sessionStorage.
    if (!storedRoute && routePathname !== '/') return

    if (!isTourRoute(routePathname)) {
      const fallbackPath = currentRoute === '/profile' ? profilePath : currentRoute
      if (location.pathname !== fallbackPath) navigate(fallbackPath, { replace: true })
      return
    }

    sessionStorage.setItem(ROUTE_KEY, currentRoute)

    let cancelled = false
    const selectors = getStepSelectors(steps)

    void waitForTourTargets(selectors, TOUR_START_TIMEOUT_MS).then(() => {
      if (cancelled) return

      const instance = driver({
        animate: true,
        showProgress: true,
        allowClose: true,
        overlayColor: 'rgba(10, 10, 15, 0.85)',
        popoverClass: 'nba-tour-popover',
        nextBtnText: 'Próximo →',
        prevBtnText: '← Voltar',
        doneBtnText: 'Fechar tour',
        steps,
        onNextClick: (_element, _step, { driver }) => {
          if (!driver.isLastStep()) {
            driver.moveNext()
            return
          }

          if (routeIndex < TOUR_ROUTES.length - 1) {
            actionRef.current = 'next-route'
            driver.destroy()
            return
          }

          actionRef.current = 'finish'
          driver.destroy()
        },
        onPrevClick: (_element, _step, { driver }) => {
          if (!driver.isFirstStep()) {
            driver.movePrevious()
            return
          }

          if (routeIndex > 0) {
            actionRef.current = 'prev-route'
            driver.destroy()
          }
        },
        onCloseClick: () => {
          actionRef.current = 'skip'
          instance.destroy()
        },
        onDestroyed: () => {
          driverRef.current = null
          const action = actionRef.current
          actionRef.current = null

          if (action === 'skip' || action === 'finish') {
            onCompleteRef.current()
            return
          }

          if (action === 'next-route') {
            const nextRoute = TOUR_ROUTES[routeIndex + 1]
            if (nextRoute) {
              sessionStorage.setItem(ROUTE_KEY, nextRoute)
              navigate(nextRoute === '/profile' ? profilePath : nextRoute)
            }
            return
          }

          if (action === 'prev-route') {
            const previousRoute = TOUR_ROUTES[routeIndex - 1]
            if (previousRoute) {
              sessionStorage.setItem(ROUTE_KEY, previousRoute)
              navigate(previousRoute === '/profile' ? profilePath : previousRoute)
            }
          }
        },
      })

      driverRef.current = instance
      instance.drive()
    })

    return () => {
      cancelled = true
      driverRef.current?.destroy()
      driverRef.current = null
    }
  }, [currentRoute, location.pathname, navigate, profilePath, routeIndex, show, steps, storedRoute])

  return null
}
