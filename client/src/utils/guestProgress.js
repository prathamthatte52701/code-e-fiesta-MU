import { getStoredLanguage, setStoredLanguage, normalizeLanguage } from './i18n'
import { resolveTag, toKey } from './conceptTags'
import { updateMastery } from './mastery'

export const GUEST_USER_ID = 'guest'
export const GUEST_MODE_KEY = 'stemlearn:guestMode'
export const GUEST_USER_KEY = 'stemlearn:guestUser'
export const GUEST_PROGRESS_KEY = 'stemlearn:guestProgress'
export const GUEST_PRACTICE_LIMIT_PER_TOPIC = 8

const LEVELS = [1, 2, 3, 4, 5]

const createLevelData = () => ({
  completed: false,
  questionsAttempted: 0,
  correctAnswers: 0,
  currentDifficulty: 'EASY',
  last3Answers: [],
  last3Times: [],
  speedModeUsed: false,
  currentBatchCorrect: 0,
  currentBatchCount: 0,
  failCount: 0,
  levelType: 'MCQ',
  theoryNeeded: false,
})

export const createGuestUser = (overrides = {}) => {
  const language = normalizeLanguage(overrides.language || getStoredLanguage())
  return {
    _id: GUEST_USER_ID,
    id: GUEST_USER_ID,
    name: 'Guest Learner',
    email: '',
    hobby: overrides.hobby || 'cricket',
    language,
    onboardingComplete: true,
    streak: Number(overrides.streak) || 0,
    longestStreak: Number(overrides.longestStreak) || 0,
    streakFreeze: false,
    totalPoints: Number(overrides.totalPoints) || 0,
    weeklyPoints: 0,
    dailyPoints: 0,
    aiChallengePoints: 0,
    badges: [],
    speedModeEnabled: Boolean(overrides.speedModeEnabled),
    isGuest: true,
  }
}

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export const getGuestUser = () => {
  if (typeof window === 'undefined') return createGuestUser()
  const stored = safeParse(localStorage.getItem(GUEST_USER_KEY), null)
  return createGuestUser(stored || {})
}

export const saveGuestUser = (updates = {}) => {
  if (typeof window === 'undefined') return createGuestUser(updates)
  const user = createGuestUser({ ...getGuestUser(), ...updates })
  localStorage.setItem(GUEST_USER_KEY, JSON.stringify(user))
  localStorage.setItem(GUEST_MODE_KEY, 'true')
  setStoredLanguage(user.language, { emit: false })
  return user
}

export const isGuestModeEnabled = () =>
  typeof window !== 'undefined' && localStorage.getItem(GUEST_MODE_KEY) === 'true'

const createProgress = (topicId) => ({
  _id: `guest-${topicId}`,
  userId: GUEST_USER_ID,
  topicId,
  currentLevel: 1,
  levels: LEVELS.reduce((acc, level) => {
    acc[String(level)] = createLevelData()
    return acc
  }, {}),
  topicCompleted: false,
  completedAt: null,
  firstBloodShown: false,
  aiChallengeUnlocked: false,
  aiChallengeCompleted: false,
  aiChallengeScore: 0,
  wrongAnswers: [],
  lastRevisionDate: null,
  revisionDue: false,
  consecutiveCorrect: 0,
  updatedAt: new Date().toISOString(),
})

export const getGuestProgress = () => {
  if (typeof window === 'undefined') return []
  return safeParse(localStorage.getItem(GUEST_PROGRESS_KEY), [])
}

const saveGuestProgressList = (progressList) => {
  if (typeof window === 'undefined') return progressList
  localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progressList))
  return progressList
}

export const getGuestTopicProgress = (topicId) =>
  getGuestProgress().find(progress => progress.topicId === topicId) || createProgress(topicId)

export const getGuestTopicAttemptCount = (topicId) => {
  const progress = getGuestTopicProgress(topicId)
  return LEVELS.reduce((sum, level) => (
    sum + (progress.levels?.[String(level)]?.questionsAttempted || 0)
  ), 0)
}

const calculateGuestPoints = ({ isCorrect, timeTaken, level, speedMode, timerLimit }) => {
  if (!isCorrect) return 0
  const base = 10
  const speedBonus = timeTaken < timerLimit / 2 ? 5 : 0
  const levelBonus = Number(level) * 5
  return (base + speedBonus + levelBonus) * (speedMode ? 2 : 1)
}

const replaceTopicProgress = (nextProgress) => {
  const progressList = getGuestProgress()
  const index = progressList.findIndex(progress => progress.topicId === nextProgress.topicId)
  if (index >= 0) progressList[index] = nextProgress
  else progressList.push(nextProgress)
  saveGuestProgressList(progressList)
}

export const updateGuestProgress = (payload) => {
  const {
    topicId,
    level,
    correct,
    timeTaken = 0,
    concept,
    conceptTag,
    difficulty,
    questionText,
    userAnswer,
    correctAnswer,
    speedMode,
    currentBatchCorrect,
    currentBatchCount,
    failCount,
    levelType,
    theoryNeeded,
    currentDifficulty,
    countAttempt = true,
    completeLevel = false,
    resetLevelStats = false,
  } = payload

  const progress = getGuestTopicProgress(topicId)
  const lvl = String(level || progress.currentLevel || 1)
  if (!progress.levels[lvl]) progress.levels[lvl] = createLevelData()
  const levelData = progress.levels[lvl]

  if (resetLevelStats) Object.assign(levelData, createLevelData(), { currentDifficulty: currentDifficulty || 'EASY' })

  if (countAttempt && !resetLevelStats) {
    levelData.questionsAttempted = (levelData.questionsAttempted || 0) + 1
    if (correct) levelData.correctAnswers = (levelData.correctAnswers || 0) + 1
    levelData.last3Answers = [...(levelData.last3Answers || []), Boolean(correct)].slice(-3)
    levelData.last3Times = [...(levelData.last3Times || []), Number(timeTaken) || 0].slice(-3)
    progress.consecutiveCorrect = correct ? (progress.consecutiveCorrect || 0) + 1 : 0
    progress.conceptMastery = updateMastery(progress.conceptMastery || [], toKey(topicId, resolveTag(topicId, conceptTag)), { correct: Boolean(correct), difficulty })
  }

  if (currentBatchCorrect !== undefined) levelData.currentBatchCorrect = currentBatchCorrect
  if (currentBatchCount !== undefined) levelData.currentBatchCount = currentBatchCount
  if (failCount !== undefined) levelData.failCount = failCount
  if (levelType !== undefined) levelData.levelType = levelType
  if (theoryNeeded !== undefined) levelData.theoryNeeded = theoryNeeded
  if (speedMode) levelData.speedModeUsed = true
  if (currentDifficulty) levelData.currentDifficulty = currentDifficulty

  if (countAttempt && !resetLevelStats && !correct && concept) {
    progress.wrongAnswers = [
      ...(progress.wrongAnswers || []),
      { concept, conceptTag: resolveTag(topicId, conceptTag), questionText: questionText || '', userAnswer: userAnswer || '', correctAnswer: correctAnswer || '', level, timestamp: new Date().toISOString() },
    ].slice(-50)
  }

  const numericLevel = Number(level)
  if (!progress.topicCompleted && completeLevel && progress.currentLevel === numericLevel) {
    levelData.completed = true
    if (numericLevel < 5) progress.currentLevel = numericLevel + 1
    else {
      progress.topicCompleted = true
      progress.completedAt = new Date().toISOString()
    }
  }

  progress.updatedAt = new Date().toISOString()
  replaceTopicProgress(progress)

  const pointsEarned = countAttempt && !resetLevelStats
    ? calculateGuestPoints({ isCorrect: correct, timeTaken, level: numericLevel, speedMode, timerLimit: speedMode ? 30 : 60 })
    : 0

  const user = getGuestUser()
  if (pointsEarned > 0) {
    saveGuestUser({ totalPoints: (user.totalPoints || 0) + pointsEarned })
  }

  return {
    progress,
    pointsEarned,
    leveledUp: progress.currentLevel > numericLevel,
    topicCompleted: progress.topicCompleted,
    consecutiveCorrect: progress.consecutiveCorrect || 0,
  }
}

export const hasGuestProgress = () =>
  (getGuestUser().totalPoints || 0) > 0 || getGuestProgress().some(progress =>
    progress.topicCompleted || getGuestTopicAttemptCount(progress.topicId) > 0
  )

export const getGuestMigrationPayload = () => ({
  user: getGuestUser(),
  progress: getGuestProgress(),
})

export const clearGuestData = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(GUEST_MODE_KEY)
  localStorage.removeItem(GUEST_USER_KEY)
  localStorage.removeItem(GUEST_PROGRESS_KEY)
}
