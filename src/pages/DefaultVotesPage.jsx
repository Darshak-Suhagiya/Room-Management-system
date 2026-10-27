import { useMediaQuery } from '../hooks/useMediaQuery'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { useDefaultVotesController } from '../hooks/useDefaultVotesController'
import { MobilePageSkeleton } from '../components/mobile/MobilePageSkeleton'
import { DefaultVotesDesktopView } from '../components/defaults/desktop/DefaultVotesDesktopView'
import { DefaultVotesMobileView } from '../components/defaults/mobile/DefaultVotesMobileView'

/**
 * Member default votes: Eating / Not eating, a default for each dish, and
 * calendar overrides. Desktop and mobile are separate layouts.
 */
export function DefaultVotesPage() {
  const isMobile = useMediaQuery('(max-width: 899px)')
  const ctrl = useDefaultVotesController()
  const showSkeleton = useDelayedLoading(ctrl.loading)

  if (ctrl.loading) {
    return showSkeleton ? (
      <MobilePageSkeleton artKey="meals" size="standard" title="Default votes" />
    ) : null
  }

  return isMobile ? (
    <div className="page defaults-page-mobile">
      <DefaultVotesMobileView ctrl={ctrl} />
    </div>
  ) : (
    <DefaultVotesDesktopView ctrl={ctrl} />
  )
}
