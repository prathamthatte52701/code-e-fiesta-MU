const express    = require('express')
const mongoose   = require('mongoose')
const Progress   = require('../models/Progress')
const User       = require('../models/User')
const protect    = require('../middleware/auth')
const { getNextDifficulty, calculatePoints } = require('../utils/adaptive')

const router = express.Router()

// GET /api/progress/:userId
router.get('/:userId', protect, async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.params.userId })
    res.json(progress)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch progress' })
  }
})

// POST /api/progress/update
router.post('/update', protect, async (req, res) => {
  try {
    const {
      topicId, level, correct, timeTaken,
      concept, questionText, userAnswer, correctAnswer, speedMode,
      currentBatchCorrect, currentBatchCount, failCount, levelType, theoryNeeded,
      currentDifficulty, countAttempt = true, completeLevel = false, resetLevelStats = false,
    } = req.body

    const userId = req.user._id

    let progress = await Progress.findOne({ userId, topicId })
    if (!progress) {
      progress = new Progress({ userId, topicId })
    }

    const lvl = String(level)
    if (!progress.levels[lvl]) progress.levels[lvl] = {}

    const levelData = progress.levels[lvl]

    if (resetLevelStats) {
      levelData.questionsAttempted = 0
      levelData.correctAnswers = 0
      levelData.last3Answers = []
      levelData.last3Times = []
      levelData.currentBatchCorrect = 0
      levelData.currentBatchCount = 0
      levelData.failCount = 0
      levelData.theoryNeeded = false
    }

    // Update answers only for real question attempts. State-only adaptive updates
    // use countAttempt=false so theory/reset bookkeeping cannot add fake misses.
    let last3A = levelData.last3Answers || []
    let last3T = levelData.last3Times || []
    if (countAttempt && !resetLevelStats) {
      levelData.questionsAttempted = (levelData.questionsAttempted || 0) + 1
      if (correct) levelData.correctAnswers = (levelData.correctAnswers || 0) + 1

      // Track last 3 for fallback adaptive signals.
      last3A = [...last3A, correct].slice(-3)
      last3T = [...last3T, timeTaken].slice(-3)
      levelData.last3Answers = last3A
      levelData.last3Times   = last3T
    }

    // Persist batch tracking fields if provided by frontend
    if (currentBatchCorrect !== undefined) levelData.currentBatchCorrect = currentBatchCorrect
    if (currentBatchCount   !== undefined) levelData.currentBatchCount   = currentBatchCount
    if (failCount           !== undefined) levelData.failCount            = failCount
    if (levelType           !== undefined) levelData.levelType            = levelType
    if (theoryNeeded        !== undefined) levelData.theoryNeeded         = theoryNeeded

    // Speed mode used?
    if (speedMode) levelData.speedModeUsed = true

    // Update difficulty
    const timerLimit = speedMode ? 30 : 60
    levelData.currentDifficulty = currentDifficulty || getNextDifficulty(last3A, last3T, timerLimit)

    // Track consecutive correct for sharpshooter badge
    if (countAttempt && !resetLevelStats) {
      if (correct) {
        progress.consecutiveCorrect = (progress.consecutiveCorrect || 0) + 1
      } else {
        progress.consecutiveCorrect = 0
      }
    }

    // Track wrong answers
    if (countAttempt && !resetLevelStats && !correct && concept) {
      progress.wrongAnswers.push({
        concept,
        questionText: questionText || '',
        userAnswer: userAnswer || '',
        correctAnswer: correctAnswer || '',
        level,
        timestamp: new Date(),
      })
      // Keep max 50 wrong answers
      if (progress.wrongAnswers.length > 50) {
        progress.wrongAnswers = progress.wrongAnswers.slice(-50)
      }
    }

    const numLevel = Number(level)
    // Require real answered-question evidence before honoring a client-sent
    // completeLevel flag — otherwise a client could call this repeatedly
    // with completeLevel:true and no real answers to "master" a topic
    // instantly. questionsAttempted/correctAnswers only increment above via
    // the countAttempt-gated real-answer path, so this can't be faked by
    // just resending the same request.
    const hasRealLevelEvidence = (levelData.questionsAttempted || 0) >= 5
      && (levelData.correctAnswers || 0) / (levelData.questionsAttempted || 1) >= 0.5
    // Only check level-up if topic isn't already done and user is on this level
    if (!progress.topicCompleted && completeLevel && hasRealLevelEvidence && progress.currentLevel === numLevel) {
      levelData.completed = true
      if (numLevel < 5) {
        progress.currentLevel = numLevel + 1
      } else {
        progress.topicCompleted = true
        progress.completedAt    = new Date()
      }
    }

    progress.updatedAt = new Date()
    progress.markModified('levels')
    await progress.save()

    // Points
    const user   = await User.findById(userId)
    const points = countAttempt && !resetLevelStats ? calculatePoints({
      isCorrect: correct,
      timeTaken,
      level,
      streak: user.streak,
      speedMode: user.speedModeEnabled,
      timerLimit,
    }) : 0

    if (points > 0) {
      user.totalPoints  = (user.totalPoints || 0) + points
      user.weeklyPoints = (user.weeklyPoints || 0) + points
      user.dailyPoints  = (user.dailyPoints || 0) + points
      await user.save()
    }

    res.json({
      progress,
      pointsEarned: points,
      leveledUp: progress.currentLevel > level,
      topicCompleted: progress.topicCompleted,
      consecutiveCorrect: progress.consecutiveCorrect,
    })

  } catch (err) {
    console.error('Progress update error:', err)
    res.status(500).json({ message: 'Failed to update progress' })
  }
})

// POST /api/progress/migrate
router.post('/migrate', protect, async (req, res) => {
  try {
    const userId = req.user._id
    const guestProgress = Array.isArray(req.body.progress) ? req.body.progress : []
    const guestPoints = Math.max(0, Number(req.body.user?.totalPoints) || 0)
    let migrated = 0

    for (const item of guestProgress) {
      if (!item?.topicId) continue

      let progress = await Progress.findOne({ userId, topicId: item.topicId })
      const guestCurrentLevel = Math.min(Math.max(Number(item.currentLevel) || 1, 1), 5)
      const shouldMerge = !progress
        || item.topicCompleted
        || guestCurrentLevel > (progress.currentLevel || 1)

      if (!shouldMerge) continue
      if (!progress) progress = new Progress({ userId, topicId: item.topicId })

      progress.currentLevel = guestCurrentLevel
      progress.topicCompleted = Boolean(item.topicCompleted)
      progress.completedAt = item.completedAt || (item.topicCompleted ? new Date() : null)
      progress.firstBloodShown = Boolean(item.firstBloodShown)
      progress.aiChallengeUnlocked = Boolean(item.aiChallengeUnlocked)
      progress.aiChallengeCompleted = Boolean(item.aiChallengeCompleted)
      progress.aiChallengeScore = Number(item.aiChallengeScore) || 0
      progress.lastRevisionDate = item.lastRevisionDate || null
      progress.revisionDue = Boolean(item.revisionDue)
      progress.consecutiveCorrect = Number(item.consecutiveCorrect) || 0

      if (item.levels && typeof item.levels === 'object') {
        for (const level of ['1', '2', '3', '4', '5']) {
          if (item.levels[level]) {
            progress.levels[level] = {
              ...progress.levels[level]?.toObject?.(),
              ...item.levels[level],
            }
          }
        }
      }

      if (Array.isArray(item.wrongAnswers)) {
        progress.wrongAnswers = item.wrongAnswers.slice(-50).map(answer => ({
          concept: answer.concept || '',
          questionText: answer.questionText || '',
          userAnswer: answer.userAnswer || '',
          correctAnswer: answer.correctAnswer || '',
          level: Number(answer.level) || 1,
          timestamp: answer.timestamp || new Date(),
        }))
      }

      progress.updatedAt = new Date()
      progress.markModified('levels')
      await progress.save()
      migrated += 1
    }

    if (guestPoints > 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: {
          totalPoints: guestPoints,
          weeklyPoints: guestPoints,
          dailyPoints: guestPoints,
        },
      })
    }

    res.json({ migrated, migratedPoints: guestPoints })
  } catch (err) {
    console.error('Guest progress migration error:', err)
    res.status(500).json({ message: 'Failed to migrate guest progress' })
  }
})

// GET /api/progress/:userId/weak-spots
router.get('/:userId/weak-spots', protect, async (req, res) => {
  try {
    const weakSpots = await Progress.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.params.userId) } },
      { $unwind: '$wrongAnswers' },
      {
        $group: {
          _id: '$wrongAnswers.concept',
          count: { $sum: 1 },
          lastAttempted: { $max: '$wrongAnswers.timestamp' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ])
    res.json({ weakSpots })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch weak spots' })
  }
})

// GET /api/progress/:userId/revision
router.get('/:userId/revision', protect, async (req, res) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const topics = await Progress.find({
      userId: req.params.userId,
      topicCompleted: true,
      completedAt: { $lt: threeDaysAgo },
      $or: [
        { lastRevisionDate: { $lt: threeDaysAgo } },
        { lastRevisionDate: null },
      ],
    })
    res.json({ topics })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch revision topics' })
  }
})

module.exports = router
