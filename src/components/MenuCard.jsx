import { MEAL_SLOTS, getItemLabel } from '../config/menuItems'
import { MenuSlotNote } from './MenuSlotNote'

function CategoryList({ slot, category, catalog, gujaratiOnly }) {
  const ids = slot[category.id] ?? []
  if (ids.length === 0) return null
  return (
    <div className="menu-category">
      <h4>{category.labelGu}</h4>
      <ul>
        {ids.map((id) => {
          const item = catalog.items.find((i) => i.id === id)
          return (
            <li key={id}>
              {gujaratiOnly && item ? item.gu : getItemLabel(id, category.id, catalog)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SlotMenu({ slotData, slotKey, catalog, enabled, gujaratiOnly, slotNote }) {
  const slot = MEAL_SLOTS[slotKey]
  if (!enabled) return null

  const hasAny = catalog.categories.some(
    (cat) => (slotData?.[cat.id] ?? []).length > 0,
  )

  if (!hasAny) {
    return (
      <div className={`meal-slot slot-bg-${slotKey} empty`}>
        <h3>{slot.labelEn}</h3>
        <MenuSlotNote note={slotNote} slot={slotKey} />
        <p className="muted">No menu</p>
      </div>
    )
  }

  return (
    <div className={`meal-slot slot-bg-${slotKey}`}>
      <h3>{slot.labelEn}</h3>
      <MenuSlotNote note={slotNote} slot={slotKey} />
      {catalog.categories.map((cat) => (
        <CategoryList
          key={cat.id}
          slot={slotData}
          category={cat}
          catalog={catalog}
          gujaratiOnly={gujaratiOnly}
        />
      ))}
    </div>
  )
}

export function MenuCard({
  menu,
  catalog,
  children,
  compact = false,
  gujaratiOnly = false,
}) {
  if (!menu || (!menu.hasMorning && !menu.hasEvening)) {
    return (
      <article className="menu-card empty">
        <p className="muted">No menu</p>
      </article>
    )
  }

  return (
    <article className={`menu-card ${compact ? 'menu-card-compact' : ''}`}>
      {!compact && (
        <header className="menu-card-header">
          <h2>{formatDisplayDate(menu.date)}</h2>
          {children}
        </header>
      )}
      <div className="menu-slots">
        <SlotMenu
          slotData={menu.morning}
          slotKey="morning"
          catalog={catalog}
          enabled={menu.hasMorning}
          gujaratiOnly={gujaratiOnly}
          slotNote={menu.morningNote}
        />
        <SlotMenu
          slotData={menu.evening}
          slotKey="evening"
          catalog={catalog}
          enabled={menu.hasEvening}
          gujaratiOnly={gujaratiOnly}
          slotNote={menu.eveningNote}
        />
      </div>
      {compact && children}
    </article>
  )
}

function formatDisplayDate(dateId) {
  const [y, m, d] = dateId.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
