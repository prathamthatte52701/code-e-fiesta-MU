import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { btnStyle } from './VariablesVisual'

const SCORES = [72, 85, 64, 90, 78]

export default function ListsVisual({ hindi }) {
  const { colors } = useTheme()
  const [idx, setIdx] = useState(2)
  const n = SCORES.length
  const cell = (i, mark) => ({
    width: 52, textAlign: 'center', padding: '10px 0', borderRadius: 8, fontFamily: 'monospace', fontWeight: 700,
    border: `2px solid ${mark ? colors.accent : colors.border}`, background: mark ? `${colors.accent}20` : colors.bg, color: colors.text,
  })
  const small = { width: 52, textAlign: 'center', fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' }
  const row = { display: 'flex', gap: 8 }

  return (
    <div>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ ...row, marginBottom: 4 }}>{SCORES.map((_, i) => <div key={i} style={small}>{i}</div>)}</div>
        <div style={row}>{SCORES.map((v, i) => <div key={i} style={cell(i, i === idx)}>{v}</div>)}</div>
        <div style={{ ...row, marginTop: 4 }}>{SCORES.map((_, i) => <div key={i} style={small}>{i - n}</div>)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0', flexWrap: 'wrap' }}>
        <button style={btnStyle(colors)} onClick={() => setIdx(i => Math.max(0, i - 1))}>&larr;</button>
        <button style={btnStyle(colors)} onClick={() => setIdx(i => Math.min(n - 1, i + 1))}>&rarr;</button>
        <span style={{ color: colors.text, fontFamily: 'monospace', fontSize: 13 }}>scores[{idx}] = {SCORES[idx]}   (scores[{idx - n}])</span>
      </div>
      <div style={{ ...row, marginBottom: 4 }}>
        {SCORES.map((v, i) => <div key={i} style={cell(i, i >= 1 && i < 3)}>{v}</div>)}
      </div>
      <p style={{ color: colors.textMuted, fontSize: 12, margin: '4px 0 0', fontFamily: 'monospace' }}>scores[1:3] = {JSON.stringify(SCORES.slice(1, 3))}</p>
      <p style={{ color: colors.textMuted, fontSize: 12, margin: '4px 0 0' }}>
        {hindi ? 'इंडेक्स 0 से शुरू होता है; स्लाइस में अंतिम इंडेक्स शामिल नहीं होता।' : 'Indexes start at 0; a slice stops before its end index.'}
      </p>
    </div>
  )
}
