import { useTheme } from '../../context/ThemeContext';
import { isAnswerMatch } from '../../utils/answerMatch';

export default function MCQQuestion({ options = [], correctAnswer, selectedAnswer, answered, onAnswer }) {
  const { colors } = useTheme();

  const isCorrectOpt = (opt) => isAnswerMatch(opt, correctAnswer);

  const getBg = (opt) => {
    if (!answered) return colors.surface;
    if (isCorrectOpt(opt)) return `${colors.success}20`;
    if (opt === selectedAnswer && !isCorrectOpt(opt)) return `${colors.error}20`;
    return colors.surface;
  };

  const getBorder = (opt) => {
    if (!answered) return selectedAnswer === opt ? colors.accent : colors.border;
    if (isCorrectOpt(opt)) return colors.success;
    if (opt === selectedAnswer && !isCorrectOpt(opt)) return colors.error;
    return colors.border;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => !answered && onAnswer(opt)}
          disabled={answered}
          style={{
            background: getBg(opt),
            border: `2px solid ${getBorder(opt)}`,
            borderRadius: 10, padding: '12px 16px',
            cursor: answered ? 'default' : 'pointer',
            color: colors.text, textAlign: 'left', fontSize: 14,
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 12
          }}
        >
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: isCorrectOpt(opt) && answered ? colors.success : colors.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isCorrectOpt(opt) && answered ? '#fff' : colors.textMuted,
            fontSize: 12, fontWeight: 700, flexShrink: 0
          }}>
            {answered && isCorrectOpt(opt) ? '✓' : String.fromCharCode(65 + i)}
          </span>
          {opt}
        </button>
      ))}
    </div>
  );
}
