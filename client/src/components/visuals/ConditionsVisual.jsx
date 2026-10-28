import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { btnStyle } from './VariablesVisual'

export default function ConditionsVisual({ hindi }) {
  const { colors } = useTheme()
  const [score, setScore] = useState(42)
  const pass = score >= 50
  const on = (hot) => (hot ? colors.accent : colors.border)
  const line = (hot) => ({ stroke: on(hot), strokeWidth: hot ? 3 : 1.5, fill: 'none' })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <button style={btnStyle(colors)} onClick={() => setScore(s => Math.max(0, s - 5))}>-5</button>
        <span style={{ color: colors.text, fontFamily: 'monospace', fontWeight: 700 }}>score = {score}</span>
        <button style={btnStyle(colors)} onClick={() => setScore(s => Math.min(100, s + 5))}>+5</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox="0 0 420 200" width="100%" style={{ minWidth: 320, maxWidth: 520 }} role="img"
          aria-label={`Flowchart: score ${score} is ${pass ? 'at least' : 'below'} 50, so the ${pass ? 'Pass' : 'Try again'} branch runs`}>
          <title>If/else flowchart</title>
          <rect x="150" y="6" width="120" height="30" rx="15" fill={colors.surface} stroke={colors.accent} strokeWidth="2" />
          <text x="210" y="26" textAnchor="middle" fontSize="12" fill={colors.text}>Start</text>
          <path d="M210 36 V60" {...line(true)} />
          <polygon points="210,60 290,100 210,140 130,100" fill={colors.surface} stroke={colors.accent} strokeWidth="2" />
          <text x="210" y="104" textAnchor="middle" fontSize="12" fill={colors.text}>score &gt;= 50?</text>
          <path d="M290 100 H350 V150" {...line(pass)} />
          <path d="M130 100 H70 V150" {...line(!pass)} />
          <text x="318" y="92" fontSize="11" fill={colors.textMuted}>True</text>
          <text x="84" y="92" fontSize="11" fill={colors.textMuted}>False</text>
          <rect x="300" y="150" width="100" height="34" rx="8" fill={pass ? `${colors.success}33` : colors.surface} stroke={on(pass)} strokeWidth={pass ? 3 : 1.5} />
          <text x="350" y="172" textAnchor="middle" fontSize="13" fill={colors.text}>Pass</text>
          <rect x="20" y="150" width="100" height="34" rx="8" fill={!pass ? `${colors.warning}33` : colors.surface} stroke={on(!pass)} strokeWidth={!pass ? 3 : 1.5} />
          <text x="70" y="172" textAnchor="middle" fontSize="13" fill={colors.text}>Try again</text>
        </svg>
      </div>
      <p style={{ color: colors.textMuted, fontSize: 12, margin: '6px 0 0' }}>
        {hindi ? 'कंडीशन सही हो तो True वाला रास्ता चलता है, वरना False वाला।' : 'If the condition is true, the True path runs; otherwise the False path runs.'}
      </p>
    </div>
  )
}
