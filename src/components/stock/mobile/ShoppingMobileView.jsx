import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Plus } from 'lucide-react'
import { MobilePageHeader } from '../../mobile'
import { AdminEmptyPanel } from '../../admin/mobile'
import { ShoppingTicketPreview } from '../ShoppingTicketPreview'
import { ShoppingCreateMobileWizard } from './ShoppingCreateMobileWizard'
import { ShoppingTicketRowCard } from './ShoppingTicketSheet'
import { ShoppingTicketSheet } from './ShoppingTicketSheet'

function ShoppingListTabs({ tab, openCount, closedCount, onTabChange }) {
  return (
    <div className="shopping-mobile-tabs-sticky">
      <div className="mobile-segmented" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'open'}
          className={`mobile-segmented-btn${tab === 'open' ? ' is-active' : ''}`}
          onClick={() => onTabChange('open')}
        >
          Open ({openCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'closed'}
          className={`mobile-segmented-btn${tab === 'closed' ? ' is-active' : ''}`}
          onClick={() => onTabChange('closed')}
        >
          Closed ({closedCount})
        </button>
      </div>
    </div>
  )
}

export function ShoppingMobileView({
  groups,
  users,
  userId,
  tab,
  onTabChange,
  openTickets,
  closedTickets,
  visibleTickets,
  manage,
  createStep,
  selectedGroups,
  previewLines,
  previewItems,
  previewLoading,
  creating,
  onStartCreate,
  onCancelCreate,
  onToggleGroup,
  onContinuePreview,
  onBackPreview,
  onCreateTicket,
  onCheckLine,
  onToggleAssignee,
  onCancelTicket,
}) {
  const [activeTicket, setActiveTicket] = useState(null)

  const headerAction = manage ? (
    <button type="button" className="btn btn-primary btn-sm" onClick={onStartCreate}>
      <Plus size={16} aria-hidden /> New
    </button>
  ) : (
    <Link to="/stocks" className="btn btn-secondary btn-sm">
      <Package size={16} aria-hidden /> Stocks
    </Link>
  )

  if (createStep === 'select') {
    return (
      <div className="shopping-mobile admin-mobile-page">
        <MobilePageHeader
          icon={Package}
          title="New ticket"
          description="Select groups to shop"
        />
        <ShoppingCreateMobileWizard
          groups={groups}
          selectedGroups={selectedGroups}
          previewLoading={previewLoading}
          onToggleGroup={onToggleGroup}
          onContinue={onContinuePreview}
          onCancel={onCancelCreate}
        />
      </div>
    )
  }

  if (createStep === 'preview') {
    return (
      <div className="shopping-mobile admin-mobile-page admin-mobile-page-with-bar">
        <MobilePageHeader icon={Package} title="Review list" description="Adjust amounts" />
        <ShoppingTicketPreview
          groups={groups}
          groupIds={selectedGroups}
          initialLines={previewLines}
          availableItems={previewItems}
          onBack={onBackPreview}
          onCreate={onCreateTicket}
          creating={creating}
          mobile
        />
      </div>
    )
  }

  return (
    <div className="shopping-mobile admin-mobile-page mobile-section-gap">
      <MobilePageHeader
        icon={Package}
        title="Shopping"
        description="Buy lists for stock groups"
        action={headerAction}
      />

      <ShoppingListTabs
        tab={tab}
        openCount={openTickets.length}
        closedCount={closedTickets.length}
        onTabChange={onTabChange}
      />

      {visibleTickets.length === 0 ? (
        <AdminEmptyPanel
          title={tab === 'open' ? 'No open tickets' : 'No closed tickets'}
          hint={manage ? 'Create a ticket to start shopping.' : undefined}
        />
      ) : (
        <div className="admin-mobile-shop-ticket-list">
          {visibleTickets.map((ticket) => (
            <ShoppingTicketRowCard
              key={ticket.id}
              ticket={ticket}
              groups={groups}
              onOpen={() => setActiveTicket(ticket)}
            />
          ))}
        </div>
      )}

      <ShoppingTicketSheet
        open={Boolean(activeTicket)}
        ticket={activeTicket}
        groups={groups}
        users={users}
        userId={userId}
        canManage={manage}
        onClose={() => setActiveTicket(null)}
        onCheckLine={async (itemId, qty) => {
          const ticketId = activeTicket?.id
          const updated = await onCheckLine?.(activeTicket, itemId, qty)
          if (!updated) return
          setActiveTicket((cur) =>
            cur?.id === ticketId && cur?.id === updated.id ? updated : cur,
          )
        }}
        onToggleAssignee={(uid) => onToggleAssignee?.(activeTicket, uid)}
        onCancelTicket={onCancelTicket}
      />
    </div>
  )
}
