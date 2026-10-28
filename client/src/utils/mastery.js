// Per-concept mastery math. Keep in sync with server/utils/mastery.js

const WEIGHTS = {
  right: { EASY: 0.8, MEDIUM: 1.0, HARD: 1.2 },
  wrong: { EASY: 1.2, MEDIUM: 1.0, HARD: 0.8 },
}

export const updateMastery = (arr, key, { correct, difficulty }) => {
  let entry = arr.find(e => e.key === key)
  if (!entry) {
    arr.push({ key, score: 50, attempts: 0, correct: 0, lastSeen: null })
    entry = arr[arr.length - 1]
  }
  entry.attempts += 1
  if (correct) entry.correct += 1
  entry.lastSeen = new Date()

  const target = correct ? 100 : 0
  const k = entry.attempts <= 5 ? 0.35 : 0.2
  const w = WEIGHTS[correct ? 'right' : 'wrong'][difficulty] || 1.0
  const effective = Math.min(1, k * w)
  entry.score = Math.min(100, Math.max(0, Math.round(entry.score + (target - entry.score) * effective)))
  return arr
}

export const getMasteryBand = (score) => {
  if (score < 40) return 'Needs Revision'
  if (score < 60) return 'Developing'
  if (score < 80) return 'Ready to Progress'
  return 'Mastered'
}
