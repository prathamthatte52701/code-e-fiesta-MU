import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import useGaps from '../hooks/useGaps'
import useMastery from '../hooks/useMastery'
import Navbar from '../components/shared/Navbar'
import KnowledgeMap from '../components/charts/KnowledgeMap'
import RadarChart from '../components/charts/RadarChart'
import MasteryBars from '../components/charts/MasteryBars'
import ProgressLine from '../components/charts/ProgressLine'
import { TOPICS } from '../utils/constants'

const PRINT_CSS = `
@media print {
  .no-print, nav, header { display: none !important; }
  .rp-root { background: #fff !important; }
  .rp-root * { color: #111 !important; }
  .rp-root svg text { fill: #111 !important; }
  .rp-card { background: #fff !important; border-color: #ccc !important; break-inside: avoid; page-break-inside: avoid; }
}
`

const topicName = (id) => TOPICS.find(t => t.id === id)?.name || id

// Up to 3 exercises: the recommendation target first, then the next weakest concepts
const buildExercises = (gaps) => {
  const rec = gaps?.recommendation
  const weak = Array.isArray(gaps?.weakConcepts) ? gaps.weakConcepts : []
  const items = []
  if (rec?.type === 'prerequisite-repair') {
    items.push({ id: 'rec', title: `Repair: ${topicName(rec.topicId)}`, topicId: rec.topicId })
  } else if (rec?.type === 'practice') {
    const w = weak.find(c => c.topicId === rec.topicId && c.tag === rec.tag)
    items.push({ id: 'rec', title: `Practice: ${w?.label || topicName(rec.topicId)}`, topicId: rec.topicId })
  }
  const repairedTag = rec?.type === 'practice' ? `${rec.topicId}/${rec.tag}` : null
  for (const c of weak) {
    if (items.length >= 3) break
    if (c.key === repairedTag) continue
    items.push({ id: c.key, title: `Practice: ${c.label}`, topicId: c.topicId })
  }
  if (!items.length && rec?.topicId) {
    items.push({ id: 'next', title: 'Keep going - take the next lesson', topicId: rec.topicId })
  }
  return items.slice(0, 3)
}

export default function Report() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const gapsState = useGaps()
  const masteryState = useMastery()
  const [progress, setProgress] = useState([])
  const gaps = gapsState.data
  const mastery = masteryState.data

  useEffect(() => {
    const uid = user?._id || user?.id
    if (!uid || user.isGuest) return
    api.get(`/progress/${uid}`).then(res => setProgress(Array.isArray(res.data) ? res.data : [])).catch(() => {})
  }, [user?._id])

  const card = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18 }
  const h2 = { color: colors.text, margin: '0 0 12px', fontSize: 18 }
  const btn = (primary) => ({
    background: primary ? colors.accent : 'transparent', color: primary ? '#fff' : colors.text,
    border: primary ? 'none' : `1px solid ${colors.border}`, borderRadius: 10, padding: '8px 16px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
  })

  let body
  if ((gapsState.loading && !gaps) || (masteryState.loading && !mastery)) {
    body = <div style={{ ...card, color: colors.textMuted }}>Loading your report...</div>
  } else if ((gapsState.error && !gaps) || (masteryState.error && !mastery)) {
    body = (
      <div style={{ ...card, color: colors.error }}>
        Could not load your report.{' '}
        <button className="no-print" style={btn(true)} onClick={() => { gapsState.refetch(); masteryState.refetch() }}>Retry</button>
      </div>
    )
  } else if (!gaps || !(gaps.coverage?.totalAttempts > 0 || gaps.topicMastery?.some(t => t.score !== null))) {
    body = <div style={{ ...card, color: colors.textMuted, textAlign: 'center' }}>Answer a few questions to build your report</div>
  } else {
    const scored = gaps.topicMastery.filter(t => Number.isFinite(t.score))
    const overall = scored.length ? `${Math.round(scored.reduce((s, t) => s + t.score, 0) / scored.length)}%` : 'No data yet'
    const completed = progress.filter(p => p.topicCompleted).length
    const roots = gaps.rootCauses || []
    const rec = gaps.recommendation
    const exercises = buildExercises(gaps)
    const stats = [
      ['Topics completed', `${completed}/10`],
      ['Overall mastery', overall],
      ['Weak concepts', String(gaps.weakConcepts.length)],
      ['Answers tracked', String(gaps.coverage?.totalAttempts ?? 0)],
    ]
    body = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {stats.map(([label, value]) => (
            <div key={label} className="rp-card" style={{ ...card, padding: 14 }}>
              <div style={{ color: colors.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ color: colors.text, fontSize: 22, fontWeight: 800, marginTop: 6 }}>{value}</div>
            </div>
          ))}
        </div>

        {rec && (
          <div className="rp-card" style={{ ...card, border: `1px solid ${colors.accent}55` }}>
            <div style={{ color: colors.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Recommended: {rec.type.replace('-', ' ')}</div>
            <p style={{ color: colors.text, fontSize: 14, margin: '6px 0 10px', lineHeight: 1.6 }}>{rec.reason}</p>
            {rec.topicId && <button className="no-print" style={btn(true)} onClick={() => navigate(`/topic/${rec.topicId}`)}>Go to {topicName(rec.topicId)}</button>}
          </div>
        )}

        <div className="rp-card" style={card}>
          <h2 style={h2}>Where the gap comes from</h2>
          <KnowledgeMap topicMastery={gaps.topicMastery} rootCauses={roots} onNodeClick={(id) => navigate(`/topic/${id}`)} />
          {roots.map(r => {
            const target = r.explains[0]
            return (
              <p key={r.topicId} style={{ color: colors.text, fontSize: 13, margin: '10px 0 0' }}>
                <strong>{(r.path || []).map(topicName).join(' -> ')}:</strong> shaky {r.name} is pulling {r.explains.map(topicName).join(' and ') || topicName(target)} down
              </p>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="rp-card" style={card}>
            <h2 style={h2}>Topic radar</h2>
            <RadarChart topicMastery={gaps.topicMastery} />
          </div>
          <div className="rp-card" style={card}>
            <h2 style={h2}>Concept mastery</h2>
            <MasteryBars concepts={mastery?.concepts} />
          </div>
        </div>

        <div className="rp-card" style={card}>
          <h2 style={h2}>Progress over time</h2>
          <ProgressLine history={mastery?.history} />
        </div>

        <div className="rp-card" style={card}>
          <h2 style={h2}>Next 3 exercises</h2>
          {exercises.map(ex => (
            <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: colors.text, fontWeight: 600, fontSize: 14 }}>{ex.title}</div>
                <div style={{ color: colors.textMuted, fontSize: 12 }}>{topicName(ex.topicId)} · ~4 min</div>
              </div>
              <button className="no-print" style={btn(true)} onClick={() => navigate(`/topic/${ex.topicId}`)}>Start</button>
            </div>
          ))}
        </div>

        <div style={{ color: colors.textMuted, fontSize: 11 }}>
          {gaps.coverage?.specificShare != null && <>Tagging coverage: {Math.round(gaps.coverage.specificShare * 100)}% of answers matched a specific concept. </>}
          Generated {new Date(gaps.generatedAt || Date.now()).toLocaleString()}
        </div>
      </>
    )
  }

  return (
    <div className="rp-root" style={{ background: colors.bg, minHeight: '100vh', fontFamily: 'Poppins, sans-serif' }}>
      <style>{PRINT_CSS}</style>
      <Navbar />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ color: colors.text, margin: 0, fontSize: 26 }}>Your Learning Report</h1>
            <div style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
              {user?.name || 'Learner'} · {new Date().toLocaleDateString()}
            </div>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={btn(true)} onClick={() => window.print()}>Print / Save as PDF</button>
            <button style={btn(false)} onClick={() => navigate('/home')}>Back to Home</button>
          </div>
        </div>
        {body}
      </div>
    </div>
  )
}
