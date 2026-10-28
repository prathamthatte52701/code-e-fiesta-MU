import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../utils/api'
import Navbar from '../components/shared/Navbar'
import ConceptMap from '../components/dashboard/ConceptMap'
import DailyChallenge from '../components/dashboard/DailyChallenge'
import RevisionCard from '../components/dashboard/RevisionCard'
import ChallengeAccessCards from '../components/dashboard/ChallengeAccessCards'
import LearningPathCard from '../components/dashboard/LearningPathCard'
import LeaderboardSneak from '../components/dashboard/LeaderboardSneak'
import { HOBBIES, TOPICS } from '../utils/constants'
import { getGuestProgress } from '../utils/guestProgress'
import { t } from '../utils/i18n'

export default function Home() {
  const { colors } = useTheme()
  const { user, updateUser, guestMigrationAvailable, migrateGuestProgress, migrationMessage } = useAuth()
  const navigate = useNavigate()

  const [progress, setProgress]         = useState([])
  const [topLeaders, setTopLeaders]     = useState([])
  const [revisionTopics, setRevisionTopics] = useState([])
  const [loading, setLoading]           = useState(true)
  const [migrating, setMigrating]       = useState(false)
  const [migrationError, setMigrationError] = useState('')

  const hobbyEmoji = HOBBIES.find(h => h.id === user?.hobby)?.emoji || '👋'

  useEffect(() => {
    if (!user) return
    if (user.isGuest) {
      setProgress(getGuestProgress())
      setTopLeaders([])
      setRevisionTopics([])
      setLoading(false)
      return
    }

    const uid = user._id || user.id

    // Update streak on load
    api.post('/streak/update')
      .then(res => updateUser({ streak: res.data.streak, streakFreeze: res.data.streakFreeze }))
      .catch(() => {})

    Promise.all([
      api.get(`/progress/${uid}`),
      api.get('/leaderboard/alltime'),
      api.get(`/progress/${uid}/revision`),
    ]).then(([prog, leaders, rev]) => {
      setProgress(prog.data || [])
      setTopLeaders((leaders.data?.leaderboard || []).slice(0, 3))
      setRevisionTopics(rev.data?.topics || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [user?._id])

  const handleMigrateGuest = async () => {
    setMigrating(true)
    setMigrationError('')
    try {
      await migrateGuestProgress()
      const uid = user._id || user.id
      const res = await api.get(`/progress/${uid}`)
      setProgress(res.data || [])
    } catch {
      setMigrationError('Could not move guest progress. Please try again.')
    } finally {
      setMigrating(false)
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  if (!user) return null

  const topicsCompleted = progress.filter(p => p.topicCompleted).length
  const currentTopic = progress.find(p => !p.topicCompleted)

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: 'Poppins, sans-serif' }}>
      <Navbar />

      <div className="home-shell" style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box' }}>
        {user.isGuest && (
          <div style={{
            background: `${colors.accent}12`,
            border: `1px solid ${colors.accent}50`,
            color: colors.text,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
          }}>
            {t(user.language, 'guestBanner', 'Guest progress is saved on this device. Create an account to keep it in the cloud.')}
          </div>
        )}

        {!user.isGuest && guestMigrationAvailable && (
          <div style={{
            background: `${colors.warning}15`,
            border: `1px solid ${colors.warning}60`,
            color: colors.text,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: 13,
          }}>
            <span style={{ flex: 1 }}>{migrationMessage || t(user.language, 'guestBanner', 'Guest progress is saved on this device.')}</span>
            <button
              onClick={handleMigrateGuest}
              disabled={migrating}
              style={{
                background: colors.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: migrating ? 'wait' : 'pointer',
                fontWeight: 600,
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              {migrating ? t(user.language, 'migrating', 'Migrating...') : t(user.language, 'migrateGuest', 'Move guest progress to my account')}
            </button>
            {migrationError && <span style={{ color: colors.error, width: '100%' }}>{migrationError}</span>}
          </div>
        )}

        {/* ─── Hero Card ─────────────────────────────────────────────────── */}
        <motion.div
          className="hero-card"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
          background: `linear-gradient(135deg, ${colors.accent}20, ${colors.surface})`,
          border: `1px solid ${colors.accent}40`,
          borderRadius: 20, padding: '28px 32px', marginBottom: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ color: colors.text, fontSize: 26, margin: 0, fontWeight: 700, overflowWrap: 'anywhere' }}>
              Namaste, {user.name.split(' ')[0]}! {hobbyEmoji}
            </h1>
            <p style={{ color: colors.textMuted, margin: '6px 0 0', fontSize: 14 }}>
              {user.language === 'hindi'
                ? `Aaj bhi seekhte rahenge! ${user.streak > 0 ? `🔥 ${user.streak} din ki streak!` : 'Apni streak shuru karo!'}`
                : `${greeting()}! ${user.streak > 0 ? `🔥 ${user.streak}-day streak! Keep it going!` : 'Start your learning streak today!'}`}
            </p>
          </div>

          <div className="hero-stats" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { icon: '⭐', value: user.totalPoints || 0, label: user.language === 'hindi' ? 'Points' : 'Points' },
              { icon: '🔥', value: user.streak || 0,      label: user.language === 'hindi' ? 'Streak' : 'Streak' },
              { icon: '✅', value: topicsCompleted,        label: user.language === 'hindi' ? 'Topics' : 'Topics' },
            ].map(s => (
              <div key={s.label} style={{
                background: colors.surface, border: `1px solid ${colors.border}`,
                borderRadius: 12, padding: '12px 16px', textAlign: 'center', minWidth: 70,
              }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ color: colors.text, fontWeight: 700, fontSize: 20 }}>{s.value}</div>
                <div style={{ color: colors.textMuted, fontSize: 11 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── 2-Column Layout ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="home-grid"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start', width: '100%', boxSizing: 'border-box' }}
        >

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            {/* Personalized Learning Path */}
            {!user.isGuest && <LearningPathCard user={user} progress={progress} />}

            {/* Revision Alert */}
            {revisionTopics.length > 0 && <RevisionCard topics={revisionTopics} language={user.language} />}

            {/* Daily Challenge */}
            <DailyChallenge language={user.language} />

            <ChallengeAccessCards progress={progress} language={user.language} />

            {/* Concept Map */}
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 16, padding: 24,
            }}>
              <h2 style={{ color: colors.text, margin: '0 0 16px', fontSize: 17, fontWeight: 600 }}>
                📚 {user.language === 'hindi' ? 'Learning Map' : 'Learning Map'}
              </h2>
              <ConceptMap progress={progress} language={user.language} />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

            {/* Continue Learning */}
            {currentTopic && (
              <div style={{
                background: colors.surface, border: `1px solid ${colors.border}`,
                borderRadius: 14, padding: 20,
              }}>
                <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Continue Learning
                </p>
                <p style={{ color: colors.text, fontWeight: 600, margin: '0 0 12px', fontSize: 15 }}>
                  📖 {TOPICS.find(t => t.id === currentTopic.topicId)?.name || currentTopic.topicId}
                </p>
                <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 12px' }}>
                  Level {currentTopic.currentLevel} / 5
                </p>
                <button
                  onClick={() => navigate(`/topic/${currentTopic.topicId}`)}
                  style={{
                    width: '100%', background: colors.accent, color: '#fff',
                    border: 'none', borderRadius: 10, padding: '10px 16px',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  Resume →
                </button>
              </div>
            )}

            {/* Streak Card */}
            <div style={{
              background: colors.surface, border: `1px solid ${colors.border}`,
              borderRadius: 14, padding: 20,
            }}>
              <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                Daily Streak
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 36 }}>🔥</span>
                <div>
                  <div style={{ color: colors.text, fontWeight: 700, fontSize: 28 }}>{user.streak || 0}</div>
                  <div style={{ color: colors.textMuted, fontSize: 12 }}>
                    {user.language === 'hindi' ? 'din ki streak' : 'day streak'}
                  </div>
                </div>
              </div>
              {user.streakFreeze && (
                <div style={{
                  marginTop: 12, background: '#1e1b4b', border: '1px solid #7C3AED',
                  borderRadius: 8, padding: '8px 12px', color: '#a78bfa', fontSize: 12,
                }}>
                  🧊 Streak Freeze active!
                </div>
              )}
              {!user.streakFreeze && user.streak >= 1 && (
                <div style={{ marginTop: 10, color: colors.textMuted, fontSize: 12 }}>
                  {user.streak % 7 === 0 ? 7 : 7 - (user.streak % 7)} more days to earn a Streak Freeze!
                </div>
              )}
            </div>

            {/* Leaderboard Sneak */}
            <LeaderboardSneak leaders={topLeaders} language={user.language} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
