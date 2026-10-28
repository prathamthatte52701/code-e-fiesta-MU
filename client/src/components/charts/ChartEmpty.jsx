import { useTheme } from '../../context/ThemeContext'

export default function ChartEmpty({ message }) {
  const { colors } = useTheme()
  return <div style={{ color: colors.textMuted, fontSize: 13, padding: '16px 0', textAlign: 'center' }}>{message}</div>
}
