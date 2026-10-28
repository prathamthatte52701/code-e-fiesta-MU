import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Settings, Mic } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from '../components/shared/ThemeToggle'
import LanguageSwitch from '../components/shared/LanguageSwitch'
import AuthRobot from '../components/shared/AuthRobot'
import { validateLogin } from '../utils/validators'
import { t } from '../utils/i18n'

const getAuthErrorMessage = (err) => {
  if (err.response?.data?.message) return err.response.data.message
  if (err.code === 'ERR_NETWORK') return 'Cannot reach the live server. Refresh once and try again.'
  return err.message || 'Login failed'
}

export default function Login() {
  const { colors } = useTheme()
  const { login, devLogin, startGuest, user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]       = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPass, setShowPass] = useState(false)
  const [serverError, setServerError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [devLoading, setDevLoading] = useState(false)

  useEffect(() => {
    const message = sessionStorage.getItem('authMessage')
    if (message) {
      setInfoMessage(message)
      sessionStorage.removeItem('authMessage')
    }
  }, [])

  const inputStyle = {
    width: '100%',
    padding: '12px 16px 12px 44px',
    background: colors.surface,
    color: colors.text,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Poppins, sans-serif',
  }

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }))
    setServerError('')
    setInfoMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { errors } = validateLogin(form.email, form.password)
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }

    setLoading(true)
    setServerError('')
    try {
      const user = await login(form.email, form.password)
      navigate(user.onboardingComplete ? '/home' : '/onboarding')
    } catch (err) {
      setServerError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = () => {
    startGuest()
    navigate('/home')
  }

  const handleDevLogin = async () => {
    setDevLoading(true)
    setServerError('')
    setInfoMessage('')
    try {
      const user = await devLogin()
      navigate(user.onboardingComplete ? '/home' : '/onboarding')
    } catch (err) {
      setServerError(getAuthErrorMessage(err))
    } finally {
      setDevLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ position: 'fixed', top: 20, left: 20, display: 'flex', gap: 8 }}><LanguageSwitch /></div>
      <div style={{ position: 'fixed', top: 20, right: 20 }}><ThemeToggle /></div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}>
            <AuthRobot alt="ZenithLearn login robot" />
          </motion.div>
          <h1 style={{ color: colors.text, margin: 0, fontSize: 28, fontWeight: 700 }}>ZenithLearn</h1>
          <p style={{ color: colors.textMuted, margin: '8px 0 0', fontSize: 14 }}>Bilingual Code Learning Platform</p>
        </div>

        <div className="hud-border-default" style={{ background: colors.surface, padding: 32 }}>
          <h2 style={{ color: colors.text, margin: '0 0 24px', fontSize: 22, fontWeight: 600 }}>Welcome Back 👋</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {infoMessage && (
              <div style={{ background: `${colors.accent}15`, border: `1px solid ${colors.accent}`, borderRadius: 8, padding: '10px 14px', color: colors.accent, fontSize: 13 }}>
                {infoMessage}
              </div>
            )}

            {/* Email */}
            <div>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color={colors.textMuted} style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange('email')}
                  className={fieldErrors.email ? 'hud-input hud-input-error' : 'hud-input'}
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <p style={{ color: colors.error, margin: '4px 0 0', fontSize: 12 }}>⚠️ {fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color={colors.textMuted} style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange('password')}
                  className={fieldErrors.password ? 'hud-input hud-input-error' : 'hud-input'}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: 14, background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <p style={{ color: colors.error, margin: '4px 0 0', fontSize: 12 }}>⚠️ {fieldErrors.password}</p>}
            </div>

            {serverError && (
              <div className="hud-border-pink" style={{ background: `${colors.error}15`, padding: '10px 14px', color: colors.error, fontSize: 13 }}>
                ⚠️ {serverError}
              </div>
            )}

            <button type="submit" disabled={loading} className="hud-btn" style={{
              background: colors.accent, color: '#fff',
              padding: '13px', fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'all 0.2s', fontFamily: 'Poppins, sans-serif',
            }}>
              {loading ? 'Logging in...' : 'Login →'}
            </button>

            <button type="button" onClick={handleGuest} className="hud-btn-secondary" style={{
              background: 'transparent', color: colors.accent,
              padding: '12px', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
            }}>
              {t(user?.language, 'continueAsGuest', 'Continue as Guest')} →
            </button>

            <button type="button" onClick={handleDevLogin} disabled={devLoading} className="hud-btn-gold" style={{
              background: '#f59e0b', color: '#111827',
              padding: '12px', fontSize: 15, fontWeight: 700,
              cursor: devLoading ? 'wait' : 'pointer', fontFamily: 'Poppins, sans-serif',
              opacity: devLoading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Settings size={17} />
              Development Mode
            </button>

            <button type="button" disabled className="hud-btn-secondary" style={{
              background: 'transparent', color: colors.textMuted,
              border: `1px solid ${colors.border}`,
              padding: '12px', fontSize: 15, fontWeight: 600,
              cursor: 'not-allowed', fontFamily: 'Poppins, sans-serif',
              opacity: 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Mic size={17} />
              Voice Login (Coming Soon)
            </button>
          </form>

          <p style={{ color: colors.textMuted, textAlign: 'center', marginTop: 20, fontSize: 14 }}>
            New here?{' '}
            <Link to="/signup" style={{ color: colors.accent, textDecoration: 'none', fontWeight: 600 }}>Create Account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
