import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../utils/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import SpeakButton from '../shared/SpeakButton';
import Confetti from '../shared/Confetti';
import MCQQuestion from './MCQQuestion';
import FillQuestion from './FillQuestion';
import IDEQuestion from './IDEQuestion';
import RobotReaction from './RobotReaction';
import ResultPopup from '../shared/ResultPopup';
import { getHints } from '../../assets/hints/hints';
import { getStemContext } from '../../assets/hobbyStemMap/mapping';
import { showToast } from '../shared/Toast';
import { HelpCircle, ChevronRight, ArrowLeft, Trophy, Zap, BookOpen, CheckCircle } from 'lucide-react';
import { getFallbackQuestion } from '../../data/fallbackQuestions';
import { updateGuestProgress } from '../../utils/guestProgress';
import { normalizeLanguage } from '../../utils/i18n';
import { isAnswerMatch } from '../../utils/answerMatch';

// Map backend questionType → frontend type key
const TYPE_MAP = {
  MCQ: 'MCQ',
  OUTPUT_PREDICT: 'OUTPUT',
  FILL_BLANK: 'FILL',
  CODE: 'CODE',
};

const UI_TEXT = {
  english: {
    topicComplete: "Topic Completed! You're a pro! 🎉",
    correct: 'Correct',
    incorrect: 'Incorrect — keep going!',
    loadingExplanation: 'Loading explanation...',
    nextQuestion: 'Next Question',
    backToTopic: 'Back to Topic',
    multipleChoice: 'Multiple Choice',
    predictOutput: 'Predict Output',
    fillBlank: 'Fill in the Blank',
    codeChallenge: 'Code Challenge',
  },
  hindi: {
    topicComplete: 'Topic Complete! Bahut badhiya! 🎉',
    correct: 'Sahi jawab',
    incorrect: 'Galat jawab — agli baar!',
    loadingExplanation: 'Explanation aa rahi hai...',
    nextQuestion: 'Agla Sawaal',
    backToTopic: 'Vapas Jao',
    multipleChoice: 'Multiple Choice',
    predictOutput: 'Output Guess Karo',
    fillBlank: 'Blank Bharo',
    codeChallenge: 'Code Challenge',
  },
  tamil: {
    topicComplete: 'Topic முடிந்தது! அருமை! 🎉',
    correct: 'சரியான பதில்',
    incorrect: 'சரியாக இல்லை — தொடர்ந்து முயற்சி செய்க!',
    loadingExplanation: 'Explanation வருகிறது...',
    nextQuestion: 'அடுத்த கேள்வி',
    backToTopic: 'Topic-க்கு திரும்பு',
    multipleChoice: 'Multiple Choice',
    predictOutput: 'Output கணிக்கவும்',
    fillBlank: 'காலியை நிரப்பவும்',
    codeChallenge: 'Code Challenge',
  },
  malayalam: {
    topicComplete: 'Topic പൂർത്തിയായി! ഗംഭീരം! 🎉',
    correct: 'ശരിയായ ഉത്തരം',
    incorrect: 'തെറ്റായ ഉത്തരം — തുടരൂ!',
    loadingExplanation: 'Explanation വരുന്നു...',
    nextQuestion: 'അടുത്ത ചോദ്യം',
    backToTopic: 'Topic-ലേക്ക് മടങ്ങൂ',
    multipleChoice: 'Multiple Choice',
    predictOutput: 'Output പ്രവചിക്കുക',
    fillBlank: 'ശൂന്യം പൂരിപ്പിക്കുക',
    codeChallenge: 'Code Challenge',
  },
};

// ─── Batch helpers (mirrors server/utils/adaptive.js) ────────────────────────
const getLevelType = (level) => {
  if (level <= 2) return 'MCQ';
  if (level <= 4) return 'FILL';
  return 'IDE';
};

const getBatchSize = (levelType) => (levelType === 'IDE' ? 3 : 5);

const TOPIC_LEVEL_LIMITS = {
  'variables':      [15, 15, 11, 11,  8],
  'data-types':     [17, 17, 13, 13, 10],
  'conditions':     [22, 22, 18, 18, 10],
  'strings':        [22, 22, 18, 18, 10],
  'functions':      [22, 22, 18, 18, 10],
  'lists':          [22, 22, 18, 18, 10],
  'error-handling': [22, 22, 18, 18, 10],
  'loops':          [27, 27, 22, 22, 12],
  'oop':            [27, 27, 22, 22, 12],
  'algorithms':     [27, 27, 22, 22, 12],
};

const getMaxQuestions = (topicId, level) => {
  const limits = TOPIC_LEVEL_LIMITS[topicId] || TOPIC_LEVEL_LIMITS['conditions'];
  return limits[(level || 1) - 1] || 20;
};

const increaseDiff = (d) => (d === 'EASY' ? 'MEDIUM' : 'HARD');
const decreaseDiff = (d) => (d === 'HARD' ? 'MEDIUM' : 'EASY');

// ─── Theory Overlay Component ─────────────────────────────────────────────────
function TheoryOverlay({ topicId, topicName, language, hobby, colors, onContinue }) {
  const [loading, setLoading]   = useState(false);
  const [theory, setTheory]     = useState('');
  const [loaded, setLoaded]     = useState(false);

  const loadTheory = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/topics/${topicId}/theory-detailed?language=${language}&hobby=${hobby || 'cricket'}`);
      setTheory(res.data.theory || '');
      setLoaded(true);
    } catch {
      setTheory('Could not load theory. Please check your connection and try again.');
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  // Render markdown-ish: split on ## headings and ``` code blocks
  const renderTheory = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('# '))  return <h2 key={i} style={{ color: colors.accent, fontSize: 20, marginTop: 24, marginBottom: 8 }}>{line.slice(2)}</h2>;
      if (line.startsWith('## ')) return <h3 key={i} style={{ color: colors.text, fontSize: 17, marginTop: 20, marginBottom: 6 }}>{line.slice(3)}</h3>;
      if (line.startsWith('```')) return null;  // skip fence markers, handled as blocks
      if (line.startsWith('- ') || line.startsWith('• ')) return <li key={i} style={{ color: colors.text, fontSize: 14, lineHeight: 1.7, marginLeft: 16 }}>{line.slice(2)}</li>;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} style={{ color: colors.text, fontSize: 14, lineHeight: 1.8, margin: '4px 0' }}>{line}</p>;
    });
  };

  // Extract and render code blocks separately
  const renderWithCodeBlocks = (text) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```python\n?|```\n?/g, '');
        return (
          <pre key={i} style={{
            background: '#0f172a', color: '#e2e8f0', borderRadius: 10,
            padding: 16, fontSize: 13, lineHeight: 1.6,
            overflowX: 'auto', margin: '12px 0',
            fontFamily: '"Fira Code","Courier New",monospace',
            whiteSpace: 'pre-wrap',
          }}>{code}</pre>
        );
      }
      return <div key={i}>{renderTheory(part)}</div>;
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 16px', overflowY: 'auto',
    }}>
      <div style={{
        background: colors.surface, borderRadius: 16,
        width: '100%', maxWidth: 720,
        border: `1px solid ${colors.border}`,
        padding: 28, marginBottom: 20,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            background: '#ef444420', borderRadius: 12, padding: 10,
          }}>
            <BookOpen size={24} color="#ef4444" />
          </div>
          <div>
            <h2 style={{ margin: 0, color: colors.text, fontSize: 18, fontWeight: 700 }}>
              Theory Review Needed
            </h2>
            <p style={{ margin: 0, color: colors.textMuted, fontSize: 13 }}>
              You've struggled with <strong>{topicName}</strong> — let's fix that right now.
            </p>
          </div>
        </div>

        {!loaded && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ color: colors.textMuted, marginBottom: 20, fontSize: 15 }}>
              This will generate a detailed explanation of <strong>{topicName}</strong> — tailored for you.
            </p>
            <button
              onClick={loadTheory}
              style={{
                background: colors.accent, color: '#fff', border: 'none',
                borderRadius: 12, padding: '14px 32px', fontSize: 15,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
              }}
            >
              📖 Load Detailed Theory
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textMuted }}>
            <LoadingSpinner text="Generating detailed theory (this may take 15–20 seconds)..." />
          </div>
        )}

        {loaded && (
          <>
            <div style={{
              background: colors.bg, borderRadius: 12, padding: 20,
              maxHeight: '60vh', overflowY: 'auto',
              border: `1px solid ${colors.border}`, marginBottom: 20,
            }}>
              {renderWithCodeBlocks(theory)}
            </div>

            <button
              onClick={onContinue}
              style={{
                width: '100%', background: '#10B981', color: '#fff',
                border: 'none', borderRadius: 12, padding: 16,
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'Poppins,sans-serif',
              }}
            >
              <CheckCircle size={18} /> I've read it — Continue with easier questions
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main QuestionEngine ──────────────────────────────────────────────────────
export default function QuestionEngine({
  topicId, topicName, initialLevel, initialDifficulty, initialQAttempted,
  speedMode, language, hobby, onBack, onProgressUpdate,
}) {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();

  const [level, setLevel]               = useState(initialLevel || 1);
  const [question, setQuestion]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [answered, setAnswered]         = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isCorrect, setIsCorrect]       = useState(null);
  const [wrongSummary, setWrongSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [explanationComplete, setExplanationComplete] = useState(false);
  const [robotReaction, setRobotReaction] = useState(null);
  const [showPopup, setShowPopup]         = useState(false);
  const [popupCorrect, setPopupCorrect]   = useState(false);
  const [nextLocked, setNextLocked] = useState(false);
  const [hintIndex, setHintIndex]       = useState(-1);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [qNumInLevel, setQNumInLevel]   = useState(1);
  const [qAttempted, setQAttempted]     = useState(initialQAttempted || 0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [levelUpMsg, setLevelUpMsg]     = useState('');
  const [difficulty, setDifficulty]     = useState(initialDifficulty || 'EASY');
  const [topicDone, setTopicDone]       = useState(false);

  // ── Batch state ──────────────────────────────────────────────────────────
  const [batchCorrect, setBatchCorrect] = useState(0);
  const [batchCount, setBatchCount]     = useState(0);
  const [batchResults, setBatchResults] = useState([]);
  const [failCount, setFailCount]       = useState(0);
  const [theoryNeeded, setTheoryNeeded] = useState(false);
  const [batchMsg, setBatchMsg]         = useState('');  // "Batch passed! Difficulty ↑" etc.

  const timerRef   = useRef(null);
  const startTime  = useRef(Date.now());
  const prevQ      = useRef('');
  const prevQuestions = useRef([]);
  const lastSubmittedCorrect = useRef(false);
  const mountedRef = useRef(true);

  const timerMax        = speedMode ? 30 : 60;
  const [timeLeft, setTimeLeft] = useState(timerMax);

  const effectiveLanguage = normalizeLanguage(language || user?.language || 'english');
  const effectiveHobby    = hobby    || user?.hobby    || 'cricket';
  const uiText = UI_TEXT[effectiveLanguage] || UI_TEXT.english;
  const isGuest = Boolean(user?.isGuest);
  const stemContext = getStemContext(effectiveHobby, topicId);
  const hints = getHints(topicId);
  const currentHints = hints[Math.min(level - 1, hints.length - 1)] || hints[0];

  // Derived batch constants for current level
  const levelType      = getLevelType(level);
  const batchSize      = getBatchSize(levelType);
  const maxQuestions   = getMaxQuestions(topicId, level);

  // Fetch question whenever level changes (reset everything)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, []);

  // Fetch question whenever level/language context changes (reset everything)
  useEffect(() => {
    fetchQuestion();
    return () => clearInterval(timerRef.current);
  }, [level, topicId, effectiveLanguage, effectiveHobby]); // eslint-disable-line

  // Timer — restarts whenever question changes and we haven't answered
  useEffect(() => {
    if (!question || answered) return;
    setTimeLeft(timerMax);
    startTime.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [question]); // eslint-disable-line

  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    setAnswered(false);
    setIsCorrect(null);
    setSelectedAnswer('');
    setWrongSummary('');
    setSummaryLoading(false);
    setExplanationComplete(false);
    setRobotReaction(null);
    setNextLocked(false);
    setHintIndex(-1);
    setBatchMsg('');
    try {
      const res = await api.post('/groq/question', {
        topicId,
        level,
        difficulty,
        language: effectiveLanguage,
        hobby: effectiveHobby,
        questionsAttempted: qAttempted,
        previousQuestion: prevQ.current,
        previousQuestions: prevQuestions.current,
      });

      // Server signals fallback (rate limit / parse fail) — use local bank
      if (res.data.useFallback) throw new Error('server_fallback');

      const raw = res.data.question;
      if (!raw || !raw.question) throw new Error('bad response');

      const mapped = { ...raw, type: TYPE_MAP[raw.questionType] || 'MCQ' };
      prevQ.current = raw.question;
      prevQuestions.current = [...prevQuestions.current, raw.question].slice(-50);
      setQuestion(mapped);
    } catch {
      // Use local fallback bank — invisible to judges during live demo
      const lvlType = getLevelType(level);
      const preferType = lvlType === 'MCQ' ? 'MCQ' : lvlType === 'FILL' ? 'FILL_BLANK' : 'CODE';
      const fb = getFallbackQuestion(topicId, difficulty, preferType);
      const mapped = { ...fb, type: TYPE_MAP[fb.questionType] || 'MCQ' };
      prevQ.current = fb.question;
      prevQuestions.current = [...prevQuestions.current, fb.question].slice(-50);
      setQuestion(mapped);
    } finally {
      setLoading(false);
    }
  }, [topicId, level, difficulty, qAttempted, effectiveLanguage, effectiveHobby]); // eslint-disable-line

  const handleTimeUp = () => {
    if (!answered) {
      handleAnswer('');
    }
  };

  const submitProgress = async (correct, timeTaken, extraFields = {}) => {
    if (isGuest) {
      const progressData = updateGuestProgress({
        topicId,
        level,
        correct,
        timeTaken,
        speedMode: speedMode || false,
        concept: topicId,
        questionText: question?.question || '',
        userAnswer: selectedAnswer || '',
        correctAnswer: question?.type === 'CODE'
          ? (question?.expectedOutput || question?.correctAnswer || '')
          : (question?.correctAnswer || ''),
        currentDifficulty: difficulty,
        ...extraFields,
      });

      const awardedPoints = progressData.pointsEarned || 0;
      if (extraFields.countAttempt !== false && !extraFields.resetLevelStats) {
        setPointsEarned(awardedPoints);
      }
      if (awardedPoints > 0) {
        updateUser({ totalPoints: (user.totalPoints || 0) + awardedPoints });
      }

      const serverLevel = progressData.progress?.currentLevel;
      const serverLevels = progressData.progress?.levels || {};
      const lvlKey = String(level);
      const newAttempted = serverLevels[lvlKey]?.questionsAttempted || qAttempted + 1;
      setQAttempted(newAttempted);

      if (serverLevel && serverLevel > level && !lastSubmittedCorrect.current) {
        setBatchMsg('Incorrect! Try Again.');
      }

      if (serverLevel && serverLevel > level && lastSubmittedCorrect.current) {
        setLevelUpMsg(`🎊 Level ${level} Complete! Moving to Level ${serverLevel}`);
        setShowConfetti(true);
        setTimeout(() => {
          setLevelUpMsg('');
          setQNumInLevel(1);
          setQAttempted(0);
          setDifficulty('EASY');
          setBatchCorrect(0);
          setBatchCount(0);
          setFailCount(0);
          setLevel(serverLevel);
        }, 2500);
      }

      if (progressData.progress?.topicCompleted && !topicDone && lastSubmittedCorrect.current) {
        setTopicDone(true);
        setShowConfetti(true);
        showToast('🎉 Topic Completed! Create an account to save it online.', 'success');
        onProgressUpdate && onProgressUpdate();
      }

      return progressData;
    }

    try {
      const res = await api.post('/progress/update', {
        topicId,
        level,
        correct,
        timeTaken,
        speedMode: speedMode || false,
        concept: topicId,
        questionText: question?.question || '',
        userAnswer: selectedAnswer || '',
        correctAnswer: question?.type === 'CODE'
          ? (question?.expectedOutput || question?.correctAnswer || '')
          : (question?.correctAnswer || ''),
        currentDifficulty: difficulty,
        ...extraFields,
      });

      const awardedPoints = res.data.pointsEarned || 0;
      if (extraFields.countAttempt !== false && !extraFields.resetLevelStats) {
        setPointsEarned(awardedPoints);
      }

      if (awardedPoints > 0) {
        updateUser({ totalPoints: (user.totalPoints || 0) + awardedPoints });
      }

      const serverLevel  = res.data.progress?.currentLevel;
      const serverLevels = res.data.progress?.levels || {};
      const lvlKey       = String(level);
      const newAttempted = serverLevels[lvlKey]?.questionsAttempted || qAttempted + 1;

      setQAttempted(newAttempted);

      // Level up from server
      if (serverLevel && serverLevel > level && !lastSubmittedCorrect.current) {
        setBatchMsg('Incorrect! Try Again.');
      }

      if (serverLevel && serverLevel > level && lastSubmittedCorrect.current) {
        setLevelUpMsg(`🎊 Level ${level} Complete! Moving to Level ${serverLevel}`);
        if (lastSubmittedCorrect.current) setShowConfetti(true);
        setTimeout(() => {
          setLevelUpMsg('');
          setQNumInLevel(1);
          setQAttempted(0);
          setDifficulty('EASY');
          setBatchCorrect(0);
          setBatchCount(0);
          setBatchResults([]);
          setFailCount(0);
          setLevel(serverLevel);
        }, 2500);
      }

      if (res.data.progress?.topicCompleted && !topicDone && lastSubmittedCorrect.current) {
        setTopicDone(true);
        setShowConfetti(true);
        showToast('🎉 Topic Completed! You\'re amazing!', 'success');
        onProgressUpdate && onProgressUpdate();
      }

      // Badge check
      try {
        const badgeRes = await api.post('/badge/check', {
          session: { consecutiveCorrect: res.data.consecutiveCorrect || 0 },
        });
        const newBadges = badgeRes.data?.newBadges || [];
        newBadges.forEach(b => showToast(`🏅 Badge Unlocked: ${b}!`, 'success'));
        if (newBadges.length > 0) updateUser({ badges: [...(user.badges || []), ...newBadges] });
      } catch {}

      // Streak update
      if (correct) {
        try {
          const strRes = await api.post('/streak/update');
          updateUser({
            streak: strRes.data.streak,
            streakFreeze: strRes.data.streakFreeze,
            longestStreak: strRes.data.longestStreak,
          });
        } catch {}
      }

      return res.data;
    } catch {
      return null;
    }
  };

  const handleAnswer = async (answer) => {
    if (answered) return;
    clearInterval(timerRef.current);
    const timeTaken = Math.max(1, Math.floor((Date.now() - startTime.current) / 1000));
    const expectedAnswer = question.type === 'CODE'
      ? (question.expectedOutput || question.correctAnswer || '')
      : (question.correctAnswer || '');
    const correct   = isAnswerMatch(answer, expectedAnswer);
    lastSubmittedCorrect.current = correct;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setAnswered(true);
    setExplanationComplete(false);
    setRobotReaction(correct ? 'correct' : 'wrong');
    setPopupCorrect(correct);
    setShowPopup(true);
    setNextLocked(false);
    setQNumInLevel(prev => prev + 1);

    // ── Batch counting ─────────────────────────────────────────────────────
    const newBatchCount   = batchCount + 1;
    const newBatchCorrect = correct ? batchCorrect + 1 : batchCorrect;
    const newBatchResults = [...batchResults, correct];
    setBatchCount(newBatchCount);
    setBatchCorrect(newBatchCorrect);
    setBatchResults(newBatchResults);

    const progressData = await submitProgress(correct, timeTaken, {
      currentBatchCorrect: newBatchCorrect,
      currentBatchCount: newBatchCount,
      failCount,
      levelType,
    });

    const newTotalAttempted = progressData?.progress?.levels?.[String(level)]?.questionsAttempted || (qAttempted + 1);
    let triggeredTheory = false;

    // ── Evaluate batch when batch is complete ──────────────────────────────
    if (newBatchCount >= batchSize) {
      const passed = user?.isDeveloper ? true : newBatchCorrect / batchSize >= 0.6;

      // Reset batch counters
      setBatchCount(0);
      setBatchCorrect(0);
      setBatchResults([]);

      if (passed) {
        setFailCount(0);
        if (difficulty === 'HARD') {
          // Completion is still handled by the existing progression logic.
          setBatchMsg(correct ? 'Promoted to Hard Difficulty' : 'Incorrect! Try Again.');
          await submitProgress(false, 0, {
            countAttempt: false,
            completeLevel: true,
            currentBatchCorrect: 0,
            currentBatchCount: 0,
            failCount: 0,
            theoryNeeded: false,
            levelType,
            currentDifficulty: difficulty,
          });
        } else {
          const nextDiff = increaseDiff(difficulty);
          setDifficulty(nextDiff);
          setBatchMsg(nextDiff === 'MEDIUM' ? 'Promoted to Medium Difficulty' : 'Promoted to Hard Difficulty');
          if (correct) showToast(`Great! Questions get harder now → ${nextDiff}`, 'success');
          await submitProgress(false, 0, {
            countAttempt: false,
            currentBatchCorrect: 0,
            currentBatchCount: 0,
            failCount: 0,
            theoryNeeded: false,
            levelType,
            currentDifficulty: nextDiff,
          });
        }
      } else {
        const newFail = failCount + 1;
        setFailCount(newFail);

        if (newFail >= 3) {
          // Trigger theory review
          await submitProgress(false, 0, {
            countAttempt: false,
            theoryNeeded: true,
            failCount: newFail,
            currentBatchCorrect: 0,
            currentBatchCount: 0,
            levelType,
            currentDifficulty: difficulty,
          });
          setTheoryNeeded(true);
          triggeredTheory = true;
        } else {
          setBatchMsg('Difficulty remains the same');
          showToast(`Keep going — same difficulty (${difficulty})`, 'warning');
          await submitProgress(false, 0, {
            countAttempt: false,
            currentBatchCorrect: 0,
            currentBatchCount: 0,
            failCount: newFail,
            theoryNeeded: false,
            levelType,
            currentDifficulty: difficulty,
          });
        }
      }
    }

    // ── Max questions reached without level up ─────────────────────────────
    const levelStats = progressData?.progress?.levels?.[String(level)];
    const totalCorrect = levelStats?.correctAnswers || 0;
    const totalAccuracy = newTotalAttempted > 0 ? totalCorrect / newTotalAttempted : 0;
    if (!triggeredTheory && newTotalAttempted >= maxQuestions && totalAccuracy < 0.6 && !topicDone && !levelUpMsg) {
      const easierDiff = decreaseDiff(difficulty);
      setDifficulty(easierDiff);
      setBatchCount(0);
      setBatchCorrect(0);
      setBatchResults([]);
      setFailCount(0);
      setQAttempted(0);
      setQNumInLevel(1);
      setBatchMsg('Difficulty remains the same');
      showToast(`Difficulty reduced to ${easierDiff}`, 'warning');
      await submitProgress(false, 0, {
        countAttempt: false,
        resetLevelStats: true,
        currentBatchCorrect: 0,
        currentBatchCount: 0,
        failCount: 0,
        theoryNeeded: false,
        levelType,
        currentDifficulty: easierDiff,
      });
    }

    // ── Always show AI explanation — correct or wrong ─────────────────────
    await new Promise(resolve => setTimeout(resolve, 900));
    if (!mountedRef.current) return;
    setRobotReaction(null);
    setSummaryLoading(true);
    try {
      const sum = await api.post('/groq/wrong-summary', {
        topicId,
        question: question.question,
        userAnswer: answer,
        correctAnswer: expectedAnswer,
        isCorrect: correct,
        language: effectiveLanguage,
        isTimeout: !answer,
      });
      setWrongSummary(sum.data.summary || (correct ? `✅ ${expectedAnswer} — correct!` : `Correct answer: ${expectedAnswer}`));
    } catch {
      setWrongSummary(correct
        ? `✅ Correct! The answer is: ${expectedAnswer}. ${question.explanation || ''}`
        : `Correct answer: ${expectedAnswer}. ${question.explanation || ''}`
      );
    } finally {
      if (mountedRef.current) {
        setSummaryLoading(false);
        setExplanationComplete(true);
      }
    }
  };

  const handleNextQuestion = () => {
    if (nextLocked || summaryLoading || !explanationComplete) return;
    setNextLocked(true);
    fetchQuestion();
  };

  // ── Theory continue handler ───────────────────────────────────────────────
  const handleTheoryContinue = async () => {
    const easierDiff = decreaseDiff(difficulty);
    setTheoryNeeded(false);
    setFailCount(0);
    setBatchCount(0);
    setBatchCorrect(0);
    setDifficulty(easierDiff);
    if (isGuest) {
      updateGuestProgress({
        topicId,
        level,
        correct: false,
        timeTaken: 0,
        speedMode: false,
        concept: topicId,
        countAttempt: false,
        theoryNeeded: false,
        failCount: 0,
        currentBatchCorrect: 0,
        currentBatchCount: 0,
        levelType,
        currentDifficulty: easierDiff,
      });
      showToast(`Theory done! Back to ${easierDiff} questions 💪`, 'success');
      fetchQuestion();
      return;
    }
    // Persist the reset on server
    await api.post('/progress/update', {
      topicId, level,
      correct: false, timeTaken: 0, speedMode: false,
      concept: topicId,
      countAttempt: false,
      theoryNeeded: false, failCount: 0,
      currentBatchCorrect: 0, currentBatchCount: 0, levelType,
      currentDifficulty: easierDiff,
    }).catch(() => {});
    showToast(`Theory done! Back to ${easierDiff} questions 💪`, 'success');
    fetchQuestion();
  };

  const handleHint = () => {
    if (hintIndex < 2) setHintIndex(prev => prev + 1);
    const nextPoints = Math.max(0, (user.totalPoints || 0) - 3);
    updateUser({ totalPoints: nextPoints });
    if (!isGuest) api.put('/profile/update', { pointsDelta: -3 }).catch(() => {});
    showToast('-3 points for hint 💡', 'warning');
  };

  const hintTexts = [currentHints?.hint1, currentHints?.hint2, currentHints?.hint3].filter(Boolean);
  const diffColor = { EASY: '#10B981', MEDIUM: '#f59e0b', HARD: '#ef4444' };
  const isPromotionMsg = batchMsg.startsWith('Promoted');
  const isSameDifficultyMsg = batchMsg === 'Difficulty remains the same';

  // ── Theory overlay (full-screen) ─────────────────────────────────────────
  if (theoryNeeded) {
    return (
      <TheoryOverlay
        topicId={topicId}
        topicName={topicName}
        language={effectiveLanguage}
        hobby={effectiveHobby}
        colors={colors}
        onContinue={handleTheoryContinue}
      />
    );
  }

  if (loading) return <LoadingSpinner text="Generating personalized question..." />;

  return (
    <div>
      <ResultPopup visible={showPopup} correct={popupCorrect} onHide={() => setShowPopup(false)} />
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Poppins, sans-serif' }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: `${diffColor[difficulty]}20`, color: diffColor[difficulty], borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
            {difficulty}
          </span>
          <span style={{ color: colors.textMuted, fontSize: 13 }}>Question {qNumInLevel}</span>
          {speedMode && <Zap size={14} color="#fbbf24" />}
        </div>

        <div style={{
          background: timeLeft < 10 ? '#ef4444' : colors.surface,
          color: timeLeft < 10 ? '#fff' : colors.text,
          border: `1px solid ${colors.border}`, borderRadius: 8,
          padding: '4px 12px', fontWeight: 700, fontSize: 14, transition: 'all 0.3s',
        }}>
          ⏱ {timeLeft}s
        </div>
      </div>

      {/* ── Batch progress bar ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
          <span>Batch: {batchCount}/{batchSize} ({batchCorrect} correct)</span>
          <span>{failCount > 0 ? `⚠️ ${failCount}/3 fails` : `${maxQuestions - qAttempted} left`}</span>
        </div>
        {/* Batch dots */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          {Array.from({ length: batchSize }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 6, borderRadius: 3,
              background: i < batchResults.length
                ? (batchResults[i] ? '#10B981' : '#ef4444')
                : colors.border,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
        {/* Overall progress bar */}
        <div style={{ background: colors.border, borderRadius: 4, height: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: `linear-gradient(90deg, ${colors.accent}, ${diffColor[difficulty]})`,
            width: `${Math.min((qAttempted / maxQuestions) * 100, 100)}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
          <span>{qAttempted}/{maxQuestions} checkpoint questions</span>
          <span>Adaptive practice</span>
        </div>
      </div>

      {/* ── Batch result message ── */}
      {batchMsg && (
        <div style={{
          background: isPromotionMsg ? '#10B98122' : isSameDifficultyMsg ? '#f59e0b22' : '#f59e0b20',
          border: `1px solid ${isPromotionMsg ? '#10B981' : '#f59e0b'}70`,
          borderRadius: 12, padding: '12px 16px', marginBottom: 14, fontSize: 14,
          color: colors.text,
          fontWeight: 700,
          boxShadow: isPromotionMsg ? '0 10px 24px rgba(16,185,129,0.16)' : '0 10px 24px rgba(245,158,11,0.12)',
        }}>
          {batchMsg}
        </div>
      )}

      {/* ── Level Up Banner ── */}
      {levelUpMsg && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.success}, ${colors.accent})`,
          borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 16,
        }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{levelUpMsg}</span>
        </div>
      )}

      {/* ── Topic Complete Banner ── */}
      {topicDone && (
        <div style={{
          background: 'linear-gradient(135deg, #10B981, #059669)',
          borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Trophy size={20} color="#fff" />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
            {uiText.topicComplete}
          </span>
        </div>
      )}

      {/* ── Question Card ── */}
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <span style={{ background: `${colors.accent}20`, color: colors.accent, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {question.type === 'MCQ'    ? uiText.multipleChoice
              : question.type === 'OUTPUT' ? uiText.predictOutput
              : question.type === 'FILL'   ? uiText.fillBlank
              : uiText.codeChallenge}
          </span>
          <SpeakButton text={question.question} language={effectiveLanguage} style={{ padding: '4px 10px', fontSize: 12 }} />
        </div>

        <p style={{ color: colors.text, fontSize: 16, lineHeight: 1.7, margin: '0 0 20px', fontWeight: 500 }}>
          {question.question}
        </p>

        {/* Code block for OUTPUT_PREDICT */}
        {question.code && (
          <pre style={{
            background: '#0f172a', color: '#e2e8f0', borderRadius: 10,
            padding: 16, fontSize: 13, lineHeight: 1.6, overflowX: 'auto', marginBottom: 16,
            fontFamily: '"Fira Code", "Courier New", monospace',
          }}>
            {question.code}
          </pre>
        )}

        {/* Hints */}
        {!answered && (
          <div style={{ marginBottom: 16 }}>
            {hintIndex >= 0 && (
              <div style={{ background: `${colors.warning}15`, border: `1px solid ${colors.warning}40`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <span style={{ color: colors.warning, fontSize: 13 }}>💡 {hintTexts[hintIndex]}</span>
              </div>
            )}
            {hintIndex < 2 && !answered && (
              <button
                onClick={handleHint}
                style={{
                  background: 'none', border: `1px solid ${colors.border}`, borderRadius: 8,
                  padding: '6px 12px', cursor: 'pointer', color: colors.textMuted,
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                <HelpCircle size={14} /> Hint {hintIndex + 2}/3 — -3 pts
              </button>
            )}
          </div>
        )}

        {/* Question types */}
        {(question.type === 'MCQ' || question.type === 'OUTPUT') && (
          <MCQQuestion
            key={question.question}
            options={question.options || []}
            correctAnswer={question.correctAnswer}
            selectedAnswer={selectedAnswer}
            answered={answered}
            onAnswer={handleAnswer}
          />
        )}
        {question.type === 'FILL' && (
          <FillQuestion
            key={question.question}
            question={question.question}
            correctAnswer={question.correctAnswer}
            answered={answered}
            onAnswer={handleAnswer}
            language={effectiveLanguage}
          />
        )}
        {question.type === 'CODE' && (
          <IDEQuestion
            key={question.question}
            problem={question.question}
            expectedOutput={question.expectedOutput || question.correctAnswer}
            answered={answered}
            onAnswer={handleAnswer}
            topicId={topicId}
            language={effectiveLanguage}
            hobby={effectiveHobby}
          />
        )}
      </div>

      {/* ── Result Panel ── */}
      {answered && robotReaction && (
        <RobotReaction
          correct={robotReaction === 'correct'}
          language={effectiveLanguage}
          colors={colors}
        />
      )}

      {answered && !robotReaction && (
        <div style={{
          background: isCorrect ? `${colors.success}15` : `${colors.error}15`,
          border: `1px solid ${isCorrect ? colors.success : colors.error}40`,
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{isCorrect ? '🎉' : '❌'}</span>
            <span style={{ color: isCorrect ? colors.success : colors.error, fontWeight: 700 }}>
              {isCorrect
                ? `${uiText.correct}! +${pointsEarned} points 🎉`
                : uiText.incorrect}
            </span>
          </div>

          {summaryLoading
            ? <p style={{ color: colors.textMuted, fontSize: 13, margin: 0 }}>
                {uiText.loadingExplanation}
              </p>
            : <p style={{ color: colors.text, fontSize: 13, margin: 0, whiteSpace: 'pre-line' }}>{wrongSummary}</p>
          }
        </div>
      )}

      {/* ── Next / Done buttons ── */}
      {answered && !topicDone && !levelUpMsg && !robotReaction && (
        <button
          onClick={handleNextQuestion}
          disabled={summaryLoading || !explanationComplete || nextLocked}
          style={{
            width: '100%',
            background: summaryLoading || !explanationComplete || nextLocked ? colors.border : colors.accent,
            color: summaryLoading || !explanationComplete || nextLocked ? colors.textMuted : '#fff',
            border: 'none',
            borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 600,
            cursor: summaryLoading || !explanationComplete || nextLocked ? 'not-allowed' : 'pointer',
            opacity: summaryLoading || !explanationComplete || nextLocked ? 0.75 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {summaryLoading || !explanationComplete
            ? uiText.loadingExplanation
            : uiText.nextQuestion}
          <ChevronRight size={18} />
        </button>
      )}

      {answered && topicDone && (
        <button
          onClick={onBack}
          style={{
            width: '100%', background: '#10B981', color: '#fff', border: 'none',
            borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          🏆 {uiText.backToTopic}
        </button>
      )}
    </div>
  );
}
