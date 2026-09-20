import { CollectionDetail } from '../CollectionDetail'

export function FinanceCollectionDetailScreen({
  collection,
  report,
  dues,
  payments,
  statementsByUser,
  wallet,
  walletMovements,
  userId,
  actorName,
  canManage,
  onDone,
  onClose,
}) {
  if (!collection || !report) return null
  return (
    <CollectionDetail
      report={report}
      dues={dues}
      payments={payments}
      statementsByUser={statementsByUser}
      wallet={wallet}
      walletMovements={walletMovements}
      userId={userId}
      actorName={actorName}
      canManage={canManage}
      compact
      onDone={onDone}
      onClosed={onClose}
    />
  )
}
