import { Send } from 'lucide-react'
import { MobilePageHeader, MobilePageSkeleton } from '../../mobile'
import { PushQuickPanel } from './PushQuickPanel'
import { PushComposePanel } from './PushComposePanel'

export function PushMobileView({
  tab,
  onTabChange,
  error,
  success,
  loading,
  settings,
  setSettings,
  compose,
  setCompose,
  users,
  saving,
  menuPreview,
  onSaveDefaults,
  onSendMorning,
  onSendEvening,
  onToggleRole,
  onToggleUser,
  onSubmitCompose,
}) {
  return (
    <div className="page admin-push-page admin-mobile-page mobile-section-gap">
      <MobilePageHeader
        icon={Send}
        title="Push"
        description="Quick menu digests or custom sends."
      />

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      <div className="mobile-segmented" role="tablist" aria-label="Push sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'quick'}
          className={`mobile-segmented-btn${tab === 'quick' ? ' is-active' : ''}`}
          onClick={() => onTabChange('quick')}
        >
          Quick send
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'compose'}
          className={`mobile-segmented-btn${tab === 'compose' ? ' is-active' : ''}`}
          onClick={() => onTabChange('compose')}
        >
          Custom send
        </button>
      </div>

      {loading ? (
        <MobilePageSkeleton />
      ) : tab === 'quick' ? (
        <PushQuickPanel
          settings={settings}
          setSettings={setSettings}
          saving={saving}
          menuPreview={menuPreview}
          onSaveDefaults={onSaveDefaults}
          onSendMorning={onSendMorning}
          onSendEvening={onSendEvening}
        />
      ) : (
        <PushComposePanel
          compose={compose}
          setCompose={setCompose}
          users={users}
          saving={saving}
          menuPreview={menuPreview}
          onToggleRole={onToggleRole}
          onToggleUser={onToggleUser}
          onSubmit={onSubmitCompose}
        />
      )}
    </div>
  )
}
