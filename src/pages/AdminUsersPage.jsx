import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, CircleCheck, Clock, Users as UsersIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { MobileFilterBar, MobilePageHeader } from '../components/mobile'
import { ROLES, USER_STATUS } from '../config/constants'
import {
  ROLE_LABELS,
  assignableRolesForActor,
  canEditManagedUser,
} from '../config/rolePermissions'
import { useToast } from '../contexts/ToastContext'
import { getUserInitials } from '../utils/userDisplay'
import {
  deleteUserByAdmin,
  listAllUsers,
  updateUserByAdmin,
  updateUserStatus,
} from '../services/userService'

const STATUS_LABEL = {
  pending: 'Pending',
  approved: 'Approved',
  deactivated: 'Deactivated',
}

function draftFromUser(u) {
  return { displayName: u.displayName ?? '', role: u.role ?? ROLES.RESIDENT }
}

function draftChanged(u, draft) {
  const name = draft.displayName.trim()
  return (
    name !== (u.displayName ?? '').trim() || draft.role !== (u.role ?? ROLES.RESIDENT)
  )
}

export function AdminUsersPage() {
  const { user, profile, isAdmin } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const assignableRoles = useMemo(
    () => assignableRolesForActor(profile),
    [profile],
  )
  const actorRole = profile?.role

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await listAllUsers()
      setUsers(list)
      setDrafts(Object.fromEntries(list.map((u) => [u.id, draftFromUser(u)])))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const counts = useMemo(() => {
    const c = { all: users.length, approved: 0, pending: 0, deactivated: 0 }
    for (const u of users) {
      if (u.status === USER_STATUS.APPROVED) c.approved += 1
      else if (u.status === USER_STATUS.PENDING) c.pending += 1
      else if (u.status === USER_STATUS.DEACTIVATED) c.deactivated += 1
    }
    return c
  }, [users])

  const visibleUsers = useMemo(
    () =>
      statusFilter === 'all'
        ? users
        : users.filter((u) => u.status === statusFilter),
    [users, statusFilter],
  )

  const statCards = [
    { id: 'all', label: 'All members', value: counts.all, icon: UsersIcon, tone: 'tone-primary' },
    { id: USER_STATUS.APPROVED, label: 'Approved', value: counts.approved, icon: CircleCheck, tone: 'tone-primary' },
    { id: USER_STATUS.PENDING, label: 'Pending', value: counts.pending, icon: Clock, tone: 'tone-morning' },
    { id: USER_STATUS.DEACTIVATED, label: 'Deactivated', value: counts.deactivated, icon: Ban, tone: 'tone-accent' },
  ]

  const setDraft = (userId, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], ...patch },
    }))
  }

  const setStatus = async (userId, status) => {
    const target = users.find((u) => u.id === userId)
    if (target && !canEditManagedUser(profile, target)) {
      setError('You cannot change an admin account.')
      return
    }
    setBusyId(userId)
    setError('')
    try {
      await updateUserStatus(userId, status, user?.uid, actorRole)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const removeUser = async (target) => {
    if (target.id === user?.uid) {
      setError('You cannot delete your own account.')
      return
    }
    if (!canEditManagedUser(profile, target)) {
      setError('You cannot delete an admin account.')
      return
    }
    const label = target.displayName || target.email || target.id
    if (
      !window.confirm(
        `Permanently delete user "${label}"?\n\nTheir profile will be removed. If they can still sign in, contact an administrator.`,
      )
    ) {
      return
    }
    setBusyId(target.id)
    setError('')
    try {
      await deleteUserByAdmin(target.id, user?.uid, actorRole)
      toast.success('User deleted.')
      await loadUsers()
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const saveProfile = async (target) => {
    const draft = drafts[target.id]
    if (!draft || !draftChanged(target, draft)) return

    if (!canEditManagedUser(profile, target)) {
      setError('You cannot edit an admin account.')
      setDraft(target.id, draftFromUser(target))
      return
    }

    if (target.id === user?.uid && draft.role !== target.role) {
      setError('You cannot change your own role.')
      setDraft(target.id, draftFromUser(target))
      return
    }

    if (!assignableRoles.includes(draft.role)) {
      setError('You cannot assign that role.')
      setDraft(target.id, draftFromUser(target))
      return
    }

    setBusyId(target.id)
    setError('')
    try {
      await updateUserByAdmin(
        target.id,
        {
          displayName: draft.displayName,
          role: draft.role,
        },
        user?.uid,
        actorRole,
      )
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <div className="page admin-page admin-users-page">
      <div className="layout-desktop">
        <header className="page-header">
          <h2>Users</h2>
          <p>
            Edit names and roles, approve or deactivate accounts. Only approved users
            are counted in vote stats.
            {!isAdmin && (
              <>
                {' '}
                As Room leader you can manage members, but not Admin accounts or the
                Admin role.
              </>
            )}
          </p>
        </header>

        {error && <p className="form-error">{error}</p>}

        <div className="stat-cards">
          {statCards.map((card) => {
            const Icon = card.icon
            const active = statusFilter === card.id
            return (
              <button
                key={card.id}
                type="button"
                className={`stat-card-tile stat-card-btn${active ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(card.id)}
              >
                <span className={`stat-card-icon ${card.tone}`}>
                  <Icon size={22} />
                </span>
                <span>
                  <span className="stat-card-value">{card.value}</span>
                  <span className="stat-card-label">{card.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="layout-mobile">
        <MobilePageHeader
          icon={UsersIcon}
          title="Users"
          description={
            isAdmin
              ? 'Manage members, roles, and approvals.'
              : 'Manage members — Admin accounts are read-only.'
          }
        />

        {error && <p className="form-error">{error}</p>}

        <MobileFilterBar>
          <div className="admin-users-filter-chips">
            {statCards.map((card) => {
              const Icon = card.icon
              const active = statusFilter === card.id
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`admin-users-filter-chip${active ? ' is-active' : ''}`}
                  onClick={() => setStatusFilter(card.id)}
                >
                  <Icon size={14} aria-hidden />
                  <span>{card.label}</span>
                  <span className="admin-users-filter-count">{card.value}</span>
                </button>
              )
            })}
          </div>
        </MobileFilterBar>
      </div>

      <div className="admin-users-mobile-list layout-mobile flex flex-col gap-3">
        {visibleUsers.length === 0 && (
          <p className="muted">No users in this view.</p>
        )}
        {visibleUsers.map((u) => {
          const draft = drafts[u.id] ?? draftFromUser(u)
          const dirty = draftChanged(u, draft)
          const isSelf = u.id === user?.uid
          const busy = busyId === u.id
          const canEdit = canEditManagedUser(profile, u)
          const roleLocked = busy || isSelf || !canEdit
          const nameLocked = busy || !canEdit

          return (
            <article
              key={u.id}
              className="admin-user-mobile-card rounded-default border border-border bg-surface p-4 flex flex-col gap-3"
            >
              <div className="admin-user-name-cell">
                <span className="admin-user-avatar" aria-hidden="true">
                  {getUserInitials(draft.displayName || u.email)}
                </span>
                <input
                  type="text"
                  className="admin-user-name-input"
                  value={draft.displayName}
                  disabled={nameLocked}
                  onChange={(e) => setDraft(u.id, { displayName: e.target.value })}
                  onBlur={() => dirty && saveProfile(u)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveProfile(u)
                    }
                  }}
                />
              </div>
              <p className="admin-user-email text-sm text-muted break-all">{u.email}</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="admin-user-role-select flex-1 min-h-11"
                  value={draft.role}
                  disabled={roleLocked}
                  onChange={(e) => setDraft(u.id, { role: e.target.value })}
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                  {!assignableRoles.includes(draft.role) && (
                    <option value={draft.role}>
                      {ROLE_LABELS[draft.role] ?? draft.role}
                    </option>
                  )}
                </select>
                <span className={`status-pill status-${u.status}`}>
                  {STATUS_LABEL[u.status] ?? u.status}
                </span>
              </div>
              <div className="admin-users-actions flex flex-wrap gap-2">
                {dirty && canEdit && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm min-h-11 flex-1"
                    disabled={busy}
                    onClick={() => saveProfile(u)}
                  >
                    {busy ? '…' : 'Save'}
                  </button>
                )}
                {!isSelf && canEdit && u.role !== ROLES.ADMIN && (
                  <>
                    {u.status !== USER_STATUS.APPROVED && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm min-h-11 flex-1"
                        disabled={busy}
                        onClick={() => setStatus(u.id, USER_STATUS.APPROVED)}
                      >
                        Approve
                      </button>
                    )}
                    {u.status !== USER_STATUS.DEACTIVATED && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm min-h-11 flex-1"
                        disabled={busy}
                        onClick={() => setStatus(u.id, USER_STATUS.DEACTIVATED)}
                      >
                        Deactivate
                      </button>
                    )}
                    {u.status === USER_STATUS.DEACTIVATED && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm min-h-11 flex-1"
                        disabled={busy}
                        onClick={() => setStatus(u.id, USER_STATUS.APPROVED)}
                      >
                        Reactivate
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm min-h-11 flex-1"
                      disabled={busy}
                      onClick={() => removeUser(u)}
                    >
                      Delete user
                    </button>
                  </>
                )}
                {!canEdit && (
                  <span className="muted admin-users-hint">Admin only</span>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <div className="admin-users-table-wrap layout-desktop">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-users-empty">
                  No users in this view.
                </td>
              </tr>
            )}
            {visibleUsers.map((u) => {
              const draft = drafts[u.id] ?? draftFromUser(u)
              const dirty = draftChanged(u, draft)
              const isSelf = u.id === user?.uid
              const busy = busyId === u.id
              const canEdit = canEditManagedUser(profile, u)
              const roleLocked = busy || isSelf || !canEdit
              const nameLocked = busy || !canEdit

              return (
                <tr key={u.id}>
                  <td>
                    <div className="admin-user-name-cell">
                      <span className="admin-user-avatar" aria-hidden="true">
                        {getUserInitials(draft.displayName || u.email)}
                      </span>
                      <input
                        type="text"
                        className="admin-user-name-input"
                        value={draft.displayName}
                        disabled={nameLocked}
                        title={
                          !canEdit
                            ? 'Admin accounts can only be edited by an Admin'
                            : ''
                        }
                        onChange={(e) =>
                          setDraft(u.id, { displayName: e.target.value })
                        }
                        onBlur={() => dirty && saveProfile(u)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            saveProfile(u)
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td className="admin-user-email">{u.email}</td>
                  <td>
                    <select
                      className="admin-user-role-select"
                      value={draft.role}
                      disabled={roleLocked}
                      title={
                        !canEdit
                          ? 'Admin accounts can only be edited by an Admin'
                          : isSelf
                            ? 'You cannot change your own role here'
                            : ''
                      }
                      onChange={(e) => {
                        setDraft(u.id, { role: e.target.value })
                      }}
                    >
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                      {/* Keep showing current admin role as read-only value for room leaders */}
                      {!assignableRoles.includes(draft.role) && (
                        <option value={draft.role}>
                          {ROLE_LABELS[draft.role] ?? draft.role}
                        </option>
                      )}
                    </select>
                  </td>
                  <td>
                    <span className={`status-pill status-${u.status}`}>
                      {STATUS_LABEL[u.status] ?? u.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-users-actions">
                      {dirty && canEdit && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={busy}
                          onClick={() => saveProfile(u)}
                        >
                          {busy ? '…' : 'Save'}
                        </button>
                      )}
                      {!isSelf && canEdit && u.role !== ROLES.ADMIN && (
                        <>
                          {u.status !== USER_STATUS.APPROVED && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busy}
                              onClick={() =>
                                setStatus(u.id, USER_STATUS.APPROVED)
                              }
                            >
                              Approve
                            </button>
                          )}
                          {u.status !== USER_STATUS.DEACTIVATED && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              disabled={busy}
                              onClick={() =>
                                setStatus(u.id, USER_STATUS.DEACTIVATED)
                              }
                            >
                              Deactivate
                            </button>
                          )}
                          {u.status === USER_STATUS.DEACTIVATED && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={busy}
                              onClick={() =>
                                setStatus(u.id, USER_STATUS.APPROVED)
                              }
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={busy}
                            onClick={() => removeUser(u)}
                          >
                            Delete user
                          </button>
                        </>
                      )}
                      {!canEdit && (
                        <span className="muted admin-users-hint">
                          Admin only
                        </span>
                      )}
                      {isAdmin && !isSelf && u.role === ROLES.ADMIN && dirty && (
                        <span className="muted admin-users-hint">
                          Save admin role
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
