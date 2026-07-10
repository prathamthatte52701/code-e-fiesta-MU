import { useNavigate, useLocation } from 'react-router-dom'
import { Brain, Home, Trophy, User, LogOut } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import LanguageSwitch from './LanguageSwitch'
import UserAvatar from './UserAvatar'

export default function Navbar() {
  const { colors } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: '/home',        icon: <Home size={18} />,   label: 'Home' },
    ...(!user?.isGuest ? [{ path: '/adaptive-learning', icon: <Brain size={18} />, label: 'ALI' }] : []),
    { path: '/leaderboard', icon: <Trophy size={18} />, label: 'Leaderboard' },
    { path: '/profile',     icon: <User size={18} />,   label: 'Profile' },
  ]

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <nav style={{
      background: colors.surface,
      borderBottom: `2px solid var(--hud-border-default)`,
      padding: '0 24px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      fontFamily: 'Poppins, sans-serif',
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate('/home')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
        <img src="/logo.png" alt="ZenithLearn" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
        <span style={{ color: colors.accent, fontWeight: 700, fontSize: 18 }}>ZenithLearn</span>
      </div>

      {/* Nav Items — hidden on mobile via CSS, bottom nav used instead */}
      <div className="nav-desktop-items" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {navItems.map(item => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                background: active ? colors.accent : 'transparent',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                cursor: 'pointer',
                color: active ? '#fff' : colors.textMuted,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LanguageSwitch />
        {user && (
          <>
            <span style={{ color: colors.warning, fontSize: 14, fontWeight: 600 }}>🔥 {user.streak || 0}</span>
            <span style={{ color: colors.gold, fontSize: 14, fontWeight: 600 }}>⭐ {user.totalPoints || 0}</span>
          </>
        )}
        <ThemeToggle />
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
              <UserAvatar avatar={user.avatar} size={34} />
            </div>
            <button
              onClick={() => { logout(); navigate('/login') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: colors.textMuted, padding: 4,
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
