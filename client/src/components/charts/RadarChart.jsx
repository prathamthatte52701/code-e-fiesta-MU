import { useTheme } from '../../context/ThemeContext'
import { TOPICS } from '../../utils/constants'
import { TOPIC_ORDER, bandColor } from '../../utils/topicGraph'
import ChartEmpty from './ChartEmpty'

const CX = 200, CY = 180, R = 110

const point = (i, n, value) => {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n
  const r = (R * value) / 100
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

export default function RadarChart({ topicMastery }) {
  const { colors } = useTheme()
  const byId = new Map((Array.isArray(topicMastery) ? topicMastery : []).filter(Boolean).map(t => [t.topicId, t]))
  const n = TOPIC_ORDER.length
  const scoreOf = (id) => {
    const s = byId.get(id)?.score
    return Number.isFinite(s) ? s : null
  }
  if (!TOPIC_ORDER.some(id => scoreOf(id) !== null)) return <ChartEmpty message="No topic scores yet. Answer a few questions to see your radar." />

  const ring = (v) => TOPIC_ORDER.map((_, i) => point(i, n, v).join(',')).join(' ')
  const poly = TOPIC_ORDER.map((id, i) => point(i, n, scoreOf(id) ?? 0).join(',')).join(' ')
  const summary = TOPIC_ORDER.map(id => `${TOPICS.find(t => t.id === id)?.name || id} ${scoreOf(id) ?? 'no data'}`).join(', ')
  const short = (name) => (name.length > 10 ? `${name.slice(0, 9)}…` : name)

  return (
    <svg viewBox="0 0 400 360" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Topic mastery radar: ${summary}`} style={{ maxWidth: 460, display: 'block', margin: '0 auto' }}>
      <title>Topic mastery radar</title>
      {[25, 50, 75, 100].map(v => <polygon key={v} points={ring(v)} fill="none" stroke={colors.border} strokeWidth="1" />)}
      <polygon points={ring(60)} fill="none" stroke={colors.warning} strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
      <text x={CX + 4} y={CY - R * 0.6 - 3} fontSize="9" fill={colors.warning}>target</text>
      {TOPIC_ORDER.map((id, i) => {
        const [x, y] = point(i, n, 100)
        return <line key={id} x1={CX} y1={CY} x2={x} y2={y} stroke={colors.border} strokeWidth="1" />
      })}
      <polygon points={poly} fill={colors.accent} fillOpacity="0.22" stroke={colors.accent} strokeWidth="2" />
      {TOPIC_ORDER.map((id, i) => {
        const s = scoreOf(id)
        const [x, y] = point(i, n, s ?? 0)
        const [lx, ly] = point(i, n, 100 + 22)
        const name = TOPICS.find(t => t.id === id)?.name || id
        const anchor = lx < CX - 8 ? 'end' : lx > CX + 8 ? 'start' : 'middle'
        return (
          <g key={id}>
            <circle cx={x} cy={y} r="4" fill={s === null ? colors.surface : bandColor(s, colors)} stroke={s === null ? colors.textMuted : bandColor(s, colors)} strokeWidth="2" />
            <text x={lx} y={ly + 3} fontSize="10" textAnchor={anchor} fill={colors.text}>{short(name)}</text>
          </g>
        )
      })}
    </svg>
  )
}
