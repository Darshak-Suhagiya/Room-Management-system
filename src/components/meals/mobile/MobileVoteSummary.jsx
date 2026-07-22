import { formatVoteDisplay, getVoteValue } from '../../../utils/menuVoteUtils'

const CAT_TONES = ['cat-tone-0', 'cat-tone-1', 'cat-tone-2', 'cat-tone-3', 'cat-tone-4']

export function MobileVoteSummary({ grouped, votes, notEating }) {
  if (notEating) {
    return (
      <div className="meal-vote-mobile-summary">
        <p className="meal-vote-mobile-summary-banner not-eating">Not eating this meal</p>
      </div>
    )
  }

  return (
    <div className="meal-vote-mobile-summary">
      {grouped.map(({ category, items }, catIndex) => (
        <section key={category.id} className="meal-vote-mobile-summary-category">
          <h4
            className={`meal-vote-mobile-category-title ${CAT_TONES[catIndex % CAT_TONES.length]}`}
          >
            {category.labelGu}
          </h4>
          <ul className="meal-vote-mobile-summary-chips">
            {items.map((item) => {
              const val = getVoteValue(votes, item.id)
              const isNo = val === false
              return (
                <li key={item.id} className="meal-vote-mobile-summary-chip-row">
                  <span className="meal-vote-mobile-summary-chip-name">{item.gu}</span>
                  <span
                    className={`meal-vote-mobile-summary-chip${isNo ? ' is-no' : ' is-yes'}`}
                  >
                    {formatVoteDisplay(item, val)}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
