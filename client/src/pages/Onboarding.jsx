import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../utils/api'
import ThemeToggle from '../components/shared/ThemeToggle'
import { HOBBIES } from '../utils/constants'
import { LANGUAGES, normalizeLanguage, setStoredLanguage } from '../utils/i18n'
import { showToast } from '../components/shared/Toast'

const COMING_SOON_LANGUAGES = new Set(['tamil', 'malayalam'])

const TEXT = {
  english: {
    languageTitle: 'Which language do you want to learn in? 🌐',
    languageSubtitle: 'Choose your preferred learning language',
    hobbyTitle: "What's your hobby? ⚡",
    hobbySubtitle: "We'll make Python learning fun using your hobby!",
    next: 'Next →',
    back: '← Back',
    setup: 'Setting up...',
    start: 'Start Learning! 🚀',
    error: 'Something went wrong. Please try again.',
  },
  hindi: {
    languageTitle: 'Aap kis bhasha mein seekhna chahte hain? 🌐',
    languageSubtitle: 'Apni preferred learning language choose karo',
    hobbyTitle: 'Aapki hobby kya hai? ⚡',
    hobbySubtitle: 'Hum Python sikhna teri hobby se fun banayenge!',
    next: 'Next →',
    back: '← Back',
    setup: 'Setup ho raha hai...',
    start: 'Learning Shuru Karo! 🚀',
    error: 'Kuch gadbad ho gayi. Dobara try karo.',
  },
  tamil: {
    languageTitle: 'எந்த மொழியில் கற்க விரும்புகிறீர்கள்? 🌐',
    languageSubtitle: 'உங்களுக்கு பிடித்த learning language-ஐ தேர்வு செய்யவும்',
    hobbyTitle: 'உங்கள் hobby என்ன? ⚡',
    hobbySubtitle: 'உங்கள் hobby-யை வைத்து Python learning-ஐ fun ஆக்குவோம்!',
    next: 'அடுத்து →',
    back: '← திரும்பு',
    setup: 'Setup செய்கிறோம்...',
    start: 'Learning தொடங்கு! 🚀',
    error: 'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சி செய்யவும்.',
  },
  malayalam: {
    languageTitle: 'ഏത് ഭാഷയിലാണ് പഠിക്കാൻ ആഗ്രഹിക്കുന്നത്? 🌐',
    languageSubtitle: 'നിങ്ങളുടെ preferred learning language തിരഞ്ഞെടുക്കൂ',
    hobbyTitle: 'നിങ്ങളുടെ hobby എന്താണ്? ⚡',
    hobbySubtitle: 'നിങ്ങളുടെ hobby ഉപയോഗിച്ച് Python learning രസകരമാക്കാം!',
    next: 'അടുത്തത് →',
    back: '← തിരിച്ച്',
    setup: 'Setup ചെയ്യുന്നു...',
    start: 'Learning തുടങ്ങൂ! 🚀',
    error: 'എന്തോ തെറ്റ് സംഭവിച്ചു. വീണ്ടും ശ്രമിക്കൂ.',
  },
}

export default function Onboarding() {
  const { colors } = useTheme()
  const { updateUser } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]       = useState(1)
  const [language, setLanguage] = useState(localStorage.getItem('preferredLanguage') || '')
  const [hobby, setHobby]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const labels = TEXT[normalizeLanguage(language)] || TEXT.english

  const handleComplete = async () => {
    if (!language || !hobby) return
    setLoading(true)
    setError('')
    try {
      const res = await api.put('/profile/update', {
        hobby,
        language,
        onboardingComplete: true,
      })
      updateUser(res.data.user)
      navigate('/home')
    } catch (err) {
      setError(labels.error)
    } finally {
      setLoading(false)
    }
  }

  const sports = HOBBIES.filter(h => ['cricket','football','badminton','kabaddi','basketball'].includes(h.id))
  const others = HOBBIES.filter(h => ['dance','music','gaming','cooking','art'].includes(h.id))

  const savePreference = async (updates) => {
    try {
      const res = await api.put('/profile/update', updates)
      updateUser(res.data.user)
    } catch {}
  }

  const selectLanguage = (nextLanguage) => {
    if (COMING_SOON_LANGUAGES.has(nextLanguage)) {
      showToast('This language will be available soon.', 'warning')
      return
    }
    const safeLanguage = setStoredLanguage(nextLanguage)
    setLanguage(safeLanguage)
    savePreference({ language: safeLanguage })
  }

  const selectHobby = (nextHobby) => {
    setHobby(nextHobby)
    savePreference({ hobby: nextHobby })
  }

  const cardStyle = (selected) => ({
    background: selected ? colors.accent : colors.surface,
    border: `2px solid ${selected ? colors.accent : colors.border}`,
    borderRadius: 12,
    padding: '16px 8px',
    cursor: 'pointer',
    color: selected ? '#fff' : colors.text,
    textAlign: 'center',
    transition: 'all 0.2s',
    boxShadow: selected ? `0 0 20px ${colors.accent}50` : 'none',
    transform: selected ? 'scale(1.03)' : 'scale(1)',
  })

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24, fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ position: 'fixed', top: 20, right: 20 }}><ThemeToggle /></div>

      <div style={{ maxWidth: 640, margin: '0 auto', paddingTop: 48 }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 5, borderRadius: 4,
              background: s <= step ? colors.accent : colors.border,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* ─── Step 1: Language ──────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h1 style={{ color: colors.text, fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
              {labels.languageTitle}
            </h1>
            <p style={{ color: colors.textMuted, marginBottom: 32, fontSize: 15 }}>
              {labels.languageSubtitle}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
              {Object.values(LANGUAGES).map(lang => (
                <button key={lang.id} onClick={() => selectLanguage(lang.id)} style={{
                  background: language === lang.id ? colors.accent : colors.surface,
                  border: `2px solid ${language === lang.id ? colors.accent : colors.border}`,
                  borderRadius: 16, padding: '32px 24px', cursor: 'pointer',
                  color: language === lang.id ? '#fff' : colors.text,
                  textAlign: 'center', transition: 'all 0.2s',
                  boxShadow: language === lang.id ? `0 0 24px ${colors.accent}50` : 'none',
                  transform: language === lang.id ? 'scale(1.03)' : 'scale(1)',
                }}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>🇮🇳</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{lang.nativeLabel}</div>
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{lang.label}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => language && setStep(2)}
              disabled={!language}
              style={{
                width: '100%', background: language ? colors.accent : colors.border,
                color: '#fff', border: 'none', borderRadius: 12, padding: 16,
                fontSize: 16, fontWeight: 600, cursor: language ? 'pointer' : 'not-allowed',
                fontFamily: 'Poppins, sans-serif', transition: 'all 0.2s',
              }}
            >
              {labels.next}
            </button>
          </div>
        )}

        {/* ─── Step 2: Hobby ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h1 style={{ color: colors.text, fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
              {labels.hobbyTitle}
            </h1>
            <p style={{ color: colors.textMuted, marginBottom: 24, fontSize: 15 }}>
              {labels.hobbySubtitle}
            </p>

            <p style={{ color: colors.textMuted, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
              Sports
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
              {sports.map(h => (
                <button key={h.id} onClick={() => selectHobby(h.id)} style={cardStyle(hobby === h.id)}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{h.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>
                    {language === 'hindi' ? h.labelHindi : h.label}
                  </div>
                </button>
              ))}
            </div>

            <p style={{ color: colors.textMuted, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
              Others
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 32 }}>
              {others.map(h => (
                <button key={h.id} onClick={() => selectHobby(h.id)} style={cardStyle(hobby === h.id)}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{h.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>
                    {language === 'hindi' ? h.labelHindi : h.label}
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <p style={{ color: colors.error, fontSize: 13, marginBottom: 12 }}>⚠️ {error}</p>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, background: colors.surface, border: `1px solid ${colors.border}`,
                color: colors.text, borderRadius: 12, padding: 16, fontSize: 15,
                cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              }}>
                {labels.back}
              </button>
              <button
                onClick={handleComplete}
                disabled={!hobby || loading}
                style={{
                  flex: 2, background: hobby ? colors.accent : colors.border,
                  color: '#fff', border: 'none', borderRadius: 12, padding: 16,
                  fontSize: 16, fontWeight: 600, cursor: hobby ? 'pointer' : 'not-allowed',
                  fontFamily: 'Poppins, sans-serif', transition: 'all 0.2s',
                }}
              >
                {loading ? labels.setup : labels.start}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
