import { Send } from 'lucide-react'
import { MobilePageHeader, MobilePageSkeleton } from '../../mobile'
import { AdminEmptyPanel, AdminItemRowCard } from '../../admin/mobile'
import { PushQuickPanel } from './PushQuickPanel'
import { PushComposePanel } from './PushComposePanel'
import { PushLogDetailSheet } from './PushLogDetailSheet'
import { pushLogListSubtitle } from '../PushLogDetailContent'

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
  logs,
  logsLoading,
  logsError,
  selectedLog,
  onSelectLog,
  onClearSelectedLog,
}) {
  return (
    <div className="page admin-push-page admin-mobile-page mobile-section-gap">
      <MobilePageHeader
        icon={Send}
        title="Push"
        description="Send notifications and view delivery logs."
      />

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      {logsError && tab === 'logs' && <p className="form-error">{logsError}</p>}

      <div className="mobile-segmented" role="tablist" aria-label="Push sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'quick'}
          className={`mobile-segmented-btn${tab === 'quick' ? ' is-active' : ''}`}
          onClick={() => onTabChange('quick')}
        >
          Quick
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'compose'}
          className={`mobile-segmented-btn${tab === 'compose' ? ' is-active' : ''}`}
          onClick={() => onTabChange('compose')}
        >
          Custom
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'logs'}
          className={`mobile-segmented-btn${tab === 'logs' ? ' is-active' : ''}`}
          onClick={() => onTabChange('logs')}
        >
          Logs
        </button>
      </div>

      {tab === 'logs' ? (
        logsLoading ? (
          <MobilePageSkeleton />
        ) : logs.length === 0 ? (
          <AdminEmptyPanel title="No logs yet" message="Sent notifications will appear here." />
        ) : (
          <div className="push-logs-mobile-list mobile-section-gap">
            {logs.map((log) => (
              <AdminItemRowCard
                key={log.id}
                title={log.title}
                subtitle={pushLogListSubtitle(log)}
                onClick={() => onSelectLog(log.id)}
              />
            ))}
          </div>
        )
      ) : loading ? (
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

      <PushLogDetailSheet
        open={Boolean(selectedLog)}
        onClose={onClearSelectedLog}
        log={selectedLog}
      />
    </div>
  )
}
