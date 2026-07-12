import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import { stopSpeaking } from '../../utils/tts'
import { LANGUAGES, getStoredLanguage, setStoredLanguage, normalizeLanguage } from '../../utils/i18n'
import { showToast } from './Toast'

const OPTIONS = [
  { id: 'english',   shortLabel: 'EN'  },
  { id: 'hindi',     shortLabel: 'हिं'  },
  { id: 'tamil',     shortLabel: 'த'   },
  { id: 'malayalam', shortLabel: 'മ'   },
]

const COMING_SOON_LANGUAGES = new Set(['tamil', 'malayalam'])

export default function LanguageSwitch({ floating = false, style = {} }) {
  const { colors } = useTheme()
  const { user, updateUser } = useAuth()
  const [saving, setSaving] = useState(false)

  const currentLanguage = normalizeLanguage(user?.language || getStoredLanguage())

  const switchLanguage = async (nextLanguage) => {
    if (COMING_SOON_LANGUAGES.has(nextLanguage)) {
      showToast('This language will be available soon.', 'warning')
      return
    }
    if (saving || nextLanguage === currentLanguage) return
    setSaving(true)
    stopSpeaking()
    setStoredLanguage(nextLanguage)

    try {
      if (user && !user.isGuest) {
        const res = await api.put('/profile/update', { language: nextLanguage })
        updateUser(res.data.user || { language: nextLanguage })
      } else {
        updateUser({ language: nextLanguage })
      }
    } catch {
      if (user) updateUser({ language: nextLanguage })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      title="Switch language"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: 3,
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        boxShadow: floating ? '0 8px 24px rgba(0,0,0,0.18)' : 'none',
        opacity: saving ? 0.7 : 1,
        ...(floating ? { position: 'fixed', top: 18, left: 18, zIndex: 250 } : {}),
        ...style,
      }}
    >
      {OPTIONS.map(option => {
        const active = option.id === currentLanguage
        const label  = LANGUAGES[option.id]?.shortLabel || option.shortLabel
        return (
          <button
            key={option.id}
            type="button"
            disabled={saving}
            onClick={() => switchLanguage(option.id)}
            title={LANGUAGES[option.id]?.nativeLabel}
            style={{
              minWidth: 32,
              height: 28,
              border: 'none',
              borderRadius: 999,
              background: active ? colors.accent : 'transparent',
              color: active ? '#fff' : colors.textMuted,
              cursor: saving ? 'wait' : 'pointer',
              fontSize: option.id === 'english' ? 11 : 13,
              fontWeight: 800,
              lineHeight: 1,
              fontFamily: option.id === 'english' ? 'Poppins, sans-serif' : 'inherit',
              transition: 'all 0.16s ease',
              padding: '0 6px',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
