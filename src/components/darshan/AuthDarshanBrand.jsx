import { CalendarCheck, ShieldCheck, Vote } from 'lucide-react'
import { BlessingHero } from './BlessingHero'
import { BlessingStamp } from './BlessingStamp'
import { getDarshanArt } from '../../config/darshanArt'

export function AuthDarshanBrand() {
  const art = getDarshanArt('login')
  return (
    <aside className="auth-brand auth-brand-darshan">
      <img
        className="auth-brand-photo"
        src={art.desktop}
        alt="Shri Ghanshyam Maharaj"
        width={1920}
        height={1080}
        decoding="async"
        fetchPriority="high"
        style={{ objectPosition: art.position }}
      />
      <div className="auth-brand-scrim" aria-hidden />
      <div className="auth-brand-inner">
        <div className="auth-brand-badge">
          <BlessingStamp artKey="chrome" size="md" />
          Room Management
        </div>
        <div className="auth-brand-hero">
          <p className="blessing-hero-kicker">Jay Swaminarayan</p>
          <h2>Plan meals, track seva, and vote — all in one place.</h2>
          <p>
            A calm, focused workspace for your kitchen and rooms. Sign in to see
            today&apos;s menu and cast your vote.
          </p>
          <ul className="auth-brand-points">
            <li>
              <CalendarCheck size={18} /> Daily meal planning &amp; menus
            </li>
            <li>
              <Vote size={18} /> Live meal voting &amp; dashboards
            </li>
            <li>
              <ShieldCheck size={18} /> Role-based access for admins &amp; maharaj
            </li>
          </ul>
        </div>
        <p className="auth-brand-foot">Meal Planner &amp; Participation Tracker</p>
      </div>
    </aside>
  )
}

export function AuthMobileHero({
  title = 'Room Management',
  subtitle = 'Meal planner and participation tracker.',
}) {
  return (
    <BlessingHero
      artKey="login"
      size="tall"
      title={title}
      subtitle={subtitle}
      className="auth-mobile-darshan"
      fetchPriority="high"
    />
  )
}
