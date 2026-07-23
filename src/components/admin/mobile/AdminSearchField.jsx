import { Search } from 'lucide-react'
import { MobileFilterBar } from '../../mobile/MobileFilterBar'

export function AdminSearchField({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}) {
  return (
    <MobileFilterBar className={`admin-mobile-search-bar ${className}`.trim()}>
      <label className="admin-mobile-search-field">
        <Search size={18} className="admin-mobile-search-icon" aria-hidden />
        <input
          type="search"
          className="admin-mobile-search-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
      </label>
    </MobileFilterBar>
  )
}
