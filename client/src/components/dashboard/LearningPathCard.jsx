import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import useGaps from '../../hooks/useGaps'
import { TOPICS, HOBBIES } from '../../utils/constants'
import { LABELS, CONCEPT_TAGS } from '../../utils/conceptTags'

const getTopicName = (topicId) => TOPICS.find(t => t.id === topicId)?.name || topicId

const getConceptLabel = (topicId, tag, weakConcepts = []) => {
  if (!tag) return null
  const match = weakConcepts.find(w => w.topicId === topicId && w.tag === tag)
  if (match?.label) return match.label
  const fromLabels = LABELS[`${topicId}/${tag}`]
  if (fromLabels) return fromLabels
  return tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const getDiagnoseConceptLabel = (topicId) => {
  const firstTag = CONCEPT_TAGS[topicId]?.[0]
  return firstTag ? (LABELS[`${topicId}/${firstTag}`] || getTopicName(topicId)) : getTopicName(topicId)
}

const buildContent = (recommendation, { weakConcepts = [] } = {}) => {
  const topicId = recommendation?.topicId || TOPICS[0].id
  const topicName = getTopicName(topicId)

  switch (recommendation?.type) {
    case 'prerequisite-repair':
      return {
        title: 'Repair a shaky foundation',
        subtitle: recommendation.reason,
        topicId,
        conceptFocus: getConceptLabel(topicId, recommendation.tag, weakConcepts) || topicName,
        suggestedPractice: `Repair ${topicName} first`,
      }
    case 'practice':
      return {
        title: 'Sharpen your weak spot',
        subtitle: recommendation.reason,
        topicId,
        conceptFocus: getConceptLabel(topicId, recommendation.tag, weakConcepts) || topicName,
        suggestedPractice: `Practice ${getConceptLabel(topicId, recommendation.tag, weakConcepts) || topicName}`,
      }
    case 'advance':
      return {
        title: 'Keep moving forward',
        subtitle: recommendation.reason,
        topicId,
        conceptFocus: getConceptLabel(topicId, recommendation.tag, weakConcepts) || topicName,
        suggestedPractice: 'Next lesson',
      }
    case 'diagnose':
    default:
      return {
        title: 'Build your Python foundations',
        subtitle: 'There is not enough answer history to identify a strength or difficulty yet. Start with the first lesson to build a baseline.',
        topicId,
        conceptFocus: getDiagnoseConceptLabel(topicId),
        suggestedPractice: 'Short diagnostic practice',
      }
  }
}

const buildConceptEvidence = (coverage) => {
  if (!coverage || coverage.totalAttempts === 0) return 'No answer history yet'
  const base = `${coverage.totalAttempts} answers tracked`
  if (coverage.specificShare == null) return base
  return `${base} · ${Math.round(coverage.specificShare * 100)}% concept-tagged`
}

export default function LearningPathCard({ user, progress = [] }) {
  const { colors } = useTheme()
  const navigate = useNavigate()
  const { data, loading } = useGaps()

  if (!user || user.isGuest) return null

  const fallbackRecommendation = {
    type: 'diagnose',
    topicId: progress.find(p => !p.topicCompleted)?.topicId || TOPICS[0].id,
  }

  const recommendation = data?.recommendation || fallbackRecommendation
  const coverage = data?.coverage
  const content = buildContent(recommendation, { weakConcepts: data?.weakConcepts })

  const completed = progress.filter(p => p.topicCompleted).length
  const currentProgress = progress.find(p => !p.topicCompleted)
  const currentLevel = currentProgress?.currentLevel || 1

  const hobby = HOBBIES.find(h => h.id === user.hobby)
  const hobbyLabel = hobby?.label || (user.hobby ? user.hobby.charAt(0).toUpperCase() + user.hobby.slice(1) : null)

  const noAnswerHistory = !coverage || coverage.totalAttempts === 0

  const stats = [
    { label: 'CURRENT LESSON', value: getTopicName(content.topicId) },
    { label: 'CONCEPT FOCUS', value: content.conceptFocus },
    { label: 'CONCEPT EVIDENCE', value: buildConceptEvidence(coverage) },
    { label: 'SUGGESTED PRACTICE', value: content.suggestedPractice },
    { label: 'LEARNING PROGRESS', value: `${completed}/10 topics · Level ${currentLevel}/5` },
  ]

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: colors.accent, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
            Your Personalized Learning Path
          </p>
          <h2 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
            {content.title}
          </h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            {content.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <button
          type="button"
          onClick={() => navigate(`/topic/${content.topicId}`)}
          style={{
            background: colors.accent, color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap',
          }}
        >
          Start learning →
        </button>
        <button
          type="button"
          onClick={() => navigate('/report')}
          style={{ background: 'none', border: 'none', color: colors.accent, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', padding: 0 }}
        >
          View full report ->
        </button>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12,
        marginTop: 20,
      }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: colors.bg, border: `1px solid ${colors.border}`,
            borderRadius: 10, padding: '10px 12px',
          }}>
            <div style={{ color: colors.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>
              {loading ? 'Loading...' : s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {noAnswerHistory && (
          <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 4px' }}>
            Complete your first practice set to get a tailored next step.
          </p>
        )}
        {hobbyLabel && (
          <p style={{ color: colors.textMuted, fontSize: 12, margin: 0 }}>
            Examples can use your {hobbyLabel} interest; explanations follow your selected language.
          </p>
        )}
      </div>
    </div>
  )
}
