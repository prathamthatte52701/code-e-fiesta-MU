import { useTheme } from '../../context/ThemeContext'
import VariablesVisual from './VariablesVisual'
import ConditionsVisual from './ConditionsVisual'
import LoopsVisual from './LoopsVisual'
import ListsVisual from './ListsVisual'

const VISUALS = { variables: VariablesVisual, conditions: ConditionsVisual, loops: LoopsVisual, lists: ListsVisual }

// Deterministic, hand-built explainers. No AI, no network. Other topics render nothing.
export default function ConceptVisual({ topicId, language }) {
  const { colors } = useTheme()
  const Visual = VISUALS[topicId]
  if (!Visual) return null
  return (
    <div style={{ marginTop: 20, border: `1px dashed ${colors.accent}66`, borderRadius: 12, padding: 16 }}>
      <div style={{ color: colors.accent, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Try it yourself</div>
      <Visual hindi={language === 'hindi'} />
    </div>
  )
}
