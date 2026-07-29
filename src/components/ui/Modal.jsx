import { useEffect, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import {
  fadeTransition,
  sheetCloseTransition,
  sheetOpenTransition,
  sheetTransition,
} from '../../lib/motionPresets'
import { IconButton } from './IconButton'

const DISMISS_OFFSET = 120
const DISMISS_VELOCITY = 650

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
  fullScreenMobile = false,
  busy = false,
  className = '',
}) {
  const isMobile = useMediaQuery('(max-width: 899px)')
  const dragControls = useDragControls()
  /** Keep Dialog mounted until sheet exit animation finishes. */
  const [present, setPresent] = useState(open)

  useEffect(() => {
    if (open) setPresent(true)
  }, [open])

  const handleClose = () => {
    if (busy) return
    onClose?.()
  }

  const panelClassName = `modal-sheet relative flex flex-col w-full bg-surface text-text shadow-lg overflow-hidden ${
    busy ? 'is-busy' : ''
  } ${
    fullScreenMobile
      ? 'max-h-[100dvh] rounded-t-lg min-[900px]:rounded-default min-[900px]:max-h-[90dvh]'
      : 'max-h-[92dvh] rounded-t-lg min-[900px]:rounded-default min-[900px]:max-h-[90dvh]'
  } ${wide ? 'min-[900px]:max-w-3xl' : 'min-[900px]:max-w-md'} ${className}`

  return (
    <Dialog open={present} onClose={handleClose} className="relative z-[200]">
      <AnimatePresence onExitComplete={() => setPresent(false)}>
        {open && (
          <motion.div
            key="app-modal"
            className="fixed inset-0 flex items-end min-[900px]:items-center justify-center p-0 min-[900px]:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
          >
            <motion.div
              className="modal-sheet-scrim backdrop-blur-[2px]"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeTransition}
            />
            <DialogPanel
              as={motion.div}
              className={panelClassName}
              aria-busy={busy || undefined}
              initial={
                isMobile
                  ? { y: '100%' }
                  : { opacity: 0, scale: 0.96, y: 12 }
              }
              animate={
                isMobile
                  ? { y: 0, transition: sheetOpenTransition }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              exit={
                isMobile
                  ? { y: '100%', transition: sheetCloseTransition }
                  : { opacity: 0, scale: 0.96, y: 8 }
              }
              transition={sheetTransition}
              drag={isMobile && !busy ? 'y' : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 320 }}
              dragElastic={0}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                if (busy) return
                if (
                  info.offset.y > DISMISS_OFFSET ||
                  info.velocity.y > DISMISS_VELOCITY
                ) {
                  handleClose()
                }
              }}
            >
              <div
                className="modal-sheet-grabber-hit"
                onPointerDown={(e) => {
                  if (busy || !isMobile) return
                  dragControls.start(e)
                }}
              >
                <div className="modal-sheet-grabber" aria-hidden />
              </div>
              {title && (
                <div
                  className="modal-sheet-header"
                  onPointerDown={(e) => {
                    if (busy || !isMobile) return
                    if (e.target.closest('button')) return
                    dragControls.start(e)
                  }}
                >
                  <div className="modal-sheet-header-text">
                    <DialogTitle className="modal-sheet-title">{title}</DialogTitle>
                    {subtitle && (
                      <p className="modal-sheet-subtitle">{subtitle}</p>
                    )}
                  </div>
                  <IconButton
                    label="Close"
                    onClick={handleClose}
                    disabled={busy}
                    className="modal-sheet-close"
                  >
                    <X size={20} />
                  </IconButton>
                </div>
              )}
              <div className="modal-sheet-body">{children}</div>
            </DialogPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  )
}
