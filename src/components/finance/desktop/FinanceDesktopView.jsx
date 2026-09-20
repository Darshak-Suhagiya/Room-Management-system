import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../ui/PageHeader'
import { Wallet } from 'lucide-react'
import { FinanceMemberView } from '../FinanceMemberView'
import { OverviewTab } from './OverviewTab'
import { DepositsTab } from './DepositsTab'
import { ExpensesTab } from './ExpensesTab'
import { CollectionsTab } from './CollectionsTab'
import { FundTab } from './FundTab'
import { HistoryTab } from './HistoryTab'
import { WalletsTab } from './WalletsTab'

const MANAGER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'deposits', label: 'Deposits' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'collections', label: 'Collections' },
  { id: 'fund', label: 'Fund' },
  { id: 'history', label: 'History' },
]

const MEMBER_TABS = [
  { id: 'mine', label: 'Mine' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'collections', label: 'Collections' },
  { id: 'fund', label: 'Fund' },
  { id: 'history', label: 'History' },
]

export function FinanceDesktopView({
  canManage,
  userId,
  actorName,
  data,
}) {
  const {
    periodId,
    setPeriodId,
    settings,
    users,
    templates,
    expenses,
    draftExpenses,
    collections,
    allCollections,
    duesByCollection,
    paymentsByCollection,
    reportByCollection,
    statementsByUser,
    myDues,
    myMovements,
    deposits,
    wallet,
    walletMovements,
    memberWallets,
    unpaidDues,
    totals,
    pendingFundFixes,
    walletRepayments,
    reload,
  } = data

  const [searchParams, setSearchParams] = useSearchParams()
  const focusCollectionId = searchParams.get('collection')
  const tabs = canManage ? MANAGER_TABS : MEMBER_TABS
  const [tab, setTab] = useState(
    focusCollectionId ? 'collections' : canManage ? 'overview' : 'mine',
  )
  const activeTab = focusCollectionId ? 'collections' : tab

  const clearCollectionFocus = () => {
    if (!searchParams.has('collection')) return
    const next = new URLSearchParams(searchParams)
    next.delete('collection')
    setSearchParams(next, { replace: true })
  }

  const periodControl = canManage ? (
    <label className="field-stack finance-period">
      <span className="field-stack-label">Period</span>
      <input
        className="app-input"
        type="month"
        value={periodId}
        onChange={(e) => setPeriodId(e.target.value)}
        aria-label="Period"
      />
    </label>
  ) : null

  const collectionList = canManage ? collections : allCollections

  return (
    <div className="page finance-page">
      <PageHeader
        artKey="finance"
        size="tall"
        copyAlign="end"
        icon={Wallet}
        title="Finance"
        description="Deposits, expenses, collections, and the room fund."
        actions={periodControl}
      />
      <div className="notices-tabs" role="tablist" aria-label="Finance sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`notices-tab${activeTab === t.id ? ' is-active' : ''}`}
            onClick={() => {
              clearCollectionFocus()
              setTab(t.id)
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && canManage && (
        <OverviewTab
          wallet={wallet}
          totals={totals}
          unpaidDues={unpaidDues}
          users={users}
          statementsByUser={statementsByUser}
          userId={userId}
        />
      )}
      {activeTab === 'mine' && !canManage && (
        <FinanceMemberView
          myDues={myDues}
          myMovements={myMovements}
          deposits={deposits}
          wallet={wallet}
          collections={allCollections}
          userId={userId}
          statement={statementsByUser[userId]}
          reportByCollection={reportByCollection}
          walletRepayments={walletRepayments}
          actorName={actorName}
          onDone={reload}
          onOpenCollection={(id) => {
            const next = new URLSearchParams(searchParams)
            next.set('collection', id)
            setSearchParams(next)
            setTab('collections')
          }}
        />
      )}
      {activeTab === 'deposits' && canManage && (
        <DepositsTab
          users={users}
          settings={settings}
          userId={userId}
          unpaidDues={unpaidDues}
          onDone={reload}
        />
      )}
      {activeTab === 'wallets' && (
        <WalletsTab
          users={users}
          statementsByUser={statementsByUser}
          userId={userId}
          actorName={actorName}
          canManage={canManage}
          walletRepayments={walletRepayments}
          onDone={reload}
        />
      )}
      {activeTab === 'expenses' && canManage && (
        <ExpensesTab
          expenses={expenses}
          templates={templates}
          users={users}
          periodId={periodId}
          userId={userId}
          onDone={reload}
        />
      )}
      {activeTab === 'collections' && (
        <CollectionsTab
          expenses={draftExpenses}
          collections={collectionList}
          duesByCollection={duesByCollection}
          paymentsByCollection={paymentsByCollection}
          reportByCollection={reportByCollection}
          statementsByUser={statementsByUser}
          users={users}
          settings={settings}
          wallet={wallet}
          walletMovements={walletMovements}
          memberWallets={memberWallets}
          periodId={periodId}
          userId={userId}
          actorName={actorName}
          canManage={canManage}
          onDone={reload}
          focusCollectionId={focusCollectionId}
          onFocusConsumed={clearCollectionFocus}
        />
      )}
      {activeTab === 'fund' && (
        <FundTab
          wallet={wallet}
          movements={walletMovements}
          settings={settings}
          userId={userId}
          actorName={actorName}
          canManage={canManage}
          pendingFundFixes={pendingFundFixes}
          onDone={reload}
        />
      )}
      {activeTab === 'history' && (
        <HistoryTab
          statementsByUser={statementsByUser}
          wallet={wallet}
          users={users}
          userId={userId}
          actorName={actorName}
          canManage={canManage}
          onDone={reload}
        />
      )}
    </div>
  )
}
