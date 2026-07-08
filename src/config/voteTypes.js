export const VOTE_TYPES = {
  YES_NO: 'yes_no',
  INTEGER: 'integer',
}

export const VOTE_TYPE_LABELS = {
  [VOTE_TYPES.YES_NO]: 'Yes / No',
  [VOTE_TYPES.INTEGER]: 'Number',
}

export const DEFAULT_VOTE_TYPE_BY_CATEGORY = {
  vegetables: VOTE_TYPES.YES_NO,
  carbs: VOTE_TYPES.INTEGER,
  dalRice: VOTE_TYPES.YES_NO,
  special: VOTE_TYPES.YES_NO,
}

export function defaultVoteTypeForCategory(categoryId) {
  return DEFAULT_VOTE_TYPE_BY_CATEGORY[categoryId] ?? VOTE_TYPES.YES_NO
}
