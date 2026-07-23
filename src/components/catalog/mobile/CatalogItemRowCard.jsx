import { AdminItemRowCard } from '../../admin/mobile/AdminItemRowCard'
import { VOTE_TYPE_LABELS } from '../../../config/voteTypes'
import { defaultVoteTypeForCategory } from '../../../config/voteTypes'

export function CatalogItemRowCard({ item, dirty, onClick }) {
  const voteType = item.voteType ?? defaultVoteTypeForCategory(item.categoryId)
  const subtitle = [item.gu, item.en].filter(Boolean).join(' · ')

  return (
    <AdminItemRowCard
      title={item.gu || item.en || 'Untitled'}
      subtitle={subtitle !== (item.gu || item.en) ? subtitle : item.en}
      badge={VOTE_TYPE_LABELS[voteType]}
      dirty={dirty}
      onClick={onClick}
    />
  )
}
