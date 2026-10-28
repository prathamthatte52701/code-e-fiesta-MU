import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { btnStyle } from './VariablesVisual'

// for i in range(1, 5): total += i  -> i = 1,2,3,4
const VALUES = [1, 2, 3, 4]

export default function LoopsVisual({ hindi }) {
  const { colors } = useTheme()
  const [n, setN] = useState(0) // iterations done
  const rows = VALUES.slice(0, n).map((i, k) => ({ it: k + 1, i, total: VALUES.slice(0, k + 1).reduce((a, b) => a + b, 0) }))
  const done = n >= VALUES.length
  const lineStyle = (active) => ({
    padding: '2px 8px', borderRadius: 6, background: active ? `${colors.accent}30` : 'transparent', color: colors.text,
  })

  return (
    <div>
      <pre style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 10, margin: '0 0 12px', fontSize: 13, overflowX: 'auto' }}>
        <div style={lineStyle(n === 0)}>total = 0</div>
        <div style={lineStyle(n > 0 && !done)}>for i in range(1, 5):</div>
        <div style={lineStyle(n > 0 && !done)}>{'    total += i'}</div>
        <div style={lineStyle(done)}>print(total)  # {done ? 10 : '...'}</div>
      </pre>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button style={{ ...btnStyle(colors), opacity: done ? 0.5 : 1 }} disabled={done} onClick={() => setN(v => v + 1)}>Next iteration</button>
        <button style={{ ...btnStyle(colors), background: 'transparent', color: colors.text, border: `1px solid ${colors.border}` }} onClick={() => setN(0)}>Reset</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13, color: colors.text, minWidth: 220 }}>
          <thead><tr>{['iteration', 'i', 'total'].map(h => <th key={h} style={{ textAlign: 'left', padding: '4px 14px 4px 0', color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.it} style={{ background: r.it === n ? `${colors.accent}20` : 'transparent' }}>
                <td style={{ padding: '4px 14px 4px 0' }}>{r.it}</td><td style={{ padding: '4px 14px 4px 0' }}>{r.i}</td><td style={{ padding: '4px 14px 4px 0' }}>{r.total}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={3} style={{ color: colors.textMuted, padding: '4px 0' }}>Press "Next iteration"</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ color: colors.textMuted, fontSize: 12, margin: '8px 0 0' }}>
        {hindi ? 'लूप एक ही काम बार-बार दोहराता है, हर बार i की वैल्यू बदलती है।' : 'A loop repeats the same steps; i takes a new value each time.'}
      </p>
    </div>
  )
}
