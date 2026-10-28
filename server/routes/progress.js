const express    = require('express')
const mongoose   = require('mongoose')
const Progress   = require('../models/Progress')
const User       = require('../models/User')
const protect    = require('../middleware/auth')
const { getNextDifficulty, calculatePoints } = require('../utils/adaptive')
const { CONCEPT_TAGS, LABELS, isValidTag, resolveTag, toKey, parseKey } = require('../constants/conceptTags')
const { updateMastery, getMasteryBand, snapshotAverage } = require('../utils/mastery')
const { analyzeGaps } = require('../utils/gapAnalyzer')
const topics = require('../constants/topics')

const router = express.Router()

// GET /api/progress/mastery — must stay above '/:userId'
router.get('/mastery', protect, async (req, res) => {
  try {
    const docs = await Progress.find({ userId: req.user._id })
    const concepts = []
    const byDay = {}
    let updatedAt = null
    for (const doc of docs) {
      if (doc.updatedAt && (!updatedAt || doc.updatedAt > updatedAt)) updatedAt = doc.updatedAt
      for (const m of doc.conceptMastery) {
        const parsed = parseKey(m.key)
        if (!parsed) continue
        concepts.push({
          key: m.key,
          topicId: parsed.topicId,
          tag: parsed.slug,
          label: LABELS[m.key] || m.key,
          score: m.score,
          band: getMasteryBand(m.score),
          attempts: m.attempts,
          correct: m.correct,
          lastSeen: m.lastSeen,
        })
      }
      for (const h of doc.masteryHistory) {
        (byDay[h.day] = byDay[h.day] || []).push(h.avg)
      }
    }
    concepts.sort((a, b) => a.score - b.score)
    const history = Object.keys(byDay).sort().slice(-60).map(day => ({
      day,
      avg: Math.round(byDay[day].reduce((a, b) => a + b, 0) / byDay[day].length),
    }))
    res.json({ concepts, history, updatedAt })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch mastery' })
  }
})

// GET /api/progress/gaps - must stay above '/:userId'
router.get('/gaps', protect, async (req, res) => {
  try {
    const progressDocs = await Progress.find({ userId: req.user._id }).lean()
    res.json(analyzeGaps({ progressDocs, topics }))
  } catch (err) {
    console.error('Gap analysis error:', err)
    res.status(500).json({ message: 'Failed to analyze gaps' })
  }
})

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
      concept, conceptTag, difficulty, questionText, userAnswer, correctAnswer, speedMode,
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

    // Per-concept mastery: every real answer, right or wrong
    const realAttempt = countAttempt && !resetLevelStats
    const tag = resolveTag(topicId, conceptTag)
    const key = toKey(topicId, tag)
    if (realAttempt) {
      updateMastery(progress.conceptMastery, key, { correct: !!correct, difficulty })
      const day = new Date().toISOString().slice(0, 10)
      const entry = { day, avg: snapshotAverage(progress.conceptMastery) }
      const history = progress.masteryHistory.filter(h => h.day !== day)
      history.push(entry)
      progress.masteryHistory = history.slice(-60)
      progress.markModified('conceptMastery')
      progress.markModified('masteryHistory')
    }

    // Track wrong answers
    if (countAttempt && !resetLevelStats && !correct && concept) {
      progress.wrongAnswers.push({
        concept,
        conceptTag: tag,
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
    // completeLevel flag â€” otherwise a client could call this repeatedly
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
      ...(realAttempt && (() => {
        const m = progress.conceptMastery.find(e => e.key === key)
        return { mastery: { key, score: m.score, band: getMasteryBand(m.score) } }
      })()),
    })

  } catch (err) {
    console.error('Progress update error:', err)
    res.status(500).json({ message: 'Failed to update progress' })
  }
})

// POST /api/progress/diagnostic - seeds mastery + start difficulty only (no points, streaks, badges or level changes)
router.post('/diagnostic', protect, async (req, res) => {
  try {
    const { topicId, answers } = req.body
    const topic = topics.find(t => t.topicId === topicId)
    if (!topic) return res.status(400).json({ message: 'Unknown topic' })
    if (!Array.isArray(answers) || answers.length < 1 || answers.length > 6) {
      return res.status(400).json({ message: 'answers must have 1-6 items' })
    }
    const allowed = [topicId, ...topic.prerequisites]
    if (answers.some(a => !a || !allowed.includes(a.topicId))) {
      return res.status(400).json({ message: 'Answer topic must be the topic or a direct prerequisite' })
    }

    const userId = req.user._id
    const docs = {}
    const getDoc = async (id) => {
      if (!docs[id]) docs[id] = (await Progress.findOne({ userId, topicId: id })) || new Progress({ userId, topicId: id })
      return docs[id]
    }

    const progress = await getDoc(topicId)
    if (progress.diagnostic && progress.diagnostic.done) {
      return res.json({ alreadyDone: true, diagnostic: progress.diagnostic })
    }

    const updatedKeys = new Map()
    let c = 0
    let n = 0
    for (const item of answers) {
      const correct = !!item.correct
      const difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(item.difficulty) ? item.difficulty : 'MEDIUM'
      const key = toKey(item.topicId, resolveTag(item.topicId, item.conceptTag))
      const doc = await getDoc(item.topicId)
      updateMastery(doc.conceptMastery, key, { correct, difficulty })
      updatedKeys.set(key, doc)
      if (item.topicId === topicId) {
        n += 1
        if (correct) c += 1
      }
    }

    const level1 = progress.levels['1']
    let placement = 'standard-start'
    if (n >= 3 && c / n >= 0.75 && !level1.questionsAttempted) {
      level1.currentDifficulty = 'MEDIUM'
      placement = 'medium-start'
    }
    progress.diagnostic = { done: true, at: new Date(), correct: c, total: n, placement }

    for (const doc of Object.values(docs)) {
      doc.updatedAt = new Date()
      doc.markModified('conceptMastery')
      doc.markModified('levels')
      await doc.save()
    }

    res.json({
      diagnostic: progress.diagnostic,
      placement,
      mastery: [...updatedKeys].map(([key, doc]) => {
        const m = doc.conceptMastery.find(e => e.key === key)
        return { key, score: m.score, band: getMasteryBand(m.score) }
      }),
    })
  } catch (err) {
    console.error('Diagnostic error:', err)
    res.status(500).json({ message: 'Failed to save diagnostic' })
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
          conceptTag: resolveTag(item.topicId, answer.conceptTag),
          level: Number(answer.level) || 1,
          timestamp: answer.timestamp || new Date(),
        }))
      }

      if (Array.isArray(item.conceptMastery)) {
        const merged = progress.conceptMastery.map(e => e.toObject ? e.toObject() : e)
        for (const m of item.conceptMastery) {
          const parsed = parseKey(m?.key)
          if (!parsed || !CONCEPT_TAGS[parsed.topicId] || !isValidTag(parsed.topicId, parsed.slug)) continue
          const attempts = Math.max(0, Math.floor(Number(m.attempts)) || 0)
          const clean = {
            key: m.key,
            score: Math.min(100, Math.max(0, Number(m.score) || 0)),
            attempts,
            correct: Math.min(attempts, Math.max(0, Math.floor(Number(m.correct)) || 0)),
            lastSeen: m.lastSeen && !isNaN(new Date(m.lastSeen)) ? new Date(m.lastSeen) : null,
          }
          const i = merged.findIndex(e => e.key === clean.key)
          if (i === -1) merged.push(clean)
          else if (clean.attempts > merged[i].attempts) merged[i] = clean
        }
        progress.conceptMastery = merged.slice(0, 80)
        progress.markModified('conceptMastery')
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
