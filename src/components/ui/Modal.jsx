import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
  fullScreenMobile = false,
  className = '',
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[200]">
      <div
        className="fixed inset-0 bg-overlay/60 backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-end min-[900px]:items-center justify-center p-0 min-[900px]:p-4">
        <DialogPanel
          className={`relative flex flex-col w-full bg-surface text-text shadow-lg overflow-hidden ${
            fullScreenMobile
              ? 'max-h-[100dvh] rounded-t-lg min-[900px]:rounded-default min-[900px]:max-h-[90dvh]'
              : 'max-h-[92dvh] rounded-t-lg min-[900px]:rounded-default min-[900px]:max-h-[90dvh]'
          } ${wide ? 'min-[900px]:max-w-3xl' : 'min-[900px]:max-w-md'} ${className}`}
        >
          {title && (
            <div className="modal-sheet-header">
              <div className="modal-sheet-header-text">
                <DialogTitle className="modal-sheet-title">{title}</DialogTitle>
                {subtitle && (
                  <p className="modal-sheet-subtitle">{subtitle}</p>
                )}
              </div>
              <IconButton
                label="Close"
                onClick={onClose}
                className="modal-sheet-close"
              >
                <X size={20} />
              </IconButton>
            </div>
          )}
          <div className="modal-sheet-body">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
