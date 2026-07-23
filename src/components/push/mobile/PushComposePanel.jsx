import { MobileActionBar } from '../../ui/MobileActionBar'
import { AdminConfirmSheet, AdminEmptyPanel } from '../../admin/mobile'
import { PushUserPickerField } from '../PushUserPicker'
import { ALL_ROLES, ROLE_LABELS } from '../../../config/rolePermissions'
import { PUSH_AUDIENCE_TYPES, PUSH_JOB_KINDS } from '../../../config/constants'
import { useState } from 'react'

export function PushComposePanel({
  compose,
  setCompose,
  users,
  saving,
  menuPreview,
  onToggleRole,
  onToggleUser,
  onSubmit,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const requestSend = (e) => {
    e.preventDefault()
    setConfirmOpen(true)
  }

  return (
    <div className="push-mobile-panel admin-mobile-page-with-bar mobile-section-gap">
      <form id="push-compose-mobile-form" className="mobile-section-gap" onSubmit={requestSend}>
        <section className="rail-card push-mobile-slot-card mobile-section-gap">
          <h3 className="push-mobile-section-title">Content</h3>
          <label className="field-stack">
            <span className="field-stack-label">Title</span>
            <input
              className="app-input"
              required
              value={compose.title}
              onChange={(e) => setCompose((c) => ({ ...c, title: e.target.value }))}
            />
          </label>

          <fieldset className="push-audience-fieldset">
            <legend>Kind</legend>
            <label className="radio-row">
              <input
                type="radio"
                name="kindMobile"
                checked={compose.kind === PUSH_JOB_KINDS.CUSTOM}
                onChange={() =>
                  setCompose((c) => ({ ...c, kind: PUSH_JOB_KINDS.CUSTOM }))
                }
              />
              Custom message
            </label>
            <label className="radio-row">
              <input
                type="radio"
                name="kindMobile"
                checked={compose.kind === PUSH_JOB_KINDS.MENU_DIGEST}
                onChange={() =>
                  setCompose((c) => ({ ...c, kind: PUSH_JOB_KINDS.MENU_DIGEST }))
                }
              />
              Menu digest
            </label>
          </fieldset>

          {compose.kind === PUSH_JOB_KINDS.MENU_DIGEST && (
            <div className="form-row">
              <label>
                Menu date
                <input
                  type="date"
                  className="app-input"
                  value={compose.menuDateId}
                  onChange={(e) =>
                    setCompose((c) => ({ ...c, menuDateId: e.target.value }))
                  }
                />
              </label>
              <label>
                Slot
                <select
                  className="app-input"
                  value={compose.mealSlot}
                  onChange={(e) =>
                    setCompose((c) => ({ ...c, mealSlot: e.target.value }))
                  }
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </select>
              </label>
            </div>
          )}

          <label className="field-stack">
            <span className="field-stack-label">
              Message
              {compose.kind === PUSH_JOB_KINDS.MENU_DIGEST ? ' (optional override)' : ''}
            </span>
            <textarea
              className="app-textarea"
              rows={4}
              value={compose.body}
              onChange={(e) => setCompose((c) => ({ ...c, body: e.target.value }))}
              placeholder={
                compose.kind === PUSH_JOB_KINDS.MENU_DIGEST
                  ? menuPreview
                  : 'Notification body'
              }
            />
          </label>
        </section>

        <section className="rail-card push-mobile-slot-card mobile-section-gap">
          <h3 className="push-mobile-section-title">Audience</h3>
          <fieldset className="push-audience-fieldset">
            {[
              [PUSH_AUDIENCE_TYPES.ALL, 'All users'],
              [PUSH_AUDIENCE_TYPES.NOT_VOTED, 'Not voted users'],
              [PUSH_AUDIENCE_TYPES.ROLES, 'Roles'],
              [PUSH_AUDIENCE_TYPES.USERS, 'Specific persons'],
            ].map(([value, label]) => (
              <label key={value} className="radio-row">
                <input
                  type="radio"
                  name="audienceMobile"
                  checked={compose.audienceType === value}
                  onChange={() =>
                    setCompose((c) => ({ ...c, audienceType: value }))
                  }
                />
                {label}
              </label>
            ))}

            {compose.audienceType === PUSH_AUDIENCE_TYPES.NOT_VOTED && (
              <div className="form-row">
                <label>
                  Vote date
                  <input
                    type="date"
                    className="app-input"
                    value={compose.voteDateId}
                    onChange={(e) =>
                      setCompose((c) => ({ ...c, voteDateId: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Vote slot
                  <select
                    className="app-input"
                    value={compose.voteSlot}
                    onChange={(e) =>
                      setCompose((c) => ({ ...c, voteSlot: e.target.value }))
                    }
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </label>
              </div>
            )}

            {compose.audienceType === PUSH_AUDIENCE_TYPES.ROLES && (
              <div className="chip-row">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="checkbox-chip">
                    <input
                      type="checkbox"
                      checked={compose.roles.includes(role)}
                      onChange={() => onToggleRole(role)}
                    />
                    {ROLE_LABELS[role] || role}
                  </label>
                ))}
              </div>
            )}

            {compose.audienceType === PUSH_AUDIENCE_TYPES.USERS && (
              users.length === 0 ? (
                <AdminEmptyPanel title="No users" hint="Approved users will appear here." />
              ) : (
                <PushUserPickerField
                  users={users}
                  selectedIds={compose.userIds}
                  onToggle={onToggleUser}
                />
              )
            )}
          </fieldset>
        </section>
      </form>

      <MobileActionBar open>
        <button
          type="submit"
          form="push-compose-mobile-form"
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? 'Sending…' : 'Send now'}
        </button>
      </MobileActionBar>

      <AdminConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Send push now?"
        message={
          compose.title.trim()
            ? `Send “${compose.title.trim()}” to the selected audience?`
            : 'Send this notification now?'
        }
        confirmLabel="Send"
        busy={saving}
        onConfirm={async () => {
          const fakeEvent = { preventDefault() {} }
          await onSubmit(fakeEvent)
          setConfirmOpen(false)
        }}
      />
    </div>
  )
}
