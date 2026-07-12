import { Volume2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { showToast } from './Toast';

// Disabled: TTS playback is under development (buggy). Kept visible so the
// control isn't a surprise removal, but it no longer speaks — see Toast.
export default function SpeakButton({ style }) {
  const { colors } = useTheme();

  const handleSpeak = () => {
    showToast('This option will be available soon. This is under development.', 'warning');
  };

  return (
    <button
      onClick={handleSpeak}
      title="Read aloud (coming soon)"
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: '6px 12px',
        cursor: 'not-allowed',
        color: colors.textMuted,
        opacity: 0.6,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        transition: 'all 0.2s',
        ...style
      }}
    >
      <Volume2 size={16} />
      Listen
    </button>
  );
}
