require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const User = require('../models/User')
const Progress = require('../models/Progress')
const { parseKey, isValidTag } = require('../constants/conceptTags')

const DEMO_EMAIL = 'demo@stembhasha.com'
const DEMO_PASSWORD = 'Demo@1234'

// Demo gap story: Variables solid, Data Types fine, Conditions weak (root cause), Loops weak.
// [key, score, attempts, correct]
const MASTERY = {
  variables: [
    ['variables/assignment', 92, 10, 9],
    ['variables/swap-unpack', 85, 8, 7],
    ['variables/naming-rules', 88, 6, 5],
  ],
  'data-types': [
    ['data-types/int-float', 78, 8, 6],
    ['data-types/type-conversion', 66, 6, 4],
    ['data-types/str', 72, 5, 4],
  ],
  conditions: [
    ['conditions/if-else', 32, 6, 2],
    ['conditions/elif-chain', 28, 5, 1],
    ['conditions/logical-ops', 41, 5, 2],
  ],
  loops: [
    ['loops/for-range', 30, 4, 1],
    ['loops/while', 45, 4, 2],
  ],
}

// Fail fast if the story uses a tag the app does not know
for (const rows of Object.values(MASTERY)) {
  for (const [key] of rows) {
    const parsed = parseKey(key)
    if (!parsed || !isValidTag(parsed.topicId, parsed.slug)) throw new Error(`Invalid concept key in seed: ${key}`)
  }
}

const levelData = (completed = false, type = 'MCQ') => ({
  completed,
  questionsAttempted: completed ? 5 : 0,
  correctAnswers: completed ? 5 : 0,
  currentDifficulty: completed ? 'HARD' : 'EASY',
  last3Answers: completed ? [true, true, true] : [],
  last3Times: completed ? [12, 10, 9] : [],
  speedModeUsed: false,
  currentBatchCorrect: 0,
  currentBatchCount: 0,
  failCount: 0,
  levelType: type,
  theoryNeeded: false,
})

// Spread a topic's totals over levels 1..currentLevel (lower levels completed) so level accuracy matches the concepts
const levelsFor = (topicId, currentLevel) => {
  const att = MASTERY[topicId].reduce((s, r) => s + r[2], 0)
  const cor = MASTERY[topicId].reduce((s, r) => s + r[3], 0)
  const types = ['MCQ', 'MCQ', 'FILL', 'FILL', 'IDE']
  const levels = {}
  for (let l = 1; l <= 5; l++) {
    if (l > currentLevel) { levels[l] = levelData(false, types[l - 1]); continue }
    const share = (total) => Math.floor(total / currentLevel) + (l === 1 ? total % currentLevel : 0)
    levels[l] = {
      ...levelData(false, types[l - 1]),
      completed: l < currentLevel,
      questionsAttempted: share(att),
      correctAnswers: share(cor),
      currentDifficulty: topicId === 'variables' || l < currentLevel ? 'MEDIUM' : 'EASY',
    }
  }
  return levels
}

const conceptMastery = (topicId) => MASTERY[topicId].map(([key, score, attempts, correct]) => ({
  key, score, attempts, correct, lastSeen: new Date(),
}))

const wrong = (concept, conceptTag, questionText, userAnswer, correctAnswer, level, daysAgo) => ({
  concept, conceptTag, questionText, userAnswer, correctAnswer, level,
  timestamp: new Date(Date.now() - daysAgo * 86400000),
})

// 14 daily points ending today (UTC): starts ~45, dips around day 8, climbs to ~58
const TREND = [45, 46, 47, 46, 45, 44, 42, 41, 43, 47, 50, 53, 56, 58]
const masteryHistory = TREND.map((avg, i) => ({
  day: new Date(Date.now() - (TREND.length - 1 - i) * 86400000).toISOString().slice(0, 10),
  avg,
}))

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing')
  await mongoose.connect(process.env.MONGODB_URI)

  const old = await User.findOne({ email: DEMO_EMAIL })
  if (old) await Progress.deleteMany({ userId: old._id })
  await User.deleteOne({ email: DEMO_EMAIL })

  const user = await User.create({
    name: 'Demo User',
    email: DEMO_EMAIL,
    password: await bcrypt.hash(DEMO_PASSWORD, 12),
    onboardingComplete: true,
    hobby: 'cricket',
    language: 'english',
    streak: 7,
    longestStreak: 7,
    totalPoints: 2500,
    weeklyPoints: 2500,
    dailyPoints: 2500,
    badges: ['first_step', 'on_fire', 'week_warrior'],
    speedModeEnabled: false,
  })

  const base = { userId: user._id, updatedAt: new Date() }

  await Progress.create({
    ...base,
    topicId: 'variables',
    currentLevel: 5,
    levels: {
      1: levelData(true, 'MCQ'),
      2: levelData(true, 'MCQ'),
      3: levelData(true, 'FILL'),
      4: levelData(true, 'FILL'),
      5: levelData(true, 'IDE'),
    },
    topicCompleted: true,
    completedAt: new Date(),
    aiChallengeUnlocked: true,
    aiChallengeCompleted: false,
    aiChallengeScore: 0,
    wrongAnswers: [
      wrong('Swapping values', 'swap-unpack', 'What are a and b after a, b = b, a?', 'a stays the same', 'values are swapped', 2, 12),
    ],
    conceptMastery: conceptMastery('variables'),
    consecutiveCorrect: 10,
  })

  await Progress.create({
    ...base,
    topicId: 'data-types',
    currentLevel: 3,
    levels: levelsFor('data-types', 3),
    wrongAnswers: [
      wrong('Type conversion', 'type-conversion', 'What is int("7") + 2?', '72', '9', 2, 6),
      wrong('int and float', 'int-float', 'What is the type of 3 / 2?', 'int', 'float', 1, 5),
    ],
    conceptMastery: conceptMastery('data-types'),
    masteryHistory,
  })

  await Progress.create({
    ...base,
    topicId: 'conditions',
    currentLevel: 2,
    levels: levelsFor('conditions', 2),
    wrongAnswers: [
      wrong('if / else', 'if-else', 'Which branch runs when score = 40 and the check is score >= 50?', 'if branch', 'else branch', 1, 4),
      wrong('elif chains', 'elif-chain', 'In an if/elif/else chain, how many branches can run?', 'all true ones', 'only the first true one', 1, 3),
      wrong('and / or / not', 'logical-ops', 'What is True and False?', 'True', 'False', 2, 2),
      wrong('if / else', 'if-else', 'What does if x = 5 do?', 'compares x to 5', 'SyntaxError (use ==)', 2, 1),
    ],
    conceptMastery: conceptMastery('conditions'),
  })

  await Progress.create({
    ...base,
    topicId: 'loops',
    currentLevel: 1,
    levels: levelsFor('loops', 1),
    wrongAnswers: [
      wrong('for loops with range()', 'for-range', 'How many times does for i in range(3) run?', '4', '3', 1, 2),
      wrong('while loops', 'while', 'What happens if a while condition never becomes False?', 'it stops', 'infinite loop', 1, 1),
    ],
    conceptMastery: conceptMastery('loops'),
  })

  console.log(JSON.stringify({ demoEmail: DEMO_EMAIL, users: await User.countDocuments(), progress: await Progress.countDocuments() }, null, 2))
  await mongoose.disconnect()
}

run().catch(async err => {
  console.error(err.message)
  try { await mongoose.disconnect() } catch {}
  process.exit(1)
})
