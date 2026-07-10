import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import ErrorBoundary from './components/shared/ErrorBoundary'
import BottomNav from './components/shared/BottomNav'
import Toast from './components/shared/Toast'
import { showToast } from './components/shared/Toast'
import LanguageSwitch from './components/shared/LanguageSwitch'
import './styles/globals.css'

import Login              from './pages/Login'
import Signup             from './pages/Signup'
import Onboarding         from './pages/Onboarding'
import Home               from './pages/Home'
import TopicPage          from './pages/TopicPage'
import AIChallenge        from './pages/AIChallenge'
import BossBattle         from './pages/BossBattle'
import AdaptiveLearning   from './pages/AdaptiveLearning'
import Leaderboard        from './pages/Leaderboard'
import Profile            from './pages/Profile'
import Avatar             from './pages/Avatar'
import DailyChallengePage from './pages/DailyChallengePage'
import NotFound           from './pages/NotFound'

function RedirectWithMessage({ to, message }) {
  if (message) sessionStorage.setItem('authMessage', message)
  return <Navigate to={to} replace />
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', fontSize: 32 }}>
      <img src="/logo.png" style={{ width: 56, height: 56, objectFit: 'contain' }} alt="ZenithLearn" />
    </div>
  )
  if (!user) return <RedirectWithMessage to="/login" message="Please login to continue." />
  if (!user.onboardingComplete && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

function AccountRoute({ children, message = 'Please login to use this feature.' }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <RedirectWithMessage to="/login" message={message} />
  if (user.isGuest) return <GuestRestricted message={message} />
  return children
}

function GuestRestricted({ message }) {
  const { colors } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    showToast(message, 'warning')
  }, [message])

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Poppins, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
        <h2 style={{ color: colors.text, margin: '0 0 8px', fontSize: 20 }}>Login Required</h2>
        <p style={{ color: colors.textMuted, margin: '0 0 20px', lineHeight: 1.6, fontSize: 14 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              borderRadius: 10,
              padding: '10px 16px',
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Back Home
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: colors.accent,
              border: 'none',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 18px',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Login / Signup
          </button>
        </div>
      </div>
    </div>
  )
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user && !user.isGuest ? <Navigate to="/home" replace /> : children
}

function MobileBottomNav() {
  const { user } = useAuth()
  if (!user || !user.onboardingComplete) return null
  return <BottomNav />
}

function PublicLanguageSwitch() {
  const { user, loading } = useAuth()
  if (loading || user?.onboardingComplete) return null
  return <LanguageSwitch floating />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"                   element={<Navigate to="/home" replace />} />
      <Route path="/login"              element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup"             element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/onboarding"         element={<PrivateRoute><Onboarding /></PrivateRoute>} />
      <Route path="/home"               element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/topic/:topicId"     element={<PrivateRoute><TopicPage /></PrivateRoute>} />
      <Route path="/challenge/:topicId" element={<PrivateRoute><AIChallenge /></PrivateRoute>} />
      <Route path="/boss-ai/:topicId"   element={<PrivateRoute><BossBattle /></PrivateRoute>} />
      <Route path="/adaptive-learning"  element={<AccountRoute message="Adaptive Learning Intelligence is available after login."><AdaptiveLearning /></AccountRoute>} />
      <Route path="/leaderboard"        element={<AccountRoute message="Leaderboards are available after login."><Leaderboard /></AccountRoute>} />
      <Route path="/profile"            element={<AccountRoute message="Create an account to save profile stats, badges, and leaderboard progress."><Profile /></AccountRoute>} />
      <Route path="/avatar"             element={<PrivateRoute><Avatar /></PrivateRoute>} />
      <Route path="/daily-challenge"    element={<PrivateRoute><DailyChallengePage /></PrivateRoute>} />
      <Route path="*"                   element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ErrorBoundary>
              <AppRoutes />
              <PublicLanguageSwitch />
              <MobileBottomNav />
              <Toast />
            </ErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
