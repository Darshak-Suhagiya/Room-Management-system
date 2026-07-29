/** Shared motion configs for liquid-glass chrome (BottomNav, Modal sheets). */

export const springSnappy = {
  type: 'tween',
  duration: 0.28,
  ease: 'easeInOut',
}

export const springSoft = {
  type: 'tween',
  duration: 0.22,
  ease: 'easeInOut',
}

export const sheetTransition = {
  type: 'tween',
  duration: 0.3,
  ease: 'easeInOut',
}

/** Mobile bottom sheet — open with a subtle native settle. */
export const sheetOpenTransition = {
  type: 'spring',
  visualDuration: 0.42,
  bounce: 0.16,
}

/** Mobile bottom sheet — quick, clean dismiss without bounce. */
export const sheetCloseTransition = {
  type: 'spring',
  visualDuration: 0.32,
  bounce: 0,
}

export const fadeTransition = {
  type: 'tween',
  duration: 0.22,
  ease: 'easeInOut',
}
