// Mirrors client/src/utils/answerMatch.js — kept in sync deliberately so the
// server's validation of AI-generated correctAnswer vs options agrees with
// what the client will later use to grade the student's submission.
const normalizeAnswerText = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"`]+$/g, '')
    .toLowerCase()

const asNumber = (value) => {
  const trimmed = String(value ?? '').trim()
  if (trimmed === '' || Number.isNaN(Number(trimmed))) return null
  return Number(trimmed)
}

const isAnswerMatch = (submitted, expected) => {
  const a = normalizeAnswerText(submitted)
  const b = normalizeAnswerText(expected)
  if (a === b) return true

  const numA = asNumber(submitted)
  const numB = asNumber(expected)
  if (numA !== null && numB !== null) return numA === numB

  return false
}

module.exports = { isAnswerMatch, normalizeAnswerText }
