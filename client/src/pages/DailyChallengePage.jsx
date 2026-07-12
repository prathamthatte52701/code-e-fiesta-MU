import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/shared/Navbar';
import IDEQuestion from '../components/question/IDEQuestion';
import MCQQuestion from '../components/question/MCQQuestion';
import FillQuestion from '../components/question/FillQuestion';
import Confetti from '../components/shared/Confetti';
import { getChallengeForTopic, getDailyChallengeSlotInfo } from '../assets/challenges/dailyChallenges'
import {
  formatDailyChallengeTime,
  getLocalDailyChallengeSlots,
  isDailyChallengeSlotCompleted,
  mergeLocalDailyChallengeSlots,
  saveLocalDailyChallengeSlot,
} from '../utils/dailyChallengeSlots'
import api from '../utils/api';
import { getGuestProgress, saveGuestUser } from '../utils/guestProgress'
import { normalizeLanguage, t } from '../utils/i18n'
import { isAnswerMatch } from '../utils/answerMatch'

const TEXT = {
  english: {
    challengeComplete: 'Challenge Complete!',
    bonusEarned: 'bonus points earned!',
    nextUnlocks: 'Next challenge unlocks in',
    aiExplanation: 'AI Explanation',
    aiExplaining: 'AI is explaining...',
    saveFailed: 'Could not save the challenge. Please submit again.',
    incorrectTryAgain: 'Incorrect! Try again.',
    correctAnswer: 'Correct answer',
  },
  hindi: {
    challengeComplete: 'Challenge Complete! 🎉',
    bonusEarned: 'bonus points मिले!',
    nextUnlocks: 'Agla challenge unlock hoga',
    aiExplanation: 'AI Explanation',
    aiExplaining: 'AI explain kar raha hai...',
    saveFailed: 'Challenge save nahi ho paya. Dobara submit karo.',
    incorrectTryAgain: 'Incorrect! Ek baar aur try karo.',
    correctAnswer: 'सही जवाब',
  },
  tamil: {
    challengeComplete: 'Challenge முடிந்தது! 🎉',
    bonusEarned: 'bonus points கிடைத்தது!',
    nextUnlocks: 'அடுத்த challenge unlock ஆகும்',
    aiExplanation: 'AI Explanation',
    aiExplaining: 'AI explain செய்கிறது...',
    saveFailed: 'Challenge save ஆகவில்லை. மீண்டும் submit செய்யவும்.',
    incorrectTryAgain: 'தவறு! மீண்டும் முயற்சி செய்யவும்.',
    correctAnswer: 'சரியான பதில்',
  },
  malayalam: {
    challengeComplete: 'Challenge പൂർത്തിയായി! 🎉',
    bonusEarned: 'bonus points ലഭിച്ചു!',
    nextUnlocks: 'അടുത്ത challenge unlock ആകും',
    aiExplanation: 'AI Explanation',
    aiExplaining: 'AI explain ചെയ്യുന്നു...',
    saveFailed: 'Challenge save ചെയ്യാനായില്ല. വീണ്ടും submit ചെയ്യൂ.',
    incorrectTryAgain: 'തെറ്റാണ്! വീണ്ടും ശ്രമിക്കൂ.',
    correctAnswer: 'ശരിയായ ഉത്തരം',
  },
}

export default function DailyChallengePage() {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const language = normalizeLanguage(user?.language);
  const labels = TEXT[language] || TEXT.english;
  const [challenge, setChallenge] = useState(getChallengeForTopic('variables'));
  const [topicId, setTopicId] = useState('variables');
  const [slotInfo, setSlotInfo] = useState(getDailyChallengeSlotInfo());
  const [completedSlots, setCompletedSlots] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const uid = user?._id || user?.id;
    const applyTopic = (nextTopicId) => {
      setTopicId(nextTopicId);
      setChallenge(getChallengeForTopic(nextTopicId, new Date()));
    };

    if (!uid) {
      applyTopic('variables');
      return;
    }

    if (user?.isGuest) {
      const current = (getGuestProgress() || []).find(p => !p.topicCompleted);
      applyTopic(current?.topicId || 'variables');
      return;
    }

    api.get(`/progress/${uid}`)
      .then(res => {
        const current = (res.data || []).find(p => !p.topicCompleted);
        applyTopic(current?.topicId || 'variables');
      })
      .catch(() => applyTopic('variables'));
  }, [user?._id, user?.id, user?.isGuest]);

  useEffect(() => {
    setChallenge(getChallengeForTopic(topicId, new Date()));
    setSelectedAnswer('');
    setAnswerFeedback(null);
    setAiExplanation('');
    setAiLoading(false);
    setJustCompleted(false);
  }, [topicId, slotInfo.slotId]);

  useEffect(() => {
    const timer = setInterval(() => setSlotInfo(getDailyChallengeSlotInfo()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const localSlots = getLocalDailyChallengeSlots(user, slotInfo.dateKey);
    setCompletedSlots(localSlots);

    if (!user || user?.isGuest || user?.isDeveloper) return;

    api.get(`/challenge/daily-status?dateKey=${slotInfo.dateKey}`)
      .then(res => {
        setCompletedSlots(mergeLocalDailyChallengeSlots(user, slotInfo.dateKey, res.data?.completedSlots || []));
      })
      .catch(() => {});
  }, [user?._id, user?.id, user?.isGuest, user?.isDeveloper, slotInfo.dateKey]);

  useEffect(() => {
    setCompleted(!user?.isDeveloper && isDailyChallengeSlotCompleted(completedSlots, slotInfo));
  }, [completedSlots, slotInfo, user?.isDeveloper]);

  // Auto-return to Home 60s after any submission (correct or incorrect),
  // so the user isn't stuck on this screen if they don't tap Back to Home.
  useEffect(() => {
    if (!completed && !answerFeedback) return;
    const timer = setTimeout(() => navigate('/home'), 60000);
    return () => clearTimeout(timer);
  }, [completed, answerFeedback, navigate]);

  const text = language === 'hindi' && challenge.questionHindi ? challenge.questionHindi : challenge.question;
  const options = language === 'hindi' && challenge.optionsHindi ? challenge.optionsHindi : challenge.options;
  const countdown = formatDailyChallengeTime(slotInfo.msUntilNextSlot);

  const loadAiExplanation = async ({ submitted, expected, isCorrect }) => {
    setAiLoading(true);
    setAiExplanation('');
    try {
      const res = await api.post('/groq/wrong-summary', {
        topicId,
        question: text,
        userAnswer: submitted,
        correctAnswer: expected,
        questionType: challenge.type,
        isCorrect,
        language: user?.language,
        hobby: user?.hobby,
      });
      setAiExplanation(res.data?.summary || (isCorrect
        ? `✅ ${labels.correctAnswer}: ${expected}`
        : `${labels.correctAnswer}: ${expected}`
      ));
    } catch {
      setAiExplanation(isCorrect
        ? `✅ ${labels.correctAnswer}: ${expected}`
        : `${labels.correctAnswer}: ${expected}`
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSolve = async (output) => {
    if (completed && !user?.isDeveloper) return;
    const submitted = String(output ?? '').trim();
    setSelectedAnswer(submitted);
    setAnswerFeedback(null);
    setAiExplanation('');
    const expected = challenge.type === 'CODE' ? challenge.expectedOutput : challenge.correctAnswer;
    const isCorrect = isAnswerMatch(submitted, expected);

    if (isCorrect) {
      setCompleted(true);
      setJustCompleted(true);
      setShowConfetti(true);
      loadAiExplanation({ submitted, expected, isCorrect: true });

      if (user?.isGuest) {
        const nextSlots = saveLocalDailyChallengeSlot(user, slotInfo);
        setCompletedSlots(nextSlots);
        window.dispatchEvent(new CustomEvent('dailyChallengeSolved', {
          detail: { slotId: slotInfo.slotId, dateKey: slotInfo.dateKey },
        }));
        const nextPoints = (user.totalPoints || 0) + challenge.bonusPoints
        saveGuestUser({ totalPoints: nextPoints })
        updateUser({ totalPoints: nextPoints })
        return
      }
      try {
        const res = await api.post('/challenge/daily-complete', {
          bonusPoints: challenge.bonusPoints,
          slotId: slotInfo.slotId,
          dateKey: slotInfo.dateKey,
          slotIndex: slotInfo.slotIndex,
          challengeId: challenge.id,
        });
        if (Array.isArray(res.data?.completedSlots)) {
          setCompletedSlots(mergeLocalDailyChallengeSlots(user, slotInfo.dateKey, res.data.completedSlots));
        } else if (!user?.isDeveloper) {
          setCompletedSlots(saveLocalDailyChallengeSlot(user, slotInfo));
        }
        if (res.data?.alreadyCompleted) {
          setJustCompleted(false);
        }
        if (!user?.isDeveloper) {
          window.dispatchEvent(new CustomEvent('dailyChallengeSolved', {
            detail: { slotId: slotInfo.slotId, dateKey: slotInfo.dateKey },
          }));
        }
        updateUser(res.data.user || { totalPoints: (user.totalPoints || 0) + challenge.bonusPoints })
      } catch {
        setCompleted(false);
        setJustCompleted(false);
        setAnswerFeedback({
          type: 'error',
          message: labels.saveFailed,
        });
      }
    } else {
      setAnswerFeedback({
        type: 'wrong',
        message: labels.incorrectTryAgain,
      });
      loadAiExplanation({ submitted, expected, isCorrect: false });
    }
  };

  return (
    <div style={{ background: colors.bg, minHeight: '100vh' }}>
      <Navbar />
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
          <ArrowLeft size={16} /> {t(language, 'backHome', 'Back to Home')}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Zap size={24} color={colors.warning} />
          <h1 style={{ color: colors.text, margin: 0, fontSize: 22 }}>{t(language, 'dailyChallenge', 'Daily Challenge')}</h1>
          <span style={{ background: colors.warning, color: '#000', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            +{challenge.bonusPoints} pts
          </span>
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ color: colors.text, fontSize: 18, margin: '0 0 20px' }}>{text}</h2>

          {completed ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 60, marginBottom: 12 }}>🎉</div>
              <h2 style={{ color: colors.success }}>{labels.challengeComplete}</h2>
              <p style={{ color: colors.textMuted }}>
                {justCompleted
                  ? `+${challenge.bonusPoints} ${labels.bonusEarned}`
                  : `${labels.nextUnlocks} ${countdown}.`}
              </p>
              {(aiLoading || aiExplanation) && (
                <div style={{
                  background: `${colors.accent}10`,
                  border: `1px solid ${colors.accent}35`,
                  borderRadius: 12,
                  padding: 14,
                  margin: '18px 0 0',
                  textAlign: 'left',
                }}>
                  <div style={{ color: colors.accent, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    🤖 {labels.aiExplanation}
                  </div>
                  <p style={{ color: aiLoading ? colors.textMuted : colors.text, fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
                    {aiLoading ? labels.aiExplaining : aiExplanation}
                  </p>
                </div>
              )}
              <button onClick={() => navigate('/home')} style={{
                background: colors.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 32px', cursor: 'pointer', fontSize: 15, fontWeight: 600, marginTop: 16
              }}>{t(language, 'backHome', 'Back to Home')}</button>
            </div>
          ) : (
            <>
              {challenge.type === 'MCQ' && (
                <MCQQuestion
                  options={options || []}
                  correctAnswer={challenge.correctAnswer}
                  selectedAnswer={selectedAnswer}
                  answered={completed}
                  onAnswer={handleSolve}
                />
              )}
              {challenge.type === 'FILL' && (
                <FillQuestion
                  question={challenge.code || challenge.question}
                  correctAnswer={challenge.correctAnswer}
                  answered={completed}
                  onAnswer={handleSolve}
                  language={language}
                />
              )}
              {challenge.type === 'CODE' && (
                <IDEQuestion
                  problem={text}
                  expectedOutput={challenge.expectedOutput}
                  answered={false}
                  onAnswer={handleSolve}
                  language={language}
                  hobby={user?.hobby}
                />
              )}
              {answerFeedback && (
                <div style={{
                  marginTop: 16,
                  background: answerFeedback.type === 'error' ? `${colors.warning}18` : `${colors.error}15`,
                  border: `1px solid ${answerFeedback.type === 'error' ? colors.warning : colors.error}55`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: answerFeedback.type === 'error' ? colors.warning : colors.error,
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  {answerFeedback.message}
                </div>
              )}
              {(aiLoading || aiExplanation) && (
                <div style={{
                  marginTop: 16,
                  background: `${colors.accent}10`,
                  border: `1px solid ${colors.accent}35`,
                  borderRadius: 10,
                  padding: '12px 14px',
                }}>
                  <div style={{ color: colors.accent, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    🤖 {labels.aiExplanation}
                  </div>
                  <p style={{ color: aiLoading ? colors.textMuted : colors.text, fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
                    {aiLoading ? labels.aiExplaining : aiExplanation}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
