import { NoticeBanner } from '../../NoticeBanner'
import { Modal } from '../../ui/Modal'
import {
  NOTICE_PAGE_LABELS,
  NOTICE_PAGES,
  NOTICE_TONE_LABELS,
  NOTICE_TONES,
} from '../../../config/constants'
import { ALL_ROLES, ROLE_LABELS } from '../../../config/rolePermissions'

export function ComposeNoticeSheet({
  open,
  onClose,
  editingId,
  form,
  setForm,
  people,
  saving,
  previewNotices,
  onSave,
  onTogglePage,
  onToggleRole,
  onToggleUser,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingId ? 'Edit notice' : 'New notice'}
      busy={saving}
      wide
    >
      <form className="notices-compose-sheet mobile-section-gap" onSubmit={onSave}>
        <div className="notices-compose-preview">
          <NoticeBanner notices={previewNotices} preview sticky={false} />
        </div>

        <label className="field-stack">
          <span className="field-stack-label">Title</span>
          <input
            className="app-input"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            maxLength={120}
            placeholder="Short headline"
          />
        </label>

        <label className="field-stack">
          <span className="field-stack-label">Message</span>
          <textarea
            className="app-textarea"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            required
            rows={3}
            placeholder="What should people know?"
          />
        </label>

        <div className="field-stack">
          <span className="field-stack-label">Tone</span>
          <div className="segmented-control notices-tone-seg" role="group" aria-label="Notice tone">
            {Object.values(NOTICE_TONES).map((t) => (
              <button
                key={t}
                type="button"
                className={`segmented-btn${form.tone === t ? ' is-active' : ''}${t === NOTICE_TONES.WARNING ? ' tone-warning' : ''}${t === NOTICE_TONES.SUCCESS ? ' tone-success' : ''}`}
                onClick={() => setForm((f) => ({ ...f, tone: t }))}
              >
                {NOTICE_TONE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="notices-date-row">
          <label className="field-stack">
            <span className="field-stack-label">Start date</span>
            <input
              className="app-input"
              type="date"
              value={form.startAt}
              onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
            />
          </label>
          <label className="field-stack">
            <span className="field-stack-label">End date</span>
            <input
              className="app-input"
              type="date"
              value={form.endAt}
              onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
            />
          </label>
        </div>

        <div className="field-stack">
          <span className="field-stack-label">Show on</span>
          <div className="checkbox-grid">
            {Object.values(NOTICE_PAGES).map((p) => (
              <label key={p} className="checkbox-chip">
                <input
                  type="checkbox"
                  checked={form.pages.includes(p)}
                  onChange={() => onTogglePage(p)}
                />
                <span>{NOTICE_PAGE_LABELS[p]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="field-stack">
          <span className="field-stack-label">Audience roles</span>
          <span className="field-hint">Leave empty for everyone</span>
          <div className="checkbox-grid">
            {ALL_ROLES.map((role) => (
              <label key={role} className="checkbox-chip">
                <input
                  type="checkbox"
                  checked={form.audienceRoles.includes(role)}
                  onChange={() => onToggleRole(role)}
                />
                <span>{ROLE_LABELS[role]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="field-stack">
          <span className="field-stack-label">Specific users</span>
          <div className="checkbox-grid notices-user-chips">
            {people.map((p) => (
              <label key={p.id} className="checkbox-chip">
                <input
                  type="checkbox"
                  checked={form.audienceUserIds.includes(p.id)}
                  onChange={() => onToggleUser(p.id)}
                />
                <span>
                  {p.displayName || p.email}
                  <small>{ROLE_LABELS[p.role] || p.role}</small>
                </span>
              </label>
            ))}
            {people.length === 0 && <p className="muted">No users loaded.</p>}
          </div>
        </div>

        <div className="notices-compose-sheet-actions">
          <button type="button" className="btn btn-ghost btn-block" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Create notice'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
