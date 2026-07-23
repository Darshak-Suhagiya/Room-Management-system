import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../contexts/AuthContext'
import { useBottomNavPreferences } from '../contexts/BottomNavPreferencesContext'
import { getBottomNavTabs } from '../config/bottomNavTabs'
import { buildAuthSnapshot } from '../config/appNavRegistry'
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
  const authFromContext = useAuth()
  const auth = buildAuthSnapshot(authFromContext)
  const { isCustomizable, tabIds } = useBottomNavPreferences()

  const tabs = getBottomNavTabs(auth, { isCustomizable, tabIds })

  if (tabs.length === 0) return null

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {tabs.map((tab) => (
        <BottomNavLink
          key={tab.path}
          to={tab.path}
          end={tab.end}
          label={tab.label}
          icon={tab.icon}
        />
      ))}
    </nav>
  )
}
