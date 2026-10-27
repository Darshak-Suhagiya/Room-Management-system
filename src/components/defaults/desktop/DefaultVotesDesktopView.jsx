import { Save as IconSave, Search as IconSearch } from 'lucide-react'
import { BlessingHero } from '../../darshan'
import { VoteInput } from '../../meals/VoteInput'
import { DEFAULT_MEAL_MODE } from '../../../config/constants'
import { formatDisplayDateGu } from '../../../utils/mealDateUtils'
import { getVoteValue } from '../../../utils/menuVoteUtils'
import { DefaultOverrideCalendar } from '../DefaultOverrideCalendar'
import '../defaults.css'

const CAT_TONES = ['cat-tone-0', 'cat-tone-1', 'cat-tone-2', 'cat-tone-3', 'cat-tone-4']

export function DefaultVotesDesktopView({ ctrl }) {
  const {
    mode,
    setMode,
    votes,
    updateVote,
    dirty,
    saving,
    save,
    reset,
    invalidIds,
    filter,
    changeFilter,
    categoryId,
    setCategoryId,
    categoryChips,
    search,
    setSearch,
    grouped,
    allCount,
    missingCount,
    gate,
    requiredMissingIds,
    plannedDates,
    overrides,
    overrideBusy,
    applyOverrides,
    today,
    loadError,
  } = ctrl

  const eating = mode === DEFAULT_MEAL_MODE.EATING
  const required = new Set(requiredMissingIds)

  return (
    <div className="page defaults-page">
      <BlessingHero
        artKey="meals"
        size="tall"
        title="Default votes"
        subtitle="Used for meals you haven’t voted on. Set Eating or Not eating, give each dish a default vote, and mark special dates on the calendar."
      />

      {loadError ? <p className="form-error">{loadError}</p> : null}

      <div className="rail-layout">
        <div className="dash-main defaults-main">
          <section className="rail-card defaults-mode-card">
            <div className="defaults-mode-head">
              <div>
                <h3 className="rail-card-title">Default attendance</h3>
                <p className="muted defaults-mode-desc">
                  {eating
                    ? 'If you don’t vote, you’re counted as eating, with the default vote you set below for each dish.'
                    : 'If you don’t vote, you’re counted as not eating. This is the starting default.'}
                </p>
              </div>
              <div
                className="eating-toggle slot-morning defaults-mode-toggle"
                role="group"
                aria-label="Default attendance"
              >
                <button
                  type="button"
                  className={`eating-toggle-btn ${eating ? 'is-active' : ''}`}
                  disabled={saving}
                  aria-pressed={eating}
                  onClick={() => setMode(DEFAULT_MEAL_MODE.EATING)}
                >
                  Eating
                </button>
                <button
                  type="button"
                  className={`eating-toggle-btn ${!eating ? 'is-active' : ''}`}
                  disabled={saving}
                  aria-pressed={!eating}
                  onClick={() => setMode(DEFAULT_MEAL_MODE.NOT_EATING)}
                >
                  Not eating
                </button>
              </div>
            </div>
            {!eating && (
              <p className="defaults-mode-note">
                Dish defaults below are used only on dates you mark as Eating.
              </p>
            )}
          </section>

          {eating && requiredMissingIds.length > 0 && (
            <div className="defaults-needs-notice" role="status">
              <strong>
                {requiredMissingIds.length} planned{' '}
                {requiredMissingIds.length === 1 ? 'dish needs' : 'dishes need'} a
                default vote.
              </strong>{' '}
              Voting in My Meals stays closed until these are set and saved.
            </div>
          )}

          <div className="defaults-toolbar">
            <div className="defaults-filter-seg" role="group" aria-label="Filter dishes">
              <button
                type="button"
                className={`defaults-filter-btn ${filter === 'all' ? 'is-active' : ''}`}
                aria-pressed={filter === 'all'}
                onClick={() => changeFilter('all')}
              >
                All <span>{allCount}</span>
              </button>
              <button
                type="button"
                className={`defaults-filter-btn ${filter === 'missing' ? 'is-active' : ''}`}
                aria-pressed={filter === 'missing'}
                onClick={() => changeFilter('missing')}
              >
                Not set <span>{missingCount}</span>
              </button>
            </div>
            <label className="defaults-toolbar-field">
              <span className="sr-only">Category</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="all">All categories</option>
                {categoryChips.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="defaults-toolbar-search">
              <IconSearch size={16} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes"
                aria-label="Search dishes"
              />
            </label>
          </div>

          {grouped.length === 0 ? (
            <p className="muted defaults-empty">
              {filter === 'missing'
                ? 'Every dish has a default vote.'
                : 'No dishes match your search.'}
            </p>
          ) : (
            <div className="rail-card defaults-dish-card">
              {grouped.map(({ category, items }, catIndex) => (
                <div
                  key={category.id}
                  className={`menu-category-block ${catIndex > 0 ? 'has-separator' : ''}`}
                >
                  <h4
                    className={`menu-category-title ${CAT_TONES[catIndex % CAT_TONES.length]}`}
                  >
                    {category.labelGu}
                  </h4>
                  <ul className="menu-vote-list">
                    {items.map((item, itemIndex) => {
                      const value = getVoteValue(votes, item.id)
                      const unset =
                        value === undefined || value === null || value === ''
                      const invalid = invalidIds.includes(item.id)
                      const isRequired = required.has(item.id)
                      return (
                        <li
                          key={item.id}
                          className={itemIndex < items.length - 1 ? 'has-item-separator' : ''}
                        >
                          <div
                            className={`menu-item-with-vote defaults-dish-row ${invalid ? 'vote-row-invalid' : ''} ${isRequired ? 'vote-row-missing' : ''}`}
                          >
                            <span className="menu-item-name">
                              {item.gu}
                              {item.en ? (
                                <span className="defaults-dish-en">{item.en}</span>
                              ) : null}
                            </span>
                            <VoteInput
                              item={item}
                              value={value}
                              hasError={invalid || isRequired}
                              disabled={saving}
                              onChange={(val) => updateVote(item.id, item.voteType, val)}
                            />
                            {invalid ? (
                              <span className="vote-missing-hint">Invalid value</span>
                            ) : isRequired ? (
                              <span className="vote-missing-hint">Needed for planned menu</span>
                            ) : unset ? (
                              <span className="defaults-not-set">Not set</span>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className={`defaults-save-bar ${dirty ? 'is-dirty' : ''}`}>
            <span className="defaults-save-hint">
              {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={reset}
              disabled={!dirty || saving}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={save}
              disabled={!dirty || saving}
            >
              <IconSave size={16} />
              {saving ? 'Saving…' : 'Save defaults'}
            </button>
          </div>
        </div>

        <aside className="rail-col defaults-rail">
          <section className="rail-card">
            <h3 className="rail-card-title">Date overrides</h3>
            <p className="muted defaults-rail-desc">
              Choose dates or a range to set Eating or Not eating. Other days use
              your default.
            </p>
            <DefaultOverrideCalendar
              overrides={overrides}
              plannedDates={plannedDates}
              today={today}
              busy={overrideBusy}
              onApply={applyOverrides}
            />
          </section>

          <section className="rail-card defaults-gate-card">
            <h3 className="rail-card-title">Planned menus missing defaults</h3>
            {gate.count === 0 ? (
              <p className="muted">Nothing missing. You can vote in My Meals.</p>
            ) : (
              <ul className="defaults-gate-list">
                {gate.items.map(({ item, dates }) => (
                  <li key={item.id}>
                    <strong>{item.gu}</strong>
                    <span>
                      {dates.slice(0, 3).map(formatDisplayDateGu).join(' · ')}
                      {dates.length > 3 ? ` +${dates.length - 3}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
