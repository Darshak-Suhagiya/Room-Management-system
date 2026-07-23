import { MobileVoteItemCard } from './MobileVoteItemCard'

const CAT_TONES = ['cat-tone-0', 'cat-tone-1', 'cat-tone-2', 'cat-tone-3', 'cat-tone-4']

export function MobileVoteCategorySection({
  category,
  catIndex,
  items,
  slot,
  votes,
  missingIds,
  invalidIds,
  onUpdateVote,
  disabled = false,
  getVoteValue,
}) {
  return (
    <section className="meal-vote-mobile-category">
      <h4
        className={`meal-vote-mobile-category-title ${CAT_TONES[catIndex % CAT_TONES.length]}`}
      >
        {category.labelGu}
      </h4>
      <div className="meal-vote-mobile-item-list">
        {items.map((item) => (
          <MobileVoteItemCard
            key={item.id}
            item={item}
            slot={slot}
            value={getVoteValue(votes, item.id)}
            onChange={(val) => onUpdateVote(item.id, item.voteType, val)}
            disabled={disabled}
            missing={missingIds.includes(item.id)}
            invalid={invalidIds.includes(item.id)}
          />
        ))}
      </div>
    </section>
  )
}
