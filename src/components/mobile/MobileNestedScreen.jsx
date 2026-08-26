import { ChevronLeft } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { IconButton } from '../ui/IconButton'
import './mobile-nested-screen.css'

export function MobileNestedScreen({
  open,
  onClose,
  title,
  subtitle,
  action,
  children,
  className = '',
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      fullScreenMobile
      className={`mobile-nested-screen ${className}`.trim()}
    >
      <header className="mobile-nested-screen-header">
        <IconButton label="Back" onClick={onClose}>
          <ChevronLeft size={22} />
        </IconButton>
        <div className="mobile-nested-screen-header-text">
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {action ? <div className="mobile-nested-screen-action">{action}</div> : null}
      </header>
      <div className="mobile-nested-screen-body">{children}</div>
    </Modal>
  )
}
