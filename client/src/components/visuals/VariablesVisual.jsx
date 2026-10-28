import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

export const Box = ({ label, value, colors, highlight }) => (
  <div style={{ textAlign: 'center', minWidth: 76 }}>
    <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4, fontFamily: 'monospace' }}>{label}</div>
    <div style={{
      border: `2px solid ${highlight ? colors.accent : colors.border}`, borderRadius: 10, padding: '12px 10px',
      background: highlight ? `${colors.accent}18` : colors.bg, color: colors.text, fontWeight: 700, fontFamily: 'monospace',
      transition: 'all 0.25s',
    }}>{String(value)}</div>
  </div>
)

export const btnStyle = (colors) => ({
  background: colors.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
})

export default function VariablesVisual({ hindi }) {
  const { colors } = useTheme()
  const [runs, setRuns] = useState(45)
  const [pair, setPair] = useState({ a: 3, b: 7 })
  const [flash, setFlash] = useState('')
  const pulse = (k) => { setFlash(k); setTimeout(() => setFlash(''), 400) }

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <Box label="runs" value={runs} colors={colors} highlight={flash === 'runs'} />
        <Box label="overs" value={4} colors={colors} />
        <Box label="name" value={'"Asha"'} colors={colors} />
        <Box label="a" value={pair.a} colors={colors} highlight={flash === 'swap'} />
        <Box label="b" value={pair.b} colors={colors} highlight={flash === 'swap'} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button style={btnStyle(colors)} onClick={() => { setRuns(r => r + 4); pulse('runs') }}>runs += 4</button>
        <button style={btnStyle(colors)} onClick={() => { setPair(p => ({ a: p.b, b: p.a })); pulse('swap') }}>Swap a and b</button>
      </div>
      <p style={{ color: colors.textMuted, fontSize: 12, margin: '10px 0 0', fontFamily: 'monospace' }}>a, b = b, a</p>
      <p style={{ color: colors.textMuted, fontSize: 12, margin: '4px 0 0' }}>
        {hindi ? 'वेरिएबल एक नाम वाला डिब्बा है जिसमें वैल्यू रखी जाती है।' : 'A variable is a named box that holds a value.'}
      </p>
    </div>
  )
}
