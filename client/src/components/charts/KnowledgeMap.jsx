import { useTheme } from '../../context/ThemeContext'
import { TOPICS } from '../../utils/constants'
import { GRAPH_LAYOUT, GRAPH_EDGES, TOPIC_ORDER, bandColor } from '../../utils/topicGraph'

const NODE_R = 26

const KEYFRAMES = `
@keyframes kmPulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.6); opacity: 0; } }
.km-pulse { transform-box: fill-box; transform-origin: center; animation: kmPulse 1.6s ease-out infinite; }
.km-node:focus { outline: none; }
.km-node:focus-visible circle.km-body { stroke-width: 4; }
`

// Edge from node edge to node edge; same-row long hops are curved so they skip over the nodes between
const edgePath = (a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len
  const sx = a.x + ux * NODE_R, sy = a.y + uy * NODE_R
  const ex = b.x - ux * (NODE_R + 6), ey = b.y - uy * (NODE_R + 6)
  if (dy === 0 && Math.abs(dx) > 160) {
    const mx = (a.x + b.x) / 2
    const cy = a.y - 48
    return `M ${a.x},${a.y - NODE_R} Q ${mx},${cy} ${b.x},${b.y - NODE_R - 6}`
  }
  return `M ${sx},${sy} L ${ex},${ey}`
}

export default function KnowledgeMap({ topicMastery, rootCauses, onNodeClick }) {
  const { colors } = useTheme()
  const byId = new Map((Array.isArray(topicMastery) ? topicMastery : []).filter(Boolean).map(t => [t.topicId, t]))
  const roots = Array.isArray(rootCauses) ? rootCauses.filter(Boolean) : []
  const rootIds = new Set(roots.map(r => r.topicId))
  const hotEdges = new Set()
  for (const r of roots) {
    const path = Array.isArray(r.path) ? r.path : []
    for (let i = 0; i < path.length - 1; i++) hotEdges.add(`${path[i]}>${path[i + 1]}`)
  }
  const scoreOf = (id) => (Number.isFinite(byId.get(id)?.score) ? byId.get(id).score : null)
  const nameOf = (id) => TOPICS.find(t => t.id === id)?.name || id
  const summary = TOPIC_ORDER.map(id => `${nameOf(id)} ${scoreOf(id) ?? 'no data'}`).join(', ')

  const legend = [
    ['Needs Revision', colors.error], ['Developing', colors.warning], ['Ready', colors.accent], ['Mastered', colors.success],
  ]

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox="0 0 900 290" width="100%" style={{ minWidth: 640, display: 'block' }} preserveAspectRatio="xMidYMid meet"
          role="img" aria-label={`Knowledge map of prerequisite topics: ${summary}`}>
          <title>Knowledge map</title>
          <style>{KEYFRAMES}</style>
          <defs>
            <marker id="km-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.textMuted} />
            </marker>
            <marker id="km-arrow-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.error} />
            </marker>
          </defs>
          {GRAPH_EDGES.map(([from, to]) => {
            const a = GRAPH_LAYOUT[from], b = GRAPH_LAYOUT[to]
            if (!a || !b) return null
            const hot = hotEdges.has(`${from}>${to}`)
            return (
              <path key={`${from}>${to}`} d={edgePath(a, b)} fill="none"
                stroke={hot ? colors.error : colors.border} strokeWidth={hot ? 4 : 1.5}
                markerEnd={`url(#${hot ? 'km-arrow-hot' : 'km-arrow'})`} />
            )
          })}
          {TOPIC_ORDER.map(id => {
            const pos = GRAPH_LAYOUT[id]
            const score = scoreOf(id)
            const color = bandColor(score, colors)
            const isRoot = rootIds.has(id)
            const activate = () => onNodeClick && onNodeClick(id)
            return (
              <g key={id} className="km-node" tabIndex={0} role="button" style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
                aria-label={`${nameOf(id)}: ${score === null ? 'no data' : `score ${score}`}${isRoot ? ', root cause' : ''}`}
                onClick={activate}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate() } }}>
                {isRoot && <circle className="km-pulse" cx={pos.x} cy={pos.y} r={NODE_R + 4} fill="none" stroke={colors.error} strokeWidth="3" />}
                <circle className="km-body" cx={pos.x} cy={pos.y} r={NODE_R}
                  fill={score === null ? colors.surface : color} stroke={color} strokeWidth="2.5"
                  strokeDasharray={score === null ? '5 4' : undefined} />
                <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={score === null ? colors.textMuted : '#fff'}>
                  {score === null ? '?' : score}
                </text>
                <text x={pos.x} y={pos.y + NODE_R + 16} textAnchor="middle" fontSize="12" fill={colors.text}>{nameOf(id)}</text>
                {score === null && <text x={pos.x} y={pos.y + NODE_R + 29} textAnchor="middle" fontSize="10" fill={colors.textMuted}>no data</text>}
              </g>
            )
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, fontSize: 11, color: colors.textMuted }}>
        {legend.map(([label, c]) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />{label}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px dashed ${colors.textMuted}`, boxSizing: 'border-box', display: 'inline-block' }} />No data
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${colors.error}`, boxSizing: 'border-box', display: 'inline-block' }} />Root cause
        </span>
      </div>
    </div>
  )
}
