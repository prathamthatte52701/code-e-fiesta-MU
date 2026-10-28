import { useTheme } from '../../context/ThemeContext'
import ChartEmpty from './ChartEmpty'

const W = 600, H = 220, L = 36, RR = 16, T = 14, B = 30

const shortDate = (day) => {
  const d = new Date(`${day}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? String(day) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export default function ProgressLine({ history }) {
  const { colors } = useTheme()
  const pts = (Array.isArray(history) ? history : []).filter(h => h && h.day && Number.isFinite(h.avg))
  if (!pts.length) return <ChartEmpty message="No history yet. Your trend will appear after you practice." />

  const x = (i) => (pts.length === 1 ? (L + W - RR) / 2 : L + (i * (W - L - RR)) / (pts.length - 1))
  const y = (v) => T + ((100 - Math.max(0, Math.min(100, v))) / 100) * (H - T - B)
  const step = Math.max(1, Math.ceil(pts.length / 6))
  const line = pts.map((p, i) => `${x(i)},${y(p.avg)}`).join(' ')
  const first = pts[0].avg
  const last = pts[pts.length - 1].avg

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img"
        aria-label={`Average mastery over time, ${pts.length} days, from ${first} to ${last}`}>
        <title>Average mastery over time</title>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={L} x2={W - RR} y1={y(v)} y2={y(v)} stroke={colors.border} strokeWidth="1" />
            <text x={L - 6} y={y(v) + 3} fontSize="10" textAnchor="end" fill={colors.textMuted}>{v}</text>
          </g>
        ))}
        <line x1={L} x2={W - RR} y1={y(60)} y2={y(60)} stroke={colors.warning} strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={W - RR} y={y(60) - 4} fontSize="10" textAnchor="end" fill={colors.warning}>60 target</text>
        {pts.length > 1 && <polyline points={line} fill="none" stroke={colors.accent} strokeWidth="2.5" strokeLinejoin="round" />}
        {pts.map((p, i) => (
          <g key={p.day}>
            <circle cx={x(i)} cy={y(p.avg)} r="4" fill={colors.accent} stroke={colors.surface} strokeWidth="1.5"><title>{`${shortDate(p.day)}: ${p.avg}`}</title></circle>
            {i % step === 0 && <text x={x(i)} y={H - 10} fontSize="10" textAnchor="middle" fill={colors.textMuted}>{shortDate(p.day)}</text>}
          </g>
        ))}
      </svg>
      {pts.length === 1 && <div style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>Come back tomorrow to see your trend</div>}
    </div>
  )
}
