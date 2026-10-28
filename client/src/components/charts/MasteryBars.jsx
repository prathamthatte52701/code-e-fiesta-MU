import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { TOPICS } from '../../utils/constants'
import { TOPIC_ORDER, bandColor } from '../../utils/topicGraph'
import ChartEmpty from './ChartEmpty'

const LIMIT = 12

export default function MasteryBars({ concepts }) {
  const { colors } = useTheme()
  const [showAll, setShowAll] = useState(false)
  const list = (Array.isArray(concepts) ? concepts : []).filter(c => c && Number.isFinite(c.score))
  if (!list.length) return <ChartEmpty message="No concept data yet. Answer a few questions to see your bars." />

  const sorted = [...list].sort((a, b) => a.score - b.score)
  const shown = showAll ? sorted : sorted.slice(0, LIMIT)
  const groups = TOPIC_ORDER
    .map(id => ({ id, name: TOPICS.find(t => t.id === id)?.name || id, items: shown.filter(c => c.topicId === id) }))
    .filter(g => g.items.length)

  return (
    <div role="group" aria-label={`Concept mastery bars, ${shown.length} of ${list.length} concepts shown`}>
      {groups.map(g => (
        <div key={g.id} style={{ marginBottom: 14 }}>
          <div style={{ color: colors.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{g.name}</div>
          {g.items.map(c => (
            <div key={c.key} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: colors.text, marginBottom: 3 }}>
                <span>{c.label || c.tag}</span>
                <span style={{ color: colors.textMuted, whiteSpace: 'nowrap' }}>
                  <strong style={{ color: bandColor(c.score, colors) }}>{c.score}</strong> · {c.attempts ?? 0} answers
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: colors.border, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(0, Math.min(100, c.score))}%`, height: '100%', background: bandColor(c.score, colors), borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      ))}
      {list.length > LIMIT && (
        <button type="button" className="no-print" onClick={() => setShowAll(v => !v)} style={{
          background: 'none', border: `1px solid ${colors.border}`, color: colors.accent, borderRadius: 8,
          padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
        }}>
          {showAll ? 'Show weakest only' : `Show all (${list.length})`}
        </button>
      )}
    </div>
  )
}
