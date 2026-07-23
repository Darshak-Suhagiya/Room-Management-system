import { ChevronDown, ChevronUp } from 'lucide-react'
import { useBottomNavPreferences } from '../../contexts/BottomNavPreferencesContext'
import { getNavDefById } from '../../config/appNavRegistry'
import { IconButton } from '../ui/IconButton'
import { triggerSelectionHaptic } from '../../utils/haptics'

function TabToggle({ checked, disabled, onChange, label }) {
  return (
    <label className="bottom-nav-settings-toggle">
      <input
        type="checkbox"
        role="switch"
        className="bottom-nav-settings-switch"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          triggerSelectionHaptic()
          onChange(e.target.checked)
        }}
      />
    </label>
  )
}

function TabRow({
  tab,
  index,
  selectedCount,
  isRequired,
  atMin,
  atMax,
  moveTab,
  toggleTab,
}) {
  const Icon = tab.icon
  const canMoveUp = index > 0
  const canMoveDown = index < selectedCount - 1
  const canTurnOff = !isRequired && !atMin

  return (
    <li className="bottom-nav-settings-row is-selected">
      <span className="bottom-nav-settings-row-main">
        <span className="bottom-nav-settings-icon" aria-hidden>
          <Icon size={20} />
        </span>
        <span className="bottom-nav-settings-label">{tab.label}</span>
        {isRequired && (
          <span className="bottom-nav-settings-badge">Required</span>
        )}
      </span>

      <span className="bottom-nav-settings-controls">
        <span className="bottom-nav-settings-reorder">
          <IconButton
            label={`Move ${tab.label} up`}
            size="sm"
            disabled={!canMoveUp}
            onClick={() => {
              triggerSelectionHaptic()
              moveTab(tab.id, 'up')
            }}
          >
            <ChevronUp size={18} />
          </IconButton>
          <IconButton
            label={`Move ${tab.label} down`}
            size="sm"
            disabled={!canMoveDown}
            onClick={() => {
              triggerSelectionHaptic()
              moveTab(tab.id, 'down')
            }}
          >
            <ChevronDown size={18} />
          </IconButton>
        </span>
        <TabToggle
          checked
          disabled={isRequired || !canTurnOff}
          label={`${tab.label} in bottom navigation`}
          onChange={() => toggleTab(tab.id)}
        />
      </span>
    </li>
  )
}

function UnselectedTabRow({ tab, atMax, toggleTab }) {
  const Icon = tab.icon

  return (
    <li className="bottom-nav-settings-row is-unselected">
      <span className="bottom-nav-settings-row-main">
        <span className="bottom-nav-settings-icon" aria-hidden>
          <Icon size={20} />
        </span>
        <span className="bottom-nav-settings-label">{tab.label}</span>
      </span>

      <span className="bottom-nav-settings-controls">
        <TabToggle
          checked={false}
          disabled={atMax}
          label={`Add ${tab.label} to bottom navigation`}
          onChange={() => toggleTab(tab.id)}
        />
      </span>
    </li>
  )
}

function renderGroupSection({
  title,
  groupTabs,
  tabIds,
  selectedSet,
  requiredTabId,
  atMin,
  atMax,
  moveTab,
  toggleTab,
}) {
  if (groupTabs.length === 0) return null

  const selectedInGroup = tabIds
    .map((id) => groupTabs.find((tab) => tab.id === id))
    .filter(Boolean)

  const unselectedInGroup = groupTabs.filter((tab) => !selectedSet.has(tab.id))

  return (
    <div className="bottom-nav-settings-group">
      <p className="bottom-nav-settings-group-title">{title}</p>
      <ul className="bottom-nav-settings-list">
        {selectedInGroup.map((tab) => {
          const globalIndex = tabIds.indexOf(tab.id)
          return (
            <TabRow
              key={tab.id}
              tab={tab}
              index={globalIndex}
              selectedCount={tabIds.length}
              isRequired={tab.id === requiredTabId}
              atMin={atMin}
              atMax={atMax}
              moveTab={moveTab}
              toggleTab={toggleTab}
            />
          )
        })}
        {unselectedInGroup.map((tab) => (
          <UnselectedTabRow
            key={tab.id}
            tab={tab}
            atMax={atMax}
            toggleTab={toggleTab}
          />
        ))}
      </ul>
    </div>
  )
}

export function BottomNavSettingsSection() {
  const {
    isCustomizable,
    tabIds,
    availableTabs,
    requiredTabId,
    toggleTab,
    moveTab,
    resetToDefault,
    minTabs,
    maxTabs,
  } = useBottomNavPreferences()

  if (!isCustomizable) return null

  const selectedSet = new Set(tabIds)
  const atMin = tabIds.length <= minTabs
  const atMax = tabIds.length >= maxTabs

  const requiredDef = requiredTabId ? getNavDefById(requiredTabId) : null
  const requiredLabel = requiredDef?.sidebarLabel ?? 'Home'

  const mainTabs = availableTabs.filter((tab) => tab.group === 'main')
  const manageTabs = availableTabs.filter((tab) => tab.group === 'manage')

  const groupProps = {
    tabIds,
    selectedSet,
    requiredTabId,
    atMin,
    atMax,
    moveTab,
    toggleTab,
  }

  return (
    <section className="settings-section">
      <h3 className="settings-section-title">Bottom navigation</h3>
      <p className="settings-section-desc muted">
        Choose {minTabs}–{maxTabs} tabs and their order. {requiredLabel} is
        always included.
      </p>

      <p className="bottom-nav-settings-counter muted">
        {tabIds.length} of {maxTabs} tabs
        {atMin && ' · minimum reached'}
        {atMax && ' · maximum reached'}
      </p>

      {renderGroupSection({ title: 'Main', groupTabs: mainTabs, ...groupProps })}
      {renderGroupSection({
        title: 'Manage',
        groupTabs: manageTabs,
        ...groupProps,
      })}

      <button
        type="button"
        className="btn btn-ghost bottom-nav-settings-reset"
        onClick={() => {
          triggerSelectionHaptic()
          resetToDefault()
        }}
      >
        Reset to default
      </button>
    </section>
  )
}
