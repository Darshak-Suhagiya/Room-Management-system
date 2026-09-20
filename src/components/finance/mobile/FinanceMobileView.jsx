import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Banknote,
  History,
  Landmark,
  PiggyBank,
  Receipt,
  Users,
  Wallet,
} from 'lucide-react'
import { MobilePageHeader } from '../../mobile'
import { MobileNestedScreen } from '../../mobile/MobileNestedScreen'
import { SettingsGroup, SettingsRow } from '../../settings/mobile/SettingsRow'
import '../../settings/mobile/settings-mobile.css'
import { FinanceMemberView } from '../FinanceMemberView'
import { FinanceStatCard } from '../FinanceStatCard'
import { formatPeriodLabel, formatRupeesShort } from '../../../utils/money'
import { FinanceDepositsScreen } from './FinanceDepositsScreen'
import { FinanceExpensesScreen } from './FinanceExpensesScreen'
import { FinanceCollectionsScreen } from './FinanceCollectionsScreen'
import { FinanceWalletScreen } from './FinanceWalletScreen'
import { FinanceWalletsScreen } from './FinanceWalletsScreen'
import { FinanceHistoryScreen } from './FinanceHistoryScreen'

export function FinanceMobileView({ canManage, userId, actorName, data }) {
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
  const [screen, setScreen] = useState(
    focusCollectionId ? 'collections' : null,
  )
  const openScreen =
    focusCollectionId && (screen == null || screen === 'collections')
      ? 'collections'
      : screen

  const clearCollectionFocus = () => {
    if (!searchParams.has('collection')) return
    const next = new URLSearchParams(searchParams)
    next.delete('collection')
    setSearchParams(next, { replace: true })
  }

  const openHubScreen = (id) => {
    clearCollectionFocus()
    setScreen(id)
  }

  const statement = statementsByUser[userId]
  const myUnpaid = (unpaidDues || [])
    .filter((due) => due.userId === userId)
    .reduce((sum, due) => sum + (due.outstandingPaise || 0), 0)
  const collectionList = canManage ? collections : allCollections

  return (
    <div className="finance-mobile admin-mobile-page mobile-section-gap">
      <MobilePageHeader
        artKey="finance"
        size="standard"
        icon={Wallet}
        title="Finance"
        description={canManage ? 'Deposits, expenses, and the room fund.' : 'Your dues, wallet, and room collections.'}
        action={
          canManage ? (
            <input
              type="month"
              className="app-input finance-month-input"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              aria-label="Period"
            />
          ) : null
        }
      />

      {!canManage ? (
        <FinanceMemberView
          myDues={myDues}
          myMovements={myMovements}
          deposits={data.deposits}
          wallet={wallet}
          collections={allCollections}
          userId={userId}
          statement={statement}
          reportByCollection={reportByCollection}
          walletRepayments={walletRepayments}
          actorName={actorName}
          compact
          onDone={reload}
          onOpenCollection={(id) => {
            const next = new URLSearchParams(searchParams)
            next.set('collection', id)
            setSearchParams(next)
            setScreen('collections')
          }}
        />
      ) : (
        <div className="finance-stat-grid">
          <FinanceStatCard label="Room fund" amountPaise={wallet.balancePaise} short />
          <FinanceStatCard label="My unpaid" amountPaise={myUnpaid} short />
        </div>
      )}

      <SettingsGroup title={canManage ? 'Manage' : 'Look up'}>
        {canManage ? (
          <>
            <SettingsRow
              icon={Users}
              label="Deposits"
              subtitle={`${formatRupeesShort(totals.depositsHeld)} held`}
              onClick={() => openHubScreen('deposits')}
            />
            <SettingsRow
              icon={Receipt}
              label="Expenses"
              subtitle={`${expenses.length} in ${formatPeriodLabel(periodId)}`}
              onClick={() => openHubScreen('expenses')}
            />
          </>
        ) : null}
        <SettingsRow
          icon={Banknote}
          label="Collections"
          subtitle={canManage ? `${unpaidDues.length} unpaid` : `${allCollections.length} total`}
          onClick={() => openHubScreen('collections')}
        />
        <SettingsRow
          icon={PiggyBank}
          label="Wallets"
          subtitle={canManage ? 'Everyone’s balance' : 'Your balance and everyone’s'}
          onClick={() => openHubScreen('wallets')}
        />
        <SettingsRow
          icon={Landmark}
          label="Room fund"
          subtitle={formatRupeesShort(wallet.balancePaise)}
          onClick={() => openHubScreen('fund')}
        />
        <SettingsRow
          icon={History}
          label="History"
          subtitle="Collections, expenses, and money"
          onClick={() => openHubScreen('history')}
        />
      </SettingsGroup>

      {canManage ? (
        <MobileNestedScreen
          open={openScreen === 'deposits'}
          onClose={() => setScreen(null)}
          title="Deposits"
          artKey="finance"
        >
          <FinanceDepositsScreen
            users={users}
            settings={settings}
            unpaidDues={unpaidDues}
            userId={userId}
            onDone={reload}
          />
        </MobileNestedScreen>
      ) : null}

      {canManage ? (
        <MobileNestedScreen
          open={openScreen === 'expenses'}
          onClose={() => setScreen(null)}
          title="Expenses"
          artKey="finance"
        >
          <FinanceExpensesScreen
            expenses={expenses}
            templates={templates}
            users={users}
            periodId={periodId}
            userId={userId}
            onDone={reload}
          />
        </MobileNestedScreen>
      ) : null}

      <MobileNestedScreen
        open={openScreen === 'collections'}
        onClose={() => {
          setScreen(null)
          clearCollectionFocus()
        }}
        title="Collections"
        artKey="finance"
      >
        <FinanceCollectionsScreen
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
      </MobileNestedScreen>

      <MobileNestedScreen
        open={openScreen === 'wallets'}
        onClose={() => setScreen(null)}
        title="Wallets"
        artKey="finance"
      >
        <FinanceWalletsScreen
          users={users}
          statementsByUser={statementsByUser}
          userId={userId}
          actorName={actorName}
          canManage={canManage}
          walletRepayments={walletRepayments}
          onDone={reload}
        />
      </MobileNestedScreen>

      <MobileNestedScreen
        open={openScreen === 'fund'}
        onClose={() => setScreen(null)}
        title="Room fund"
        artKey="finance"
      >
        <FinanceWalletScreen
          wallet={wallet}
          movements={walletMovements}
          settings={settings}
          userId={userId}
          actorName={actorName}
          canManage={canManage}
          pendingFundFixes={pendingFundFixes}
          onDone={reload}
        />
      </MobileNestedScreen>

      <MobileNestedScreen
        open={openScreen === 'history'}
        onClose={() => setScreen(null)}
        title="History"
        artKey="finance"
      >
        <FinanceHistoryScreen
          statementsByUser={statementsByUser}
          wallet={wallet}
          users={users}
          userId={userId}
          actorName={actorName}
          canManage={canManage}
          onDone={reload}
        />
      </MobileNestedScreen>
    </div>
  )
}
