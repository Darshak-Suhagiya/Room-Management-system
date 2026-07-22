import { useCallback, useEffect, useMemo, useState } from 'react'
import { Send, Sunrise, Sunset } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PushUserPickerField } from '../components/push/PushUserPicker'
import { MobilePageHeader } from '../components/mobile'
import { ALL_ROLES, ROLE_LABELS } from '../config/rolePermissions'
import {
  PUSH_AUDIENCE_TYPES,
  PUSH_JOB_KINDS,
} from '../config/constants'
import { listApprovedUsers } from '../services/userService'
import { getMenuByDate } from '../services/menuService'
import { fetchCatalog } from '../services/catalogService'
import { formatDateId } from '../utils/mealDateUtils'
import {
  buildDailyAudience,
  DEFAULT_PUSH_SETTINGS,
  formatMenuDigestBody,
  getPushSettings,
  savePushSettings,
  sendPushNow,
} from '../services/pushAdminService'

const EMPTY_COMPOSE = {
  title: '',
  body: '',
  kind: PUSH_JOB_KINDS.CUSTOM,
  menuDateId: formatDateId(new Date()),
  mealSlot: 'morning',
  audienceType: PUSH_AUDIENCE_TYPES.ALL,
  voteSlot: 'morning',
  voteDateId: formatDateId(new Date()),
  roles: [],
  userIds: [],
}

export function AdminPushPage() {
  const { user, canManagePush } = useAuth()
  const [tab, setTab] = useState('quick')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState(DEFAULT_PUSH_SETTINGS)
  const [compose, setCompose] = useState(EMPTY_COMPOSE)
  const [users, setUsers] = useState([])
  const [catalog, setCatalog] = useState(null)
  const [menuPreview, setMenuPreview] = useState('')
  const [loading, setLoading] = useState(true)

  const todayId = useMemo(() => formatDateId(new Date()), [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [s, u, cat] = await Promise.all([
        getPushSettings(),
        listApprovedUsers().catch(() => []),
        fetchCatalog().catch(() => null),
      ])
      setSettings(s)
      setUsers(u)
      setCatalog(cat)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load push data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    let cancelled = false
    async function preview() {
      if (!catalog) {
        setMenuPreview('')
        return
      }
      try {
        const dateId =
          tab === 'compose' ? compose.menuDateId || todayId : todayId
        const slot =
          tab === 'compose'
            ? compose.mealSlot
            : 'morning'
        const menu = await getMenuByDate(
          dateId,
          catalog.categories.map((c) => c.id),
        )
        if (cancelled) return
        setMenuPreview(
          formatMenuDigestBody(menu, slot, catalog, settings.fallbackBody),
        )
      } catch {
        if (!cancelled) setMenuPreview('')
      }
    }
    preview()
    return () => {
      cancelled = true
    }
  }, [
    catalog,
    tab,
    compose.menuDateId,
    compose.mealSlot,
    todayId,
    settings.fallbackBody,
  ])

  if (!canManagePush) {
    return (
      <div className="page">
        <p className="form-error">You do not have access to push notifications.</p>
      </div>
    )
  }

  const saveDaily = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await savePushSettings(settings, user?.uid)
      setSuccess('Quick-send defaults saved.')
    } catch (err) {
      setError(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const sendDigestNow = async (slot) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const title =
        slot === 'morning'
          ? settings.morningTitle || 'Morning menu'
          : settings.eveningTitle || 'Evening menu'
      const audience = buildDailyAudience(settings, slot)
      if (audience.type === PUSH_AUDIENCE_TYPES.NOT_VOTED) {
        audience.voteDateId = todayId
      }
      const res = await sendPushNow({
        title,
        body: '',
        kind: PUSH_JOB_KINDS.MENU_DIGEST,
        menuDateId: todayId,
        mealSlot: slot,
        audience,
      })
      setSuccess(
        `Sent ${slot} digest. OK ${res.successCount ?? 0} · fail ${res.failureCount ?? 0} · ${res.tokenCount ?? 0} device(s).`,
      )
    } catch (err) {
      console.error(err)
      setError(err.message || 'Send failed.')
    } finally {
      setSaving(false)
    }
  }

  const buildAudience = () => {
    if (compose.audienceType === PUSH_AUDIENCE_TYPES.NOT_VOTED) {
      return {
        type: PUSH_AUDIENCE_TYPES.NOT_VOTED,
        voteDateId: compose.voteDateId || todayId,
        voteSlot: compose.voteSlot || 'morning',
      }
    }
    if (compose.audienceType === PUSH_AUDIENCE_TYPES.ROLES) {
      return { type: PUSH_AUDIENCE_TYPES.ROLES, roles: compose.roles }
    }
    if (compose.audienceType === PUSH_AUDIENCE_TYPES.USERS) {
      return { type: PUSH_AUDIENCE_TYPES.USERS, userIds: compose.userIds }
    }
    return { type: PUSH_AUDIENCE_TYPES.ALL }
  }

  const submitCompose = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const kind = compose.kind
      let body = compose.body
      if (kind === PUSH_JOB_KINDS.MENU_DIGEST && catalog) {
        const menu = await getMenuByDate(
          compose.menuDateId,
          catalog.categories.map((c) => c.id),
        )
        body =
          compose.body.trim() ||
          formatMenuDigestBody(
            menu,
            compose.mealSlot,
            catalog,
            settings.fallbackBody,
          )
      }
      const payload = {
        title: compose.title.trim(),
        body,
        kind,
        menuDateId:
          kind === PUSH_JOB_KINDS.MENU_DIGEST ? compose.menuDateId : null,
        mealSlot: kind === PUSH_JOB_KINDS.MENU_DIGEST ? compose.mealSlot : null,
        audience: buildAudience(),
      }
      if (!payload.title) throw new Error('Title is required.')
      const res = await sendPushNow(payload)
      setSuccess(
        `Sent. OK ${res.successCount ?? 0} · fail ${res.failureCount ?? 0} · ${res.tokenCount ?? 0} device(s), ${res.recipientUserCount ?? 0} users.`,
      )
      setCompose(EMPTY_COMPOSE)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Send failed.')
    } finally {
      setSaving(false)
    }
  }

  const toggleRole = (role) => {
    setCompose((c) => ({
      ...c,
      roles: c.roles.includes(role)
        ? c.roles.filter((r) => r !== role)
        : [...c.roles, role],
    }))
  }

  const toggleUser = (id) => {
    setCompose((c) => ({
      ...c,
      userIds: c.userIds.includes(id)
        ? c.userIds.filter((x) => x !== id)
        : [...c.userIds, id],
    }))
  }

  return (
    <div className="page admin-push-page">
      <div className="layout-desktop">
        <header className="page-header">
          <div>
            <h1>Push notifications</h1>
            <p className="page-lead">
              Send now only (via Vercel + Firebase Cloud Messaging). No auto schedule.
            </p>
          </div>
        </header>
      </div>

      <div className="layout-mobile">
        <MobilePageHeader
          icon={Send}
          title="Push"
          description="Quick menu digests or custom sends."
        />
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="notices-tabs layout-desktop" role="tablist" aria-label="Push sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'quick'}
          className={`notices-tab${tab === 'quick' ? ' is-active' : ''}`}
          onClick={() => {
            setTab('quick')
            setSuccess('')
            setError('')
          }}
        >
          <Sunrise size={16} aria-hidden />
          Quick send
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'compose'}
          className={`notices-tab${tab === 'compose' ? ' is-active' : ''}`}
          onClick={() => {
            setTab('compose')
            setSuccess('')
            setError('')
          }}
        >
          <Send size={16} aria-hidden />
          Custom send
        </button>
      </div>

      <div className="mobile-segmented layout-mobile push-mobile-tabs" role="tablist" aria-label="Push sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'quick'}
          className={`mobile-segmented-btn${tab === 'quick' ? ' is-active' : ''}`}
          onClick={() => {
            setTab('quick')
            setSuccess('')
            setError('')
          }}
        >
          Quick send
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'compose'}
          className={`mobile-segmented-btn${tab === 'compose' ? ' is-active' : ''}`}
          onClick={() => {
            setTab('compose')
            setSuccess('')
            setError('')
          }}
        >
          Custom send
        </button>
      </div>

      {tab === 'quick' && (
        <div className="card push-form push-form-mobile-stack">
          <p className="muted">
            Save defaults, then tap Send for today’s morning or evening menu digest.
          </p>
          <form onSubmit={saveDaily}>
            <h2>Morning defaults</h2>
            <label>
              Title
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
                  name="morningAudience"
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
                  name="morningAudience"
                  checked={
                    settings.morningAudienceType === PUSH_AUDIENCE_TYPES.NOT_VOTED
                  }
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
                <label>
                  Check votes for
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

            <h2>Evening defaults</h2>
            <label>
              Title
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
                  name="eveningAudience"
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
                  name="eveningAudience"
                  checked={
                    settings.eveningAudienceType === PUSH_AUDIENCE_TYPES.NOT_VOTED
                  }
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
                <label>
                  Check votes for
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

            <label>
              Fallback body (when no menu)
              <textarea
                className="app-textarea"
                rows={2}
                value={settings.fallbackBody || ''}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, fallbackBody: e.target.value }))
                }
              />
            </label>

            <button type="submit" className="btn btn-secondary" disabled={saving}>
              {saving ? 'Saving…' : 'Save defaults'}
            </button>
          </form>

          <div className="push-quick-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => sendDigestNow('morning')}
            >
              <Sunrise size={16} aria-hidden />
              Send morning digest now
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => sendDigestNow('evening')}
            >
              <Sunset size={16} aria-hidden />
              Send evening digest now
            </button>
          </div>

          <div className="push-preview">
            <strong>Today morning preview</strong>
            <pre>{menuPreview || '—'}</pre>
          </div>
        </div>
      )}

      {tab === 'compose' && (
        <form className="card push-form push-form-mobile-stack" onSubmit={submitCompose}>
          <label>
            Title
            <input
              className="app-input"
              required
              value={compose.title}
              onChange={(e) =>
                setCompose((c) => ({ ...c, title: e.target.value }))
              }
            />
          </label>

          <fieldset className="push-audience-fieldset">
            <legend>Content</legend>
            <label className="radio-row">
              <input
                type="radio"
                name="kind"
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
                name="kind"
                checked={compose.kind === PUSH_JOB_KINDS.MENU_DIGEST}
                onChange={() =>
                  setCompose((c) => ({
                    ...c,
                    kind: PUSH_JOB_KINDS.MENU_DIGEST,
                  }))
                }
              />
              Menu digest (date + morning/evening)
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

          <label>
            Message{' '}
            {compose.kind === PUSH_JOB_KINDS.MENU_DIGEST && '(optional override)'}
            <textarea
              className="app-textarea"
              rows={4}
              value={compose.body}
              onChange={(e) =>
                setCompose((c) => ({ ...c, body: e.target.value }))
              }
              placeholder={
                compose.kind === PUSH_JOB_KINDS.MENU_DIGEST
                  ? menuPreview
                  : 'Notification body'
              }
            />
          </label>

          <fieldset className="push-audience-fieldset">
            <legend>Audience</legend>
            {[
              [PUSH_AUDIENCE_TYPES.ALL, 'All users'],
              [PUSH_AUDIENCE_TYPES.NOT_VOTED, 'Not voted users'],
              [PUSH_AUDIENCE_TYPES.ROLES, 'Roles'],
              [PUSH_AUDIENCE_TYPES.USERS, 'Specific persons'],
            ].map(([value, label]) => (
              <label key={value} className="radio-row">
                <input
                  type="radio"
                  name="audience"
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
                      onChange={() => toggleRole(role)}
                    />
                    {ROLE_LABELS[role] || role}
                  </label>
                ))}
              </div>
            )}

            {compose.audienceType === PUSH_AUDIENCE_TYPES.USERS && (
              <PushUserPickerField
                users={users}
                selectedIds={compose.userIds}
                onToggle={toggleUser}
              />
            )}
          </fieldset>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Sending…' : 'Send now'}
          </button>
        </form>
      )}
    </div>
  )
}
