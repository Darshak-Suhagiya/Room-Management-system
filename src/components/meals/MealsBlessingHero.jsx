import { BlessingHero } from '../darshan/BlessingHero'

export function MealsBlessingHero({ actions = null }) {
  return (
    <BlessingHero
      artKey="meals"
      size="tall"
      title="My meals"
      subtitle="Pick a day. Vote morning or evening."
      actions={actions}
      fetchPriority="high"
      className="meals-page-hero"
    />
  )
}
