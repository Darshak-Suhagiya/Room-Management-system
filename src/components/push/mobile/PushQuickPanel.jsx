import { Sunrise, Sunset } from 'lucide-react'
import { MobileActionBar } from '../../ui/MobileActionBar'
import { PUSH_AUDIENCE_TYPES } from '../../../config/constants'

function audienceLabel(type) {
  if (type === PUSH_AUDIENCE_TYPES.NOT_VOTED) return 'Not voted'
  return 'All users'
}

export function PushQuickPanel({
  settings,
  setSettings,
  saving,
  menuPreview,
  onSaveDefaults,
  onSendMorning,
  onSendEvening,
}) {
  return (
    <div className="push-mobile-panel admin-mobile-page-with-bar mobile-section-gap">
      <p className="muted push-mobile-lead">
        Save defaults, then send today’s morning or evening menu digest.
      </p>

      <section className="rail-card push-mobile-slot-card">
        <div className="push-mobile-slot-head">
          <Sunrise size={18} aria-hidden />
          <strong>Morning</strong>
          <span className="muted">{audienceLabel(settings.morningAudienceType)}</span>
        </div>
        <label className="field-stack">
          <span className="field-stack-label">Title</span>
          <input
            className="app-input"
            value={settings.morningTitle || ''}
            onChange={(e) =>
              setSettings((s) => ({ ...s, morningTitle: e.target.value }))
            }
          />
        </label>
        <fieldset className="push-audience-fieldset">
          <legend>Audience</legend>
          <label className="radio-row">
            <input
              type="radio"
              name="morningAudienceMobile"
              checked={settings.morningAudienceType === PUSH_AUDIENCE_TYPES.ALL}
              onChange={() =>
                setSettings((s) => ({
                  ...s,
                  morningAudienceType: PUSH_AUDIENCE_TYPES.ALL,
                }))
              }
            />
            All users
          </label>
          <label className="radio-row">
            <input
              type="radio"
              name="morningAudienceMobile"
              checked={settings.morningAudienceType === PUSH_AUDIENCE_TYPES.NOT_VOTED}
              onChange={() =>
                setSettings((s) => ({
                  ...s,
                  morningAudienceType: PUSH_AUDIENCE_TYPES.NOT_VOTED,
                }))
              }
            />
            Not voted users
          </label>
          {settings.morningAudienceType === PUSH_AUDIENCE_TYPES.NOT_VOTED && (
            <label className="field-stack">
              <span className="field-stack-label">Check votes for</span>
              <select
                className="app-input"
                value={settings.morningNotVotedSlot || 'morning'}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    morningNotVotedSlot: e.target.value,
                  }))
                }
              >
                <option value="morning">Morning meal</option>
                <option value="evening">Evening meal</option>
              </select>
            </label>
          )}
        </fieldset>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={saving}
          onClick={onSendMorning}
        >
          <Sunrise size={16} aria-hidden />
          Send morning now
        </button>
      </section>

      <section className="rail-card push-mobile-slot-card">
        <div className="push-mobile-slot-head">
          <Sunset size={18} aria-hidden />
          <strong>Evening</strong>
          <span className="muted">{audienceLabel(settings.eveningAudienceType)}</span>
        </div>
        <label className="field-stack">
          <span className="field-stack-label">Title</span>
          <input
            className="app-input"
            value={settings.eveningTitle || ''}
            onChange={(e) =>
              setSettings((s) => ({ ...s, eveningTitle: e.target.value }))
            }
          />
        </label>
        <fieldset className="push-audience-fieldset">
          <legend>Audience</legend>
          <label className="radio-row">
            <input
              type="radio"
              name="eveningAudienceMobile"
              checked={settings.eveningAudienceType === PUSH_AUDIENCE_TYPES.ALL}
              onChange={() =>
                setSettings((s) => ({
                  ...s,
                  eveningAudienceType: PUSH_AUDIENCE_TYPES.ALL,
                }))
              }
            />
            All users
          </label>
          <label className="radio-row">
            <input
              type="radio"
              name="eveningAudienceMobile"
              checked={settings.eveningAudienceType === PUSH_AUDIENCE_TYPES.NOT_VOTED}
              onChange={() =>
                setSettings((s) => ({
                  ...s,
                  eveningAudienceType: PUSH_AUDIENCE_TYPES.NOT_VOTED,
                }))
              }
            />
            Not voted users
          </label>
          {settings.eveningAudienceType === PUSH_AUDIENCE_TYPES.NOT_VOTED && (
            <label className="field-stack">
              <span className="field-stack-label">Check votes for</span>
              <select
                className="app-input"
                value={settings.eveningNotVotedSlot || 'evening'}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    eveningNotVotedSlot: e.target.value,
                  }))
                }
              >
                <option value="morning">Morning meal</option>
                <option value="evening">Evening meal</option>
              </select>
            </label>
          )}
        </fieldset>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={saving}
          onClick={onSendEvening}
        >
          <Sunset size={16} aria-hidden />
          Send evening now
        </button>
      </section>

      <section className="rail-card push-mobile-slot-card">
        <label className="field-stack">
          <span className="field-stack-label">Fallback body (when no menu)</span>
          <textarea
            className="app-textarea"
            rows={2}
            value={settings.fallbackBody || ''}
            onChange={(e) =>
              setSettings((s) => ({ ...s, fallbackBody: e.target.value }))
            }
          />
        </label>
        <div className="push-preview">
          <strong>Today morning preview</strong>
          <pre>{menuPreview || '—'}</pre>
        </div>
      </section>

      <MobileActionBar open>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={saving}
          onClick={onSaveDefaults}
        >
          {saving ? 'Saving…' : 'Save defaults'}
        </button>
      </MobileActionBar>
    </div>
  )
}
