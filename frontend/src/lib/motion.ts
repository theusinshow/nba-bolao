export const premiumEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const premiumTween = {
  duration: 0.55,
  ease: premiumEase,
}

export const quickTween = {
  duration: 0.28,
  ease: premiumEase,
}

export const springPop = {
  type: 'spring' as const,
  stiffness: 240,
  damping: 22,
  mass: 0.9,
}

export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
}

export const softStaggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const fadeUpItem = {
  hidden: { opacity: 0, y: 18, filter: 'blur(10px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: premiumTween,
  },
}

export const fadeInItem = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: quickTween,
  },
}

export const scaleInItem = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springPop,
  },
}

export const cardHoverMotion = {
  rest: {
    y: 0,
    scale: 1,
    boxShadow: '0 0 0 rgba(0,0,0,0)',
  },
  hover: {
    y: -4,
    scale: 1.01,
    boxShadow: '0 18px 36px rgba(0,0,0,0.24)',
    transition: quickTween,
  },
}

export const pressMotion = {
  tap: {
    scale: 0.985,
    transition: { duration: 0.12 },
  },
}
