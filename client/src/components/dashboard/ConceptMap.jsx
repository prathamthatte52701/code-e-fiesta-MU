import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { CheckCircle, Lock, Zap } from 'lucide-react'
import { TOPICS } from '../../utils/constants'
import useGaps from '../../hooks/useGaps'
import { bandColor } from '../../utils/topicGraph'

const PREREQS = {
  variables: [],
  'data-types': ['variables'],
  conditions: ['variables', 'data-types'],
  loops: ['conditions'],
  functions: ['loops'],
  lists: ['functions'],
  strings: ['lists'],
  oop: ['functions', 'lists'],
  'error-handling': ['oop'],
  algorithms: ['error-handling'],
}

export default function ConceptMap({ progress = [], language = 'english' }) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: gaps } = useGaps()
  const safeProgress = Array.isArray(progress) ? progress : []
  const isDeveloper = Boolean(user?.isDeveloper)

  const completedIds = new Set(safeProgress.filter(p => p?.topicCompleted).map(p => p.topicId))
  const currentProgress = safeProgress.find(p => !p?.topicCompleted)

  const isUnlocked = (topicId) => {
    if (isDeveloper) return true
    const prereqs = PREREQS[topicId] || []
    return prereqs.every(req => completedIds.has(req))
  }

  const fallbackCurrent = TOPICS.find(topic => !completedIds.has(topic.id) && isUnlocked(topic.id))?.id
  const currentTopicId = currentProgress?.topicId || fallbackCurrent || 'variables'

  return (
    <div
      className="concept-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
        gap: 12,
        width: '100%',
      }}
    >
      {TOPICS.map(topic => {
        const done = completedIds.has(topic.id)
        const unlocked = isUnlocked(topic.id)
        const current = topic.id === currentTopicId && unlocked && !done
        const locked = !unlocked
        const prereqCount = PREREQS[topic.id]?.length || 0
        const score = gaps?.topicMastery?.find(m => m.topicId === topic.id)?.score

        let background = colors.surface
        let borderColor = colors.border
        let textColor = colors.text
        let subTextColor = colors.textMuted
        let boxShadow = 'none'
        let icon = <Zap size={18} color={colors.accent} />
        let status = 'Unlocked'

        if (done) {
          background = '#052e16'
          borderColor = '#10B981'
          textColor = '#10B981'
          subTextColor = '#86efac'
          boxShadow = '0 0 14px rgba(16,185,129,0.24)'
          icon = <CheckCircle size={18} color="#10B981" />
          status = 'Completed'
        } else if (current) {
          background = '#1e1b4b'
          borderColor = '#7C3AED'
          textColor = '#c4b5fd'
          subTextColor = '#a78bfa'
          boxShadow = '0 0 16px rgba(124,58,237,0.30)'
          icon = <Zap size={18} color="#a78bfa" />
          status = 'Current'
        } else if (locked) {
          background = '#171923'
          borderColor = colors.border
          textColor = colors.textMuted
          subTextColor = colors.textMuted
          icon = <Lock size={17} color={colors.textMuted} />
          status = 'Locked'
        }

        return (
          <button
            key={topic.id}
            type="button"
            onClick={() => unlocked && navigate(`/topic/${topic.id}`)}
            disabled={!unlocked}
            title={locked ? 'Complete prerequisites first' : undefined}
            style={{
              position: 'relative',
              minHeight: 126,
              background,
              border: `2px solid ${borderColor}`,
              borderRadius: 12,
              padding: '14px 10px',
              textAlign: 'center',
              cursor: unlocked ? 'pointer' : 'not-allowed',
              opacity: locked ? 0.58 : 1,
              transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
              boxShadow,
              userSelect: 'none',
              fontFamily: 'Poppins, sans-serif',
            }}
            onMouseEnter={e => {
              if (unlocked) e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {Number.isFinite(score) && (
              <span title={`Mastery ${score}`} style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: '50%', background: bandColor(score, colors) }} />
            )}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                margin: '0 auto 8px',
                display: 'grid',
                placeItems: 'center',
                background: done ? '#064e3b' : current ? 'rgba(124,58,237,0.24)' : colors.bg,
                border: `1px solid ${done ? '#10B981' : current ? '#7C3AED' : colors.border}`,
              }}
            >
              {icon}
            </div>

            <div style={{ color: textColor, fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>
              {language === 'hindi' ? topic.nameHindi : topic.name}
            </div>
            <div style={{ color: subTextColor, fontSize: 10, marginTop: 4, lineHeight: 1.25 }}>
              {language === 'hindi' ? topic.name : topic.nameHindi}
            </div>
            <div
              style={{
                color: textColor,
                fontSize: 9,
                fontWeight: 700,
                marginTop: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.7,
              }}
            >
              {status}
            </div>
            {locked && prereqCount > 0 && (
              <div style={{ color: colors.textMuted, fontSize: 9, marginTop: 4, lineHeight: 1.25 }}>
                Complete {prereqCount} prereq{prereqCount > 1 ? 's' : ''}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
