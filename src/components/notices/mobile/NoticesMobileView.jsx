import { Megaphone, Plus } from 'lucide-react'
import { MobilePageHeader, MobilePageSkeleton } from '../../mobile'
import { AdminEmptyPanel, AdminItemRowCard } from '../../admin/mobile'
import {
  NOTICE_PAGE_LABELS,
  NOTICE_TONE_LABELS,
} from '../../../config/constants'
import { isNoticeActiveNow } from '../../../services/noticeService'
import { ComposeNoticeSheet } from './ComposeNoticeSheet'
import { NoticeDetailSheet } from './NoticeDetailSheet'

function noticeSubtitle(notice, tab, audienceSummary) {
  const tone = NOTICE_TONE_LABELS[notice.tone] || notice.tone || 'Info'
  const live =
    tab === 'active' && isNoticeActiveNow(notice) ? 'Live' : tab === 'past' ? 'Past' : 'Scheduled'
  const pages = (notice.pages || [])
    .map((p) => NOTICE_PAGE_LABELS[p] || p)
    .join(', ')
  const audience = audienceSummary(notice)
  return [tone, live, audience, pages].filter(Boolean).join(' · ')
}

export function NoticesMobileView({
  canManageNotices,
  canViewNoticeAnalytics,
  tab,
  onTabChange,
  activeCount,
  pastCount,
  list,
  loading,
  error,
  saving,
  formOpen,
  editingId,
  form,
  setForm,
  people,
  previewNotices,
  selectedNotice,
  stats,
  receiptsLoading,
  audienceSummary,
  onOpenCreate,
  onCloseForm,
  onSave,
  onTogglePage,
  onToggleRole,
  onToggleUser,
  onSelectNotice,
  onClearSelected,
  onEdit,
  onEnd,
}) {
  return (
    <div className="page admin-page notices-admin-page admin-mobile-page mobile-section-gap">
      <MobilePageHeader
        icon={Megaphone}
        title="Notices"
        description={
          canManageNotices
            ? 'Create, end, and track read receipts.'
            : 'View analytics for notices.'
        }
        action={
          canManageNotices ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={onOpenCreate}>
              <Plus size={16} />
              New
            </button>
          ) : null
        }
      />

      {error && <p className="form-error">{error}</p>}

      <div className="mobile-segmented" role="tablist" aria-label="Notice tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'active'}
          className={`mobile-segmented-btn${tab === 'active' ? ' is-active' : ''}`}
          onClick={() => onTabChange('active')}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'past'}
          className={`mobile-segmented-btn${tab === 'past' ? ' is-active' : ''}`}
          onClick={() => onTabChange('past')}
        >
          Past ({pastCount})
        </button>
      </div>

      {loading ? (
        <MobilePageSkeleton />
      ) : list.length === 0 ? (
        <AdminEmptyPanel
          title={tab === 'active' ? 'No active notices' : 'No past notices'}
          hint={
            canManageNotices && tab === 'active'
              ? 'Tap New to create a sticky notice.'
              : undefined
          }
        />
      ) : (
        <div className="notices-mobile-list mobile-section-gap">
          {list.map((notice) => {
            const live = tab === 'active' && isNoticeActiveNow(notice)
            return (
              <AdminItemRowCard
                key={notice.id}
                title={notice.title}
                subtitle={noticeSubtitle(notice, tab, audienceSummary)}
                badge={NOTICE_TONE_LABELS[notice.tone] || notice.tone}
                badgeTone={live ? 'is-live' : ''}
                onClick={() => onSelectNotice(notice.id)}
              />
            )
          })}
        </div>
      )}

      {canManageNotices && (
        <ComposeNoticeSheet
          open={formOpen}
          onClose={onCloseForm}
          editingId={editingId}
          form={form}
          setForm={setForm}
          people={people}
          saving={saving}
          previewNotices={previewNotices}
          onSave={onSave}
          onTogglePage={onTogglePage}
          onToggleRole={onToggleRole}
          onToggleUser={onToggleUser}
        />
      )}

      <NoticeDetailSheet
        open={Boolean(selectedNotice)}
        onClose={onClearSelected}
        notice={selectedNotice}
        tab={tab}
        canManageNotices={canManageNotices}
        canViewNoticeAnalytics={canViewNoticeAnalytics}
        saving={saving}
        stats={stats}
        receiptsLoading={receiptsLoading}
        audienceSummary={audienceSummary}
        onEdit={onEdit}
        onEnd={onEnd}
      />
    </div>
  )
}
