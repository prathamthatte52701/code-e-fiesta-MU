import { useNavigate, useLocation } from 'react-router-dom'
import { Brain, Home, Trophy, User } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'

const items = [
  { path: '/home',        icon: Home,   label: 'Home' },
  { path: '/adaptive-learning', icon: Brain, label: 'ALI' },
  { path: '/leaderboard', icon: Trophy, label: 'Rank' },
  { path: '/profile',     icon: User,   label: 'Profile' },
]

export default function BottomNav() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const visibleItems = user?.isGuest ? items.filter(item => item.path !== '/adaptive-learning') : items

  return (
    <nav style={{
      display: 'none',
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: colors.surface, borderTop: `1px solid ${colors.border}`,
      padding: '8px 0 env(safe-area-inset-bottom, 8px)',
      // shown via CSS media query
    }} className="bottom-nav">
      {visibleItems.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path
        return (
          <button key={path} onClick={() => navigate(path)} style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: active ? colors.accent : colors.textMuted,
            fontFamily: 'Poppins, sans-serif', padding: '4px 0',
          }}>
            <Icon size={22} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
