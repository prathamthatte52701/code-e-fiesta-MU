import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BookOpen, Play, Zap, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import Navbar from '../components/shared/Navbar'
import SpeakButton from '../components/shared/SpeakButton'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import DidYouKnow from '../components/dashboard/DidYouKnow'
import QuestionEngine from '../components/question/QuestionEngine'
import DiagnosticQuiz from '../components/diagnostic/DiagnosticQuiz'
import { TOPICS } from '../utils/constants'
import { getGuestTopicProgress, saveGuestUser } from '../utils/guestProgress'
import { normalizeLanguage, t } from '../utils/i18n'

const THEORY_FALLBACK = {
  english: (topic) => `${topic.name} — a core Python concept that powers real-world applications.`,
  hindi: (topic) => `${topic.nameHindi || topic.name} — Python ka ek important concept!`,
  tamil: (topic) => `${topic.name} — நிஜ வாழ்க்கை apps-ல் பயன்படும் முக்கியமான Python concept.`,
  malayalam: (topic) => `${topic.name} — real-world applications-ൽ ഉപയോഗിക്കുന്ന പ്രധാന Python concept.`,
}

const parseTheorySections = (content) => {
  if (!content) return []
  const lines = content.split('\n')
  const sections = []
  let current = { heading: null, blocks: [] }
  let inCode = false
  let codeBuffer = []
  let bulletBuffer = []

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      current.blocks.push({ type: 'bullet', items: bulletBuffer })
      bulletBuffer = []
    }
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        current.blocks.push({ type: 'code', content: codeBuffer.join('\n') })
        codeBuffer = []
        inCode = false
      } else {
        flushBullets()
        inCode = true
      }
      continue
    }

    if (inCode) {
      codeBuffer.push(line)
      continue
    }

    if (line.startsWith('## ')) {
      flushBullets()
      sections.push(current)
      current = { heading: line.replace('## ', '').trim(), blocks: [] }
      continue
    }

    if (line.startsWith('- ') || line.startsWith('• ')) {
      bulletBuffer.push(line.replace(/^[-•]\s/, '').trim())
      continue
    }

    flushBullets()
    if (line.trim()) {
      current.blocks.push({ type: 'paragraph', content: line.trim() })
    }
  }

  if (inCode) {
    current.blocks.push({ type: 'code', content: codeBuffer.join('\n') })
  }
  flushBullets()
  sections.push(current)
  return sections.filter(s => s.blocks.length > 0 || s.heading)
}

const TheoryDisplay = ({ content, colors }) => {
  const sections = parseTheorySections(content)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {sections.map((section, i) => (
        <div key={i} style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 20,
        }}>
          {section.heading && (
            <h3 style={{
              color: colors.accent,
              fontSize: 16,
              fontWeight: 700,
              margin: '0 0 12px',
              paddingBottom: 8,
              borderBottom: `1px solid ${colors.border}`,
            }}>
              {section.heading}
            </h3>
          )}
          {section.blocks.map((block, j) => {
            if (block.type === 'code') return (
              <pre key={j} style={{
                background: colors.codeBg || '#1a1a2e',
                color: '#a8ff78',
                padding: 16,
                borderRadius: 8,
                fontSize: 13,
                overflowX: 'auto',
                margin: '10px 0',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
              }}>
                <code>{block.content}</code>
              </pre>
            )

            if (block.type === 'bullet') return (
              <ul key={j} style={{ paddingLeft: 20, margin: '8px 0' }}>
                {block.items.map((item, k) => (
                  <li key={k} style={{
                    color: colors.text,
                    lineHeight: 1.7,
                    fontSize: 14,
                    marginBottom: 4,
                  }}>{item}</li>
                ))}
              </ul>
            )

            return (
              <p key={j} style={{
                color: colors.text,
                lineHeight: 1.85,
                fontSize: 14,
                margin: '8px 0',
              }}>{block.content}</p>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const getInitialPhase = (topicId) => {
  if (typeof window === 'undefined') return 'theory'
  return sessionStorage.getItem(`topicPhase:${topicId}`) || 'theory'
}

export default function TopicPage() {
  const { topicId } = useParams()
  const { colors } = useTheme()
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const [phase, setPhase]             = useState(() => getInitialPhase(topicId))
  const [theory, setTheory]           = useState('')
  const [theoryLoading, setTheoryLoading] = useState(true)
  const [speedMode, setSpeedMode]     = useState(user?.speedModeEnabled || false)
  const [progress, setProgress]       = useState(null)
  const [progressLoaded, setProgressLoaded] = useState(false)

  const topicInfo = TOPICS.find(t => t.id === topicId) || { id: topicId, name: topicId, nameHindi: topicId }
  const effectiveLanguage = normalizeLanguage(user?.language)
  const isHindi   = effectiveLanguage === 'hindi'

  useEffect(() => {
    if (!user) return
    if (phase === 'theory') fetchTheory()
    fetchProgress()
  }, [topicId, user?._id, user?.language, user?.hobby, phase])

  useEffect(() => {
    sessionStorage.setItem(`topicPhase:${topicId}`, phase)
  }, [topicId, phase])

  const fetchTheory = async (refresh = false) => {
    setTheoryLoading(true)
    try {
      const params = new URLSearchParams({
        language: effectiveLanguage,
        hobby: user?.hobby || 'cricket',
      })
      if (refresh) params.set('refresh', 'true')
      const res = await api.get(`/topics/${topicId}/theory?${params.toString()}`)
      const nextTheory = String(res.data.theory || '').trim()
      setTheory(nextTheory || (THEORY_FALLBACK[effectiveLanguage] || THEORY_FALLBACK.english)(topicInfo))
    } catch {
      setTheory((THEORY_FALLBACK[effectiveLanguage] || THEORY_FALLBACK.english)(topicInfo))
    } finally {
      setTheoryLoading(false)
    }
  }

  const fetchProgress = async () => {
    try {
      if (user.isGuest) {
        setProgress(getGuestTopicProgress(topicId))
        return
      }
      const uid = user._id || user.id
      const res = await api.get(`/progress/${uid}`)
      const tp  = (res.data || []).find(p => p.topicId === topicId)
      setProgress(tp || null)
    } catch {}
    setProgressLoaded(true)
  }

  const toggleSpeedMode = async () => {
    const next = !speedMode
    setSpeedMode(next)
    try {
      if (user.isGuest) {
        saveGuestUser({ speedModeEnabled: next })
        updateUser({ speedModeEnabled: next })
        return
      }
      await api.put('/profile/update', { speedModeEnabled: next })
      updateUser({ speedModeEnabled: next })
    } catch {}
  }

  const [devLevel, setDevLevel] = useState(null)

  const currentLevel   = devLevel || progress?.currentLevel || 1
  const levelKey       = String(currentLevel)
  const levelData      = progress?.levels?.[levelKey] || {}
  const initDifficulty = levelData.currentDifficulty || 'EASY'
  const initQAttempted = levelData.questionsAttempted || 0
  const showDiagnostic = !user?.isGuest && progressLoaded
    && progress?.diagnostic?.done !== true
    && !Object.values(progress?.levels || {}).some(l => l?.questionsAttempted > 0)
  const canAccessChallenge = user?.isDeveloper || ((user?.streak >= 7 || progress?.aiChallengeUnlocked) && progress?.topicCompleted)

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: 'Poppins, sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px' }}>

        {/* Breadcrumb + Title */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <button onClick={() => navigate('/home')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.textMuted, fontSize: 13, fontFamily: 'Poppins, sans-serif',
            }}>
              ← Home
            </button>
            <span style={{ color: colors.border }}>/</span>
            <span style={{ color: colors.textMuted, fontSize: 13 }}>{topicInfo.name}</span>
          </div>
          <h1 style={{ color: colors.text, fontSize: 24, margin: 0, fontWeight: 700 }}>
            {isHindi ? topicInfo.nameHindi : topicInfo.name}
            {!isHindi && <span style={{ color: colors.textMuted, fontSize: 15, marginLeft: 10 }}>— {topicInfo.nameHindi}</span>}
          </h1>
        </div>

        {/* ── Dev Panel ── */}
        {user?.isDeveloper && (
          <div style={{
            background: '#1a0a00', border: '1px solid #f59e0b',
            borderRadius: 12, padding: '10px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700 }}>⚙️ DEV</span>
            <span style={{ color: '#f59e0b', fontSize: 11 }}>Jump to format:</span>
            {[1,2,3,4,5].map(l => (
              <button key={l} onClick={() => { setDevLevel(l); setPhase('questions') }} style={{
                background: currentLevel === l ? '#f59e0b' : 'transparent',
                color: currentLevel === l ? '#000' : '#f59e0b',
                border: '1px solid #f59e0b', borderRadius: 6,
                padding: '2px 10px', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              }}>
                {l}
              </button>
            ))}
            {devLevel && (
              <button onClick={() => setDevLevel(null)} style={{
                background: 'none', color: '#f59e0b44', border: 'none',
                fontSize: 11, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              }}>reset</button>
            )}
          </div>
        )}

        {/* Speed Mode Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: 12, padding: '10px 16px',
        }}>
          <button onClick={toggleSpeedMode} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            color: speedMode ? '#fbbf24' : colors.textMuted,
            fontFamily: 'Poppins, sans-serif',
          }}>
            {speedMode ? <ToggleRight size={22} color="#fbbf24" /> : <ToggleLeft size={22} />}
            <span style={{ fontWeight: 600, fontSize: 14 }}>Speed Mode</span>
          </button>
          <span style={{ color: speedMode ? '#fbbf24' : colors.textMuted, fontSize: 12 }}>
            {speedMode ? '⚡ 2x points • 30 sec timer' : 'Normal mode — 60 sec timer'}
          </span>
        </div>

        {/* ── Theory Phase ── */}
        {phase === 'theory' && (
          <>
            <div style={{
              background: colors.surface, border: `1px solid ${colors.border}`,
              borderRadius: 16, padding: 24, marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={18} color={colors.accent} />
                  <span style={{ color: colors.text, fontWeight: 600, fontSize: 16 }}>Theory</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => fetchTheory(true)}
                    disabled={theoryLoading}
                    style={{
                      background: 'none',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      padding: '6px 10px',
                      color: colors.textMuted,
                      cursor: theoryLoading ? 'not-allowed' : 'pointer',
                      opacity: theoryLoading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    <RefreshCw size={13} />
                    {t(effectiveLanguage, 'refreshTheory', 'Refresh Theory')}
                  </button>
                  {theory && <SpeakButton text={theory} language={user?.language} />}
                </div>
              </div>

              {theoryLoading ? (
                <LoadingSpinner text={t(effectiveLanguage, 'loadingTheory', 'Generating personalized theory...')} />
              ) : (
                <TheoryDisplay content={theory} colors={colors} />
              )}
            </div>

            {!theoryLoading && <DidYouKnow topicId={topicId} language={user?.language} />}

            {showDiagnostic && <DiagnosticQuiz key={topicId} topicId={topicId} onDone={fetchProgress} />}

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => setPhase('questions')}
                disabled={theoryLoading}
                style={{
                  flex: 1, background: colors.accent, color: '#fff', border: 'none',
                  borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600,
                  cursor: theoryLoading ? 'not-allowed' : 'pointer', opacity: theoryLoading ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                <Play size={17} />
                {isHindi ? 'Practice Shuru Karo' : 'Start Practice'}
              </button>

              {canAccessChallenge && (
                <button
                  onClick={() => navigate(`/challenge/${topicId}`)}
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #ef4444)',
                    color: '#fff', border: 'none', borderRadius: 12,
                    padding: '14px 20px', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  <Zap size={15} /> AI Challenge
                </button>
              )}
            </div>

            {progress?.topicCompleted && (
              <div style={{
                background: '#052e16', border: '1px solid #10B981',
                borderRadius: 12, padding: '14px 20px', textAlign: 'center',
              }}>
                <span style={{ color: '#10B981', fontWeight: 600 }}>
                  ✅ {isHindi ? 'Topic complete! Bahut badhiya.' : 'Topic Completed! Great work.'}
                </span>
              </div>
            )}
          </>
        )}

        {/* ── Questions Phase ── */}
        {phase === 'questions' && (
          <QuestionEngine
            topicId={topicId}
            topicName={isHindi ? topicInfo.nameHindi : topicInfo.name}
            initialLevel={currentLevel}
            initialDifficulty={initDifficulty}
            initialQAttempted={initQAttempted}
            speedMode={speedMode}
            language={user?.language}
            hobby={user?.hobby}
            onBack={() => { setPhase('theory'); fetchProgress() }}
            onProgressUpdate={fetchProgress}
          />
        )}
      </div>
    </div>
  )
}
