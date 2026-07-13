import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Eye,
  Megaphone,
  Plus,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { NoticeBanner } from '../components/NoticeBanner'
import {
  ALL_ROLES,
  ROLE_LABELS,
} from '../config/rolePermissions'
import {
  NOTICE_PAGE_LABELS,
  NOTICE_PAGES,
  NOTICE_TONE_LABELS,
  NOTICE_TONES,
} from '../config/constants'
import { listApprovedUsers, listMaharajUsers } from '../services/userService'
import {
  createNotice,
  endNotice,
  isNoticeActiveNow,
  listActiveNotices,
  listPastNotices,
  listReceipts,
  summarizeReceipts,
  updateNotice,
} from '../services/noticeService'

const EMPTY_FORM = {
  title: '',
  message: '',
  tone: NOTICE_TONES.INFO,
  startAt: '',
  endAt: '',
  audienceRoles: [],
  audienceUserIds: [],
  pages: [NOTICE_PAGES.MEALS, NOTICE_PAGES.SEVA],
}

function audienceSummary(notice) {
  const roles = notice.audienceRoles ?? []
  const users = notice.audienceUserIds ?? []
  if (roles.length === 0 && users.length === 0) return 'Everyone'
  const parts = []
  if (roles.length) {
    parts.push(roles.map((r) => ROLE_LABELS[r] || r).join(', '))
  }
  if (users.length) parts.push(`${users.length} user(s)`)
  return parts.join(' · ')
}

function formatTs(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function AdminNoticesPage() {
  const { user, canManageNotices, canViewNoticeAnalytics } = useAuth()
  const [tab, setTab] = useState('active')
  const [activeList, setActiveList] = useState([])
  const [pastList, setPastList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const [selectedId, setSelectedId] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)

  const [people, setPeople] = useState([])

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [active, past] = await Promise.all([
        listActiveNotices(),
        listPastNotices(),
      ])
      setActiveList(active)
      setPastList(past)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load notices.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!canManageNotices) return
    Promise.all([listApprovedUsers(), listMaharajUsers()])
      .then(([approved, maharajs]) => {
        const map = new Map()
        ;[...approved, ...maharajs].forEach((u) => map.set(u.id, u))
        setPeople([...map.values()].sort((a, b) =>
          (a.displayName || '').localeCompare(b.displayName || ''),
        ))
      })
      .catch(() => setPeople([]))
  }, [canManageNotices])

  const selectedNotice = useMemo(() => {
    const pool = tab === 'active' ? activeList : pastList
    return pool.find((n) => n.id === selectedId) ?? null
  }, [tab, activeList, pastList, selectedId])

  const loadReceipts = useCallback(async (noticeId) => {
    if (!noticeId || !canViewNoticeAnalytics) {
      setReceipts([])
      return
    }
    setReceiptsLoading(true)
    try {
      const rows = await listReceipts(noticeId)
      setReceipts(rows)
    } catch (err) {
      console.error(err)
      setReceipts([])
    } finally {
      setReceiptsLoading(false)
    }
  }, [canViewNoticeAnalytics])

  useEffect(() => {
    if (selectedId) loadReceipts(selectedId)
    else setReceipts([])
  }, [selectedId, loadReceipts])

  const stats = useMemo(() => summarizeReceipts(receipts), [receipts])

  const previewNotices = useMemo(() => {
    const draft = {
      id: editingId || 'preview',
      title: form.title.trim() || 'Notice title',
      message: form.message.trim() || 'Your message will appear here.',
      tone: form.tone,
    }
    return [draft]
  }, [form, editingId])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (notice) => {
    setEditingId(notice.id)
    setForm({
      title: notice.title,
      message: notice.message,
      tone: notice.tone || NOTICE_TONES.INFO,
      startAt: notice.startAt ? String(notice.startAt).slice(0, 10) : '',
      endAt: notice.endAt ? String(notice.endAt).slice(0, 10) : '',
      audienceRoles: [...(notice.audienceRoles || [])],
      audienceUserIds: [...(notice.audienceUserIds || [])],
      pages: [...(notice.pages || [NOTICE_PAGES.MEALS, NOTICE_PAGES.SEVA])],
    })
    setFormOpen(true)
  }

  const toggleRole = (role) => {
    setForm((f) => {
      const has = f.audienceRoles.includes(role)
      return {
        ...f,
        audienceRoles: has
          ? f.audienceRoles.filter((r) => r !== role)
          : [...f.audienceRoles, role],
      }
    })
  }

  const toggleUser = (userId) => {
    setForm((f) => {
      const has = f.audienceUserIds.includes(userId)
      return {
        ...f,
        audienceUserIds: has
          ? f.audienceUserIds.filter((id) => id !== userId)
          : [...f.audienceUserIds, userId],
      }
    })
  }

  const togglePage = (page) => {
    setForm((f) => {
      const has = f.pages.includes(page)
      const next = has ? f.pages.filter((p) => p !== page) : [...f.pages, page]
      return { ...f, pages: next.length ? next : [NOTICE_PAGES.MEALS] }
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!canManageNotices || !user) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title,
        message: form.message,
        tone: form.tone,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
        audienceRoles: form.audienceRoles,
        audienceUserIds: form.audienceUserIds,
        pages: form.pages,
      }
      if (editingId) {
        await updateNotice(editingId, payload, user.uid)
      } else {
        await createNotice(payload, user.uid)
      }
      setFormOpen(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await reload()
    } catch (err) {
      setError(err.message || 'Could not save notice.')
    } finally {
      setSaving(false)
    }
  }

  const handleEnd = async (notice) => {
    if (!canManageNotices || !user) return
    if (!window.confirm(`End notice “${notice.title}” now?`)) return
    setSaving(true)
    setError('')
    try {
      await endNotice(notice.id, user.uid)
      if (selectedId === notice.id) setSelectedId(null)
      await reload()
    } catch (err) {
      setError(err.message || 'Could not end notice.')
    } finally {
      setSaving(false)
    }
  }

  const list = tab === 'active' ? activeList : pastList

  if (!canViewNoticeAnalytics && !canManageNotices) {
    return <p className="form-error">You do not have access to notices.</p>
  }

  return (
    <div className="page admin-page notices-admin-page">
      <header className="page-header page-header-icon page-header-with-actions">
        <span className="page-header-icon-wrap" aria-hidden>
          <Megaphone size={22} />
        </span>
        <div>
          <h2>Notices</h2>
          <p>
            Sticky notices on My Meals and Room Seva
            {canManageNotices
              ? ' — create, end, and track who has read them.'
              : ' — view analytics for active and past notices.'}
          </p>
        </div>
        {canManageNotices && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} />
            New notice
          </button>
        )}
      </header>

      {error && <p className="form-error">{error}</p>}

      <div className="notices-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'active'}
          className={`notices-tab${tab === 'active' ? ' is-active' : ''}`}
          onClick={() => {
            setTab('active')
            setSelectedId(null)
          }}
        >
          Active ({activeList.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'past'}
          className={`notices-tab${tab === 'past' ? ' is-active' : ''}`}
          onClick={() => {
            setTab('past')
            setSelectedId(null)
          }}
        >
          Past ({pastList.length})
        </button>
      </div>

      {formOpen && canManageNotices && (
        <section className="notices-form-card rail-card">
          <div className="notices-form-head">
            <h3>{editingId ? 'Edit notice' : 'New notice'}</h3>
            <button
              type="button"
              className="btn btn-ghost btn-icon-only"
              aria-label="Close form"
              onClick={() => setFormOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="notices-form-grid">
            <form className="notices-form" onSubmit={handleSave}>
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                  required
                  rows={4}
                  placeholder="What should people know?"
                />
              </label>

              <div className="field-stack">
                <span className="field-stack-label">Tone</span>
                <div
                  className="segmented-control notices-tone-seg"
                  role="group"
                  aria-label="Notice tone"
                >
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startAt: e.target.value }))
                    }
                  />
                  <span className="field-hint">Optional</span>
                </label>
                <label className="field-stack">
                  <span className="field-stack-label">End date</span>
                  <input
                    className="app-input"
                    type="date"
                    value={form.endAt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endAt: e.target.value }))
                    }
                  />
                  <span className="field-hint">Optional — or use End now later</span>
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
                        onChange={() => togglePage(p)}
                      />
                      <span>{NOTICE_PAGE_LABELS[p]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field-stack">
                <span className="field-stack-label">Audience roles</span>
                <span className="field-hint">Leave empty to show to everyone</span>
                <div className="checkbox-grid">
                  {ALL_ROLES.map((role) => (
                    <label key={role} className="checkbox-chip">
                      <input
                        type="checkbox"
                        checked={form.audienceRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                      />
                      <span>{ROLE_LABELS[role]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field-stack">
                <span className="field-stack-label">Specific users</span>
                <span className="field-hint">Optional — add named people</span>
                <div className="checkbox-grid notices-user-chips">
                  {people.map((p) => (
                    <label key={p.id} className="checkbox-chip">
                      <input
                        type="checkbox"
                        checked={form.audienceUserIds.includes(p.id)}
                        onChange={() => toggleUser(p.id)}
                      />
                      <span>
                        {p.displayName || p.email}
                        <small>{ROLE_LABELS[p.role] || p.role}</small>
                      </span>
                    </label>
                  ))}
                  {people.length === 0 && (
                    <p className="muted">No users loaded.</p>
                  )}
                </div>
              </div>

              <div className="form-actions notices-form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Create notice'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
            <div className="notices-preview-pane">
              <h4>Preview</h4>
              <p className="muted notices-preview-hint">
                How it appears on My Meals / Room Seva
              </p>
              <NoticeBanner notices={previewNotices} preview sticky={false} />
            </div>
          </div>
        </section>
      )}

      <div className="notices-layout">
        <section className="notices-list-col">
          {loading ? (
            <p className="muted">Loading…</p>
          ) : list.length === 0 ? (
            <p className="muted">
              {tab === 'active' ? 'No active notices.' : 'No past notices.'}
            </p>
          ) : (
            <ul className="notices-card-list">
              {list.map((notice) => (
                <li key={notice.id}>
                  <button
                    type="button"
                    className={`notices-card${selectedId === notice.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedId(notice.id)}
                  >
                    <div className="notices-card-top">
                      <span className={`notice-tone-pill notice-tone-${notice.tone}`}>
                        {NOTICE_TONE_LABELS[notice.tone] || notice.tone}
                      </span>
                      {tab === 'active' && isNoticeActiveNow(notice) && (
                        <span className="notices-live-badge">Live</span>
                      )}
                    </div>
                    <strong className="notices-card-title">{notice.title}</strong>
                    <p className="notices-card-msg">{notice.message}</p>
                    <p className="muted notices-card-meta">
                      {audienceSummary(notice)}
                      {(notice.pages || []).length > 0 && (
                        <>
                          {' · '}
                          {(notice.pages || [])
                            .map((p) => NOTICE_PAGE_LABELS[p] || p)
                            .join(', ')}
                        </>
                      )}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="notices-detail-col rail-card">
          {!selectedNotice ? (
            <p className="muted">Select a notice to see analytics.</p>
          ) : (
            <>
              <h3 className="rail-card-title">{selectedNotice.title}</h3>
              <p className="notices-detail-msg">{selectedNotice.message}</p>
              <p className="muted notices-detail-meta">
                Audience: {audienceSummary(selectedNotice)}
                {selectedNotice.startAt && (
                  <> · Start {String(selectedNotice.startAt).slice(0, 10)}</>
                )}
                {selectedNotice.endAt && (
                  <> · End {String(selectedNotice.endAt).slice(0, 10)}</>
                )}
                {selectedNotice.endedAt && (
                  <> · Ended {formatTs(selectedNotice.endedAt)}</>
                )}
              </p>

              {canManageNotices && tab === 'active' && (
                <div className="notices-detail-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEdit(selectedNotice)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={saving}
                    onClick={() => handleEnd(selectedNotice)}
                  >
                    End now
                  </button>
                </div>
              )}

              <div className="notices-analytics">
                <h4>Analytics</h4>
                <div className="notices-analytics-stats">
                  <div className="notices-stat">
                    <Eye size={16} aria-hidden />
                    <span className="notices-stat-value">{stats.seenCount}</span>
                    <span className="notices-stat-label">Seen</span>
                  </div>
                  <div className="notices-stat">
                    <Check size={16} aria-hidden />
                    <span className="notices-stat-value">{stats.readCount}</span>
                    <span className="notices-stat-label">Marked read</span>
                  </div>
                </div>

                {receiptsLoading ? (
                  <p className="muted">Loading receipts…</p>
                ) : (
                  <>
                    <h5 className="notices-analytics-sub">Seen</h5>
                    {stats.seen.length === 0 ? (
                      <p className="muted">No one has seen this yet.</p>
                    ) : (
                      <ul className="notices-receipt-list">
                        {stats.seen.map((r) => (
                          <li key={`seen-${r.userId}`}>
                            <span>
                              {r.displayName || r.userId}
                              {r.role && (
                                <span className="muted">
                                  {' '}
                                  ({ROLE_LABELS[r.role] || r.role})
                                </span>
                              )}
                            </span>
                            <span className="muted">{formatTs(r.seenAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <h5 className="notices-analytics-sub">Marked as read</h5>
                    {stats.read.length === 0 ? (
                      <p className="muted">No one has marked this as read.</p>
                    ) : (
                      <ul className="notices-receipt-list">
                        {stats.read.map((r) => (
                          <li key={`read-${r.userId}`}>
                            <span>
                              {r.displayName || r.userId}
                              {r.role && (
                                <span className="muted">
                                  {' '}
                                  ({ROLE_LABELS[r.role] || r.role})
                                </span>
                              )}
                            </span>
                            <span className="muted">{formatTs(r.readAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
