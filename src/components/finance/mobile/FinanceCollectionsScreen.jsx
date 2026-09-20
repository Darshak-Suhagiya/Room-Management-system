import { useState } from 'react'
import { AdminEmptyPanel, AdminItemRowCard } from '../../admin/mobile'
import { MobileNestedScreen } from '../../mobile/MobileNestedScreen'
import { MobileActionBar } from '../../ui/MobileActionBar'
import { formatDateLabel, formatRupeesShort } from '../../../utils/money'
import { FinanceIssueWizardScreen } from './FinanceIssueWizardScreen'
import { FinanceCollectionDetailScreen } from './FinanceCollectionDetailScreen'

export function FinanceCollectionsScreen({
  expenses,
  collections,
  duesByCollection,
  paymentsByCollection,
  reportByCollection,
  statementsByUser,
  users,
  settings,
  wallet,
  walletMovements = [],
  memberWallets = [],
  periodId,
  userId,
  actorName,
  canManage,
  onDone,
  focusCollectionId,
  onFocusConsumed,
}) {
  const [wizard, setWizard] = useState(false)
  const [pickedId, setPickedId] = useState(null)
  const activeId = pickedId ?? focusCollectionId
  const active = collections.find((c) => c.id === activeId)
  const report = activeId ? reportByCollection?.[activeId] : null

  const closeDetail = () => {
    setPickedId(null)
    onFocusConsumed?.()
  }

  return (
    <div className="finance-mobile finance-mobile-list admin-mobile-page-with-bar">
      {collections.length === 0 ? (
        <AdminEmptyPanel
          title="No collections"
          hint="Issue a collection to split expenses from any month."
        />
      ) : (
        collections.map((c) => (
          <AdminItemRowCard
            key={c.id}
            title={c.title}
            subtitle={`${formatRupeesShort(c.totalDuePaise)} · ${formatDateLabel(c.dueDate)}`}
            badge={c.status}
            badgeTone={c.status === 'issued' ? 'is-open' : 'is-ok'}
            onClick={() => setPickedId(c.id)}
          />
        ))
      )}

      {canManage ? (
        <MobileActionBar open={!activeId && !wizard} inline>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => setWizard(true)}
          >
            Issue collection
          </button>
        </MobileActionBar>
      ) : null}

      {canManage ? (
        <FinanceIssueWizardScreen
          open={wizard}
          onClose={() => setWizard(false)}
          expenses={expenses}
          users={users}
          settings={settings}
          wallet={wallet}
          memberWallets={memberWallets}
          periodId={periodId}
          userId={userId}
          actorName={actorName}
          onDone={onDone}
        />
      ) : null}

      <MobileNestedScreen
        open={Boolean(active)}
        onClose={closeDetail}
        title={active?.title || 'Collection'}
        subtitle={active ? formatDateLabel(active.dueDate) : ''}
        artKey="finance"
      >
        <FinanceCollectionDetailScreen
          collection={active}
          report={report}
          dues={duesByCollection[activeId] || []}
          payments={paymentsByCollection[activeId] || []}
          statementsByUser={statementsByUser}
          wallet={wallet}
          walletMovements={walletMovements}
          userId={userId}
          actorName={actorName}
          canManage={canManage}
          onDone={onDone}
          onClose={closeDetail}
        />
      </MobileNestedScreen>
    </div>
  )
}
