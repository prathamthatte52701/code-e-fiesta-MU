import { useRef, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import { TOPICS } from '../../utils/constants'
import { normalizeLanguage } from '../../utils/i18n'
import { isAnswerMatch } from '../../utils/answerMatch'
import { resolveTag } from '../../utils/conceptTags'
import { getFallbackQuestion } from '../../data/fallbackQuestions'
import { submitDiagnostic } from '../../hooks/useGaps'
import MCQQuestion from '../question/MCQQuestion'

// First direct prerequisite per topic. Keep in sync with server/constants/topics.js
const FIRST_PREREQ = {
  'data-types': 'variables', conditions: 'variables', loops: 'conditions', functions: 'loops',
  lists: 'functions', strings: 'lists', oop: 'functions', 'error-handling': 'oop', algorithms: 'error-handling',
}

const nameOf = (id) => TOPICS.find(t => t.id === id)?.name || id
const skipKey = (topicId) => `diagSkip:${topicId}`

const readSkip = (topicId) => {
  try { return sessionStorage.getItem(skipKey(topicId)) === '1' } catch { return false }
}

export default function DiagnosticQuiz({ topicId, onDone }) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(() => readSkip(topicId))
  const [stage, setStage]         = useState('intro') // intro | loading | asking | saving | result
  const [step, setStep]           = useState(0)
  const [question, setQuestion]   = useState(null)
  const [selected, setSelected]   = useState(null)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const answers = useRef([])
  const prevQuestions = useRef([])
  const recentTags = useRef([])

  if (dismissed) return null

  const prereq = FIRST_PREREQ[topicId] || null
  const plan = [
    [topicId, 'EASY'], [topicId, 'EASY'], [topicId, 'MEDIUM'], [topicId, 'MEDIUM'],
    prereq ? [prereq, 'EASY'] : [topicId, 'HARD'],
  ]

  const skip = () => {
    try { sessionStorage.setItem(skipKey(topicId), '1') } catch {}
    setDismissed(true)
  }

  const loadQuestion = async (i) => {
    const [qTopic, difficulty] = plan[i]
    setStage('loading')
    setSelected(null)
    let q = null
    try {
      const res = await api.post('/groq/question', {
        topicId: qTopic,
        level: 1,
        difficulty,
        language: normalizeLanguage(user?.language),
        hobby: user?.hobby || 'cricket',
        questionsAttempted: i,
        previousQuestions: prevQuestions.current,
        recentTags: recentTags.current,
      })
      const raw = res.data?.question
      if (!res.data?.useFallback && raw?.question && Array.isArray(raw.options) && raw.options.length) q = raw
    } catch {}
    if (!q) {
      for (let tries = 0; tries < 6 && !q; tries++) {
        const fb = getFallbackQuestion(qTopic, difficulty, 'MCQ')
        if (Array.isArray(fb.options) && fb.options.length && !prevQuestions.current.includes(fb.question)) q = fb
      }
      if (!q) q = getFallbackQuestion(qTopic, difficulty, 'MCQ')
    }
    prevQuestions.current = [...prevQuestions.current, q.question]
    recentTags.current = [...recentTags.current, resolveTag(qTopic, q.conceptTag)].slice(-3)
    setQuestion(q)
    setStep(i)
    setStage('asking')
  }

  const onAnswer = (opt) => {
    if (selected !== null) return
    setSelected(opt)
    const [qTopic, difficulty] = plan[step]
    answers.current.push({
      topicId: qTopic,
      conceptTag: question.conceptTag,
      correct: isAnswerMatch(opt, question.correctAnswer),
      difficulty,
    })
  }

  const finish = async () => {
    setStage('saving')
    setError('')
    try {
      const data = await submitDiagnostic({ topicId, answers: answers.current })
      const score = answers.current.filter(a => a.correct).length
      const prereqWrong = !!prereq && !answers.current[4]?.correct
      setResult({ score, placement: data.placement || data.diagnostic?.placement, prereqWrong })
      setStage('result')
    } catch {
      setError('Could not save your result. You can skip and start practice anyway.')
      setStage('asking')
    }
  }

  const next = () => (step + 1 < plan.length ? loadQuestion(step + 1) : finish())

  const card = {
    background: colors.surface, border: `1px solid ${colors.accent}55`,
    borderRadius: 16, padding: 20, marginBottom: 20, fontFamily: 'Poppins, sans-serif',
  }
  const btn = (primary) => ({
    background: primary ? colors.accent : 'transparent', color: primary ? '#fff' : colors.textMuted,
    border: primary ? 'none' : `1px solid ${colors.border}`, borderRadius: 10,
    padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
  })

  if (stage === 'intro') return (
    <div style={card}>
      <div style={{ color: colors.text, fontWeight: 700, fontSize: 16 }}>Quick 5-question check (about 2 min)</div>
      <p style={{ color: colors.textMuted, fontSize: 13, margin: '6px 0 14px' }}>We'll find where you should start. No points, no timer.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button style={btn(true)} onClick={() => loadQuestion(0)}>Start</button>
        <button style={btn(false)} onClick={skip}>Skip</button>
      </div>
    </div>
  )

  if (stage === 'result') {
    const msg = result.placement === 'medium-start'
      ? 'You can start at medium difficulty'
      : 'Starting at the basics - good place to build'
    return (
      <div style={card}>
        <div style={{ color: colors.text, fontWeight: 700, fontSize: 18 }}>Score: {result.score}/5</div>
        <p style={{ color: colors.text, fontSize: 14, margin: '8px 0' }}>{msg}</p>
        {result.prereqWrong && (
          <p style={{ color: colors.warning, fontSize: 13, margin: '0 0 8px' }}>{nameOf(prereq)} looks shaky - we'll check it first</p>
        )}
        <button style={btn(true)} onClick={() => { setDismissed(true); onDone?.() }}>Continue</button>
      </div>
    )
  }

  if (stage === 'loading' || stage === 'saving') return (
    <div style={card}><span style={{ color: colors.textMuted, fontSize: 14 }}>{stage === 'saving' ? 'Saving your result...' : 'Loading question...'}</span></div>
  )

  const answered = selected !== null
  return (
    <div style={card}>
      <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Question {step + 1} of {plan.length}</div>
      <div style={{ color: colors.text, fontSize: 15, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{question.question}</div>
      {question.code && (
        <pre style={{ background: colors.codeBg || '#1a1a2e', color: '#a8ff78', padding: 12, borderRadius: 8, fontSize: 13, overflowX: 'auto', margin: '0 0 12px' }}>
          <code>{question.code}</code>
        </pre>
      )}
      <MCQQuestion options={question.options} correctAnswer={question.correctAnswer} selectedAnswer={selected} answered={answered} onAnswer={onAnswer} />
      {error && <p style={{ color: colors.error, fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        {answered && <button style={btn(true)} onClick={next}>{step + 1 < plan.length ? 'Next' : 'Finish'}</button>}
        <button style={btn(false)} onClick={skip}>Skip check</button>
      </div>
    </div>
  )
}
