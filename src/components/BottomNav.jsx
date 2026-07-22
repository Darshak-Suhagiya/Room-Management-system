import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  BarChart3,
  CalendarOff,
  Package,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { triggerSelectionHaptic } from '../utils/haptics'

function BottomNavLink({ to, end, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => triggerSelectionHaptic()}
      className="bottom-nav-link"
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="bottom-nav-active-pill"
              className="bottom-nav-active-pill"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <motion.span
            className="bottom-nav-link-inner"
            whileTap={{ scale: 0.92 }}
            animate={{ scale: isActive ? 1.05 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.5 : 2}
              className={isActive ? 'text-primary' : 'text-muted'}
              aria-hidden
            />
            <span
              className={`bottom-nav-link-label ${isActive ? 'is-active' : ''}`}
            >
              {label}
            </span>
          </motion.span>
        </>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  const { isMaharaj, canViewStocks, canAccessVoteDashboard } = useAuth()

  const tabs = [
    isMaharaj
      ? canAccessVoteDashboard && {
          to: '/admin/votes',
          label: 'Votes',
          icon: BarChart3,
        }
      : { to: '/', end: true, label: 'Meals', icon: UtensilsCrossed },
    !isMaharaj && { to: '/seva', label: 'Seva', icon: Sparkles },
    { to: '/leaves', label: 'Leave', icon: CalendarOff },
    canViewStocks && { to: '/stocks', label: 'Stocks', icon: Package },
    canViewStocks && { to: '/shopping', label: 'Shop', icon: ShoppingCart },
  ].filter(Boolean)

  if (tabs.length === 0) return null

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {tabs.map((tab) => (
        <BottomNavLink key={tab.to} {...tab} />
      ))}
    </nav>
  )
}
