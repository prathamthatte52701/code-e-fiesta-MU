import Navbar from '../components/shared/Navbar';
import { useTheme } from '../context/ThemeContext';
import AdaptiveLearningDashboard from '../features/adaptiveLearning/AdaptiveLearningDashboard';

export default function AdaptiveLearning() {
  const { colors } = useTheme();

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: 'Poppins, sans-serif' }}>
      <Navbar />
      <main style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '24px 16px 40px', boxSizing: 'border-box' }}>
        <AdaptiveLearningDashboard />
      </main>
    </div>
  );
}
