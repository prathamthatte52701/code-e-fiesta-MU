// Fuzzy-but-safe comparison for question answers. Plain exact-match string
// comparison was marking objectively-correct answers as wrong whenever the
// AI-generated correctAnswer differed from the student's input by only
// case, punctuation, whitespace, or numeric formatting (e.g. "5" vs "5.0").
const normalizeAnswerText = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"`]+$/g, '') // trailing punctuation only — keep internal punctuation (code answers)
    .toLowerCase()

const asNumber = (value) => {
  const trimmed = String(value ?? '').trim()
  if (trimmed === '' || Number.isNaN(Number(trimmed))) return null
  return Number(trimmed)
}

export const isAnswerMatch = (submitted, expected) => {
  const a = normalizeAnswerText(submitted)
  const b = normalizeAnswerText(expected)
  if (a === b) return true

  const numA = asNumber(submitted)
  const numB = asNumber(expected)
  if (numA !== null && numB !== null) return numA === numB

  return false
}

export default isAnswerMatch
