import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'
import { getStoredLanguage, onLanguageChange, setStoredLanguage } from '../utils/i18n'
import {
  clearGuestData,
  createGuestUser,
  GUEST_MODE_KEY,
  getGuestMigrationPayload,
  getGuestUser,
  hasGuestProgress,
  isGuestModeEnabled,
  saveGuestUser,
} from '../utils/guestProgress'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [guestMigrationAvailable, setGuestMigrationAvailable] = useState(false)
  const [migrationMessage, setMigrationMessage] = useState('')

  useEffect(() => {
    const preferredLanguage = setStoredLanguage(getStoredLanguage(), { emit: false })

    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me')
        .then(res => {
          const nextUser = res.data.user || res.data
          const storedLang = preferredLanguage
          const dbLang = nextUser?.language || 'english'
          // If localStorage has a non-English preference but DB has English (e.g. failed save), sync it up
          if (storedLang !== 'english' && dbLang === 'english') {
            api.put('/profile/update', { language: storedLang }).catch(() => {})
            nextUser.language = storedLang
          } else if (nextUser?.language) {
            setStoredLanguage(nextUser.language, { emit: false })
          }
          setUser(nextUser)
          setGuestMigrationAvailable(hasGuestProgress())
        })
        .catch(() => {
          localStorage.removeItem('token')
          sessionStorage.setItem('authMessage', 'Session expired. Please login again.')
        })
        .finally(() => setLoading(false))
    } else {
      if (isGuestModeEnabled()) setUser(getGuestUser())
      setLoading(false)
    }
  }, [])

  useEffect(() => onLanguageChange((language) => {
    setUser(prev => {
      if (!prev) return prev
      if (prev.isGuest) return saveGuestUser({ language })
      return { ...prev, language }
    })
  }), [])

  // Signup → does NOT auto-login per new doc
  const signup = async (name, email, password) => {
    await api.post('/auth/signup', {
      name: name.trim().replace(/\s+/g, ' '),
      email: email.trim().toLowerCase(),
      password,
      language: getStoredLanguage(),
    })
    // Returns { message: 'Account created. Please login.' }
  }

  const login = async (email, password) => {
    const res = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    })
    const storedLang = getStoredLanguage()
    const dbLang = res.data.user.language || 'english'
    // If user explicitly chose a non-English language before login and DB has default English, respect it
    const effectiveLang = (storedLang !== 'english' && dbLang === 'english') ? storedLang : dbLang

    localStorage.setItem('token', res.data.token)
    localStorage.removeItem(GUEST_MODE_KEY)
    setGuestMigrationAvailable(hasGuestProgress())
    setStoredLanguage(effectiveLang, { emit: false })

    const loginUser = effectiveLang !== dbLang
      ? { ...res.data.user, language: effectiveLang }
      : res.data.user
    if (effectiveLang !== dbLang) {
      api.put('/profile/update', { language: effectiveLang }).catch(() => {})
    }
    setUser(loginUser)
    return loginUser
  }

  const devLogin = async () => {
    const res = await api.post('/auth/dev-login')
    localStorage.setItem('token', res.data.token)
    localStorage.removeItem(GUEST_MODE_KEY)
    setUser(res.data.user)
    setGuestMigrationAvailable(hasGuestProgress())
    setStoredLanguage(res.data.user.language || 'english', { emit: false })
    return res.data.user
  }

  const logout = () => {
    localStorage.removeItem('token')
    if (user?.isGuest) clearGuestData()
    setUser(null)
  }

  const startGuest = () => {
    localStorage.removeItem('token')
    const guest = saveGuestUser(createGuestUser())
    setUser(guest)
    return guest
  }

  const updateUser = (updates) => setUser(prev => {
    if (!prev) return prev
    const next = { ...prev, ...updates }
    if (next.isGuest) saveGuestUser(next)
    return next
  })

  const migrateGuestProgress = async () => {
    setMigrationMessage('')
    const payload = getGuestMigrationPayload()
    if (!payload.progress.length) {
      setGuestMigrationAvailable(false)
      return null
    }
    const res = await api.post('/progress/migrate', payload)
    const migratedPoints = Number(res.data?.migratedPoints) || 0
    if (migratedPoints > 0) {
      setUser(prev => prev ? {
        ...prev,
        totalPoints: (prev.totalPoints || 0) + migratedPoints,
        weeklyPoints: (prev.weeklyPoints || 0) + migratedPoints,
        dailyPoints: (prev.dailyPoints || 0) + migratedPoints,
      } : prev)
    }
    clearGuestData()
    setGuestMigrationAvailable(false)
    setMigrationMessage('Guest progress moved to your account.')
    return res.data
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      devLogin,
      signup,
      logout,
      startGuest,
      updateUser,
      guestMigrationAvailable,
      migrateGuestProgress,
      migrationMessage,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
