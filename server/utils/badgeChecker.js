const User     = require('../models/User')
const Progress = require('../models/Progress')

const TOTAL_TOPICS = 10

const BADGES = {
  first_step: {
    id: 'first_step',
    check: (user, allProgress) =>
      allProgress.filter(p => p.topicCompleted).length >= 1,
  },
  on_fire: {
    id: 'on_fire',
    check: (user, allProgress) =>
      allProgress.filter(p => p.topicCompleted).length >= 3,
  },
  stem_master: {
    id: 'stem_master',
    check: (user, allProgress) =>
      allProgress.filter(p => p.topicCompleted).length === TOTAL_TOPICS,
  },
  speed_demon: {
    id: 'speed_demon',
    check: (user, allProgress) =>
      allProgress.filter(p => p.topicCompleted && p.levels?.[5]?.speedModeUsed).length >= 5,
  },
  week_warrior: {
    id: 'week_warrior',
    check: (user) => user.streak >= 7,
  },
  consistent: {
    id: 'consistent',
    check: (user) => user.streak >= 14,
  },
  unstoppable: {
    id: 'unstoppable',
    check: (user) => user.streak >= 30,
  },
  sharpshooter: {
    id: 'sharpshooter',
    // Use the server-tracked Progress.consecutiveCorrect (updated only by
    // real answer submissions in routes/progress.js) instead of trusting a
    // client-supplied session.consecutiveCorrect value, which let anyone
    // fake a streak with a single POST /api/badge/check call.
    check: (user, allProgress) =>
      allProgress.some(p => (p.consecutiveCorrect || 0) >= 10),
  },
  level_up: {
    id: 'level_up',
    check: (user, allProgress) =>
      allProgress.some(p => p.currentLevel === 5),
  },
  perfectionist: {
    id: 'perfectionist',
    check: (user, allProgress) =>
      allProgress.some(p => {
        for (let l = 1; l <= 5; l++) {
          const level = p.levels?.[l]
          if (level && level.questionsAttempted >= 5 &&
              level.correctAnswers === level.questionsAttempted) return true
        }
        return false
      }),
  },
  ai_slayer: {
    id: 'ai_slayer',
    check: (user, allProgress) =>
      allProgress.some(p => p.aiChallengeCompleted),
  },
  challenge_champion: {
    id: 'challenge_champion',
    check: (user, allProgress) =>
      allProgress.filter(p => p.aiChallengeCompleted).length === TOTAL_TOPICS,
  },
}

const checkAndAwardBadges = async (userId, session = {}) => {
  const [user, allProgress] = await Promise.all([
    User.findById(userId),
    Progress.find({ userId }),
  ])

  const newBadges = []
  for (const badge of Object.values(BADGES)) {
    if (!user.badges.includes(badge.id)) {
      if (badge.check(user, allProgress, session)) {
        user.badges.push(badge.id)
        newBadges.push(badge.id)
      }
    }
  }

  if (newBadges.length > 0) await user.save()
  return newBadges
}

module.exports = { checkAndAwardBadges, BADGES }
