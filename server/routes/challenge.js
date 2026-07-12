const express   = require('express')
const Progress  = require('../models/Progress')
const User      = require('../models/User')
const protect   = require('../middleware/auth')
const { checkAndAwardBadges } = require('../utils/badgeChecker')

const router = express.Router()

// Slots must be computed in the app's target timezone (IST), not the
// server host's local timezone (Render runs UTC) — otherwise the slot
// the client submits never matches the slot the server validates
// against, daily-complete gets rejected, and completions never persist.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

const getDailyChallengeSlotInfo = (date = new Date()) => {
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  const year = ist.getUTCFullYear()
  const month = String(ist.getUTCMonth() + 1).padStart(2, '0')
  const day = String(ist.getUTCDate()).padStart(2, '0')
  const dateKey = `${year}-${month}-${day}`
  const slotIndex = Math.floor(ist.getUTCHours() / 6)

  return {
    dateKey,
    slotIndex,
    slotId: `${dateKey}-${slotIndex}`,
  }
}

router.get('/daily-status', protect, async (req, res) => {
  try {
    const { dateKey } = req.query
    const completions = Array.isArray(req.user.dailyChallengeCompletions)
      ? req.user.dailyChallengeCompletions
      : []
    const dailyCompletions = dateKey
      ? completions.filter(completion => completion.dateKey === dateKey)
      : completions

    res.json({
      isDeveloper: Boolean(req.user.isDeveloper),
      completedSlots: dailyCompletions.map(completion => completion.slotId),
      completions: dailyCompletions,
    })
  } catch (err) {
    console.error('Daily challenge status error:', err)
    res.status(500).json({ message: 'Failed to load daily challenge status' })
  }
})

router.post('/daily-complete', protect, async (req, res) => {
  try {
    const { slotId, dateKey, slotIndex, challengeId } = req.body
    // Every daily challenge in the bank awards a fixed 50 points — trusting
    // a client-supplied bonusPoints let anyone send an arbitrary value to
    // inflate their leaderboard score.
    const points = 50
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const completions = Array.isArray(user.dailyChallengeCompletions)
      ? user.dailyChallengeCompletions
      : []

    if (!user.isDeveloper) {
      if (!slotId || !dateKey || slotIndex === undefined) {
        return res.status(400).json({ message: 'Daily challenge slot is required' })
      }

      const currentSlot = getDailyChallengeSlotInfo()
      if (slotId !== currentSlot.slotId || dateKey !== currentSlot.dateKey || Number(slotIndex) !== currentSlot.slotIndex) {
        return res.status(400).json({ message: 'Daily challenge slot is not currently unlocked' })
      }

      const alreadyCompleted = completions.some(completion => completion.slotId === slotId)
      if (alreadyCompleted) {
        return res.json({
          alreadyCompleted: true,
          bonusPoints: 0,
          completedSlots: completions
            .filter(completion => completion.dateKey === dateKey)
            .map(completion => completion.slotId),
          user: await User.findById(req.user._id).select('-password'),
        })
      }

      user.dailyChallengeCompletions = completions
        .filter(completion => completion.dateKey === dateKey)
        .concat({
          slotId,
          dateKey,
          slotIndex: Number(slotIndex),
          challengeId: challengeId === undefined ? undefined : Number(challengeId),
          completedAt: new Date(),
        })
    }

    user.totalPoints = (user.totalPoints || 0) + points
    user.weeklyPoints = (user.weeklyPoints || 0) + points
    user.dailyPoints = (user.dailyPoints || 0) + points
    await user.save()

    const safeUser = await User.findById(user._id).select('-password')

    res.json({
      bonusPoints: points,
      completedSlots: user.isDeveloper
        ? []
        : user.dailyChallengeCompletions
          .filter(completion => completion.dateKey === dateKey)
          .map(completion => completion.slotId),
      user: safeUser,
    })
  } catch (err) {
    console.error('Daily challenge complete error:', err)
    res.status(500).json({ message: 'Failed to complete daily challenge' })
  }
})

// POST /api/challenge/complete — called when AI Challenge is finished
router.post('/complete', protect, async (req, res) => {
  try {
    const { topicId, score } = req.body
    const userId = req.user._id

    const progress = await Progress.findOne({ userId, topicId })
    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' })
    }

    // Clamp to a sane range — a raw client-supplied score with no upper
    // bound let anyone send an arbitrary value to inflate their points.
    const safeScore = Math.max(0, Math.min(100, Number(score) || 100))

    progress.aiChallengeCompleted = true
    progress.aiChallengeScore     = safeScore
    await progress.save()

    const bonusPoints = safeScore
    await User.findByIdAndUpdate(userId, {
      $inc: {
        totalPoints: bonusPoints,
        weeklyPoints: bonusPoints,
        dailyPoints: bonusPoints,
        aiChallengePoints: bonusPoints,
      },
    })

    // Check for ai_slayer / challenge_champion badges
    const newBadges = await checkAndAwardBadges(userId)

    res.json({ bonusPoints, newBadges })

  } catch (err) {
    console.error('Challenge complete error:', err)
    res.status(500).json({ message: 'Failed to complete challenge' })
  }
})

module.exports = router
