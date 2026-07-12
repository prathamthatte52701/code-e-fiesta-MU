const express          = require('express')
const protect          = require('../middleware/auth')
const { groqQuestion, groqAnswer, groqChallenge, groqCall } = require('../config/groq')
const { getQuestionType } = require('../utils/adaptive')
const Topic            = require('../models/Topic')
const hobbyStemMap     = require('../constants/hobbyStemMap')
const feedbackMessages = require('../constants/feedbackMessages')
const pythonNotes      = require('../data/pythonNotes')
const { isAnswerMatch } = require('../utils/answerMatch')
const { runPython } = require('../utils/pistonExec')

const router = express.Router()
const optionalProtect = protect.optional
const VALID_LANGUAGES   = new Set(['english', 'hindi', 'tamil', 'malayalam'])
const normalizeLanguage = (language) => VALID_LANGUAGES.has(language) ? language : 'english'
const normalizeHobby    = (hobby) => hobby || 'cricket'
const langLabel = (lang) => ({ english: 'English', hindi: 'Hindi', tamil: 'Tamil', malayalam: 'Malayalam' })[lang] || 'English'
const langInstruction = (lang) => ({
  english:   'Write in English.',
  hindi:     'Write in Hindi. Keep all Python code in English.',
  tamil:     'Write in Tamil (தமிழ்). Keep all Python code and keywords (print, def, if, for, while, return, True, False, None) in English.',
  malayalam: 'Write in Malayalam (മലയാളം). Keep all Python code and keywords in English.',
})[lang] || 'Write in English.'
const questionRateLimit = new Map()

const getRequesterId = (req) => req.user?._id?.toString?.() || req.ip || 'anonymous'

const isQuestionRateLimited = (req) => {
  const key = getRequesterId(req)
  const now = Date.now()
  const last = questionRateLimit.get(key) || 0
  questionRateLimit.set(key, now)
  if (questionRateLimit.size > 1000) {
    for (const [id, timestamp] of questionRateLimit) {
      if (now - timestamp > 60000) questionRateLimit.delete(id)
    }
  }
  return now - last < 2000
}

// ─── POST /api/groq/question — uses KEY_2 (groqQuestion) ─────────────────────
router.post('/question', optionalProtect, async (req, res) => {
  try {
    if (isQuestionRateLimited(req)) {
      return res.status(200).json({ useFallback: true, reason: 'rate_limited' })
    }

    const {
      topicId: _topicId, concept, level, difficulty, questionsAttempted,
      previousQuestion, previousQuestions, previousAnswer, language: requestedLanguage, hobby: requestedHobby,
    } = req.body || {}
    const topicId = _topicId || concept
    if (!topicId) return res.status(200).json({ useFallback: true, reason: 'missing_topic' })

    const user     = req.user || {}
    const topic    = await Topic.findOne({ topicId })
    if (!topic) return res.status(404).json({ message: 'Topic not found' })

    const hobby    = normalizeHobby(requestedHobby || user.hobby)
    const language = normalizeLanguage(requestedLanguage || user.language)
    const langInstr = langInstruction(language)
    const stemCtx  = topic.stemContext
    const hobbyMap = hobbyStemMap[hobby]?.[topicId]
    const qType    = getQuestionType(level, difficulty)

    const notes = pythonNotes[topicId]

    const stemSubject    = stemCtx?.subject || 'Science'
    const stemConnection = stemCtx?.connection || 'programming fundamentals'
    const hobbyExample   = hobbyMap?.example || `${hobby} scenario`
    const hobbySTEM      = hobbyMap?.stemConnection || `${hobby} data analysis`

    const prompt = `You are a STEM + Python question generator for Indian students. Your goal is to teach Python through real STEM applications using the student's hobby as the setting.

CORE IDENTITY OF EVERY QUESTION:
A ${stemSubject} professional is using Python to solve a real ${stemSubject} problem in the world of ${hobby}.
The hobby is the SETTING. ${stemSubject} is the PROBLEM being solved. Python is the TOOL.

STUDENT PROFILE:
- Python Concept: ${topic.name}
- Level: ${level}/5 | Difficulty: ${difficulty} | Question Type: ${qType}
- Hobby: ${hobby}
- STEM Subject: ${stemSubject}
- STEM Connection to this concept: "${stemConnection}"
- Hobby code example: ${hobbyExample}
- Hobby STEM scenario: ${hobbySTEM}
- Language: ${langLabel(language)}
- Questions asked so far: ${questionsAttempted || 0}
- Previous question: ${previousQuestion || 'None'}
- Previous questions this session: ${JSON.stringify(previousQuestions || [])}

PYTHON REFERENCE (use for accuracy):
Key concepts: ${notes?.concepts?.slice(0, 6).join(' | ') || 'core concepts'}
Code patterns: ${notes?.code_examples?.slice(0, 2).join('\n---\n') || 'standard patterns'}
Common mistakes: ${notes?.common_mistakes?.join(' | ') || 'none'}

HOW TO BUILD THE QUESTION (read carefully):

EASY difficulty:
- Scenario: A ${hobby} coach/player uses Python to track simple ${stemSubject} data
- The question tests ONE Python concept directly
- Variable names must come from ${hobby} + ${stemSubject} world
- Example frame: "A sports scientist tracking ${hobby} data writes: [simple code]. What is..."

MEDIUM difficulty:
- Scenario: A ${stemSubject} analyst is processing ${hobby} data using Python
- Requires applying the concept, not just recognizing it
- Must involve a small calculation or data transformation related to ${hobbySTEM}
- Example frame: "An engineer building a ${hobby} analytics tool writes: [code]. What happens when..."

HARD difficulty:
- Scenario: A ${stemSubject} researcher is building a Python system for ${hobby} — they hit a problem
- Student must debug or complete the solution using deep concept knowledge
- The problem must feel like a REAL ${stemSubject} challenge (measurements, statistics, models, formulas)
- Wrong options must trap students who know Python but miss the ${stemSubject} logic
- Example frame: "A data scientist analyzing ${hobby} performance metrics needs to [specific STEM task]. Write/fix the code that..."

QUESTION TYPE RULES:
MCQ: 4 options, 1 correct. Wrong options = plausible Python mistakes OR STEM reasoning errors. Never obviously wrong.
FILL_BLANK: Python code with exactly ONE ___ blank. Single keyword/value/operator. One correct answer only.
CODE: Clear STEM+hobby problem. Expected output must be exact — no trailing spaces or extra newlines.

ABSOLUTE RULES:
- NEVER repeat or resemble previous questions
- All Python code must be syntactically correct AND fully self-contained: every
  variable used on the right-hand side of an expression (e.g. in "x = x + 10")
  MUST have been explicitly assigned a value on an earlier line of the SAME
  code shown to the student. NEVER reference a variable the student hasn't
  seen initialized — that makes the question unanswerable and the code would
  crash with NameError in real Python. If you need a running total, show the
  starting assignment line first (e.g. "score = 0" before "score = score + 10").
- correctAnswer must be mechanically derivable by tracing ONLY the exact code
  shown — do not rely on any assumed/hidden starting value
- correctAnswer must exactly match Python output/accepted input, AND must be
  one of the "options" strings verbatim for MCQ (character-for-character)
- The "code" field must contain COMPLETE, CONCRETE Python statements only —
  never a placeholder comment like "# new code here" or "# write your code
  here" standing in for a step the answer depends on. If the question talks
  about "adding a line" or "incrementing", that exact line of code must
  actually be written out in "code", not described in the question text and
  left out of the code
- The "code" field and the "question" text must describe the SAME code —
  never show one version in the question wording and a different version
  in "code"
- Hints: hint1 = Python clue from knowledge base | hint2 = STEM+hobby analogy | hint3 = near-answer
- ${langInstr}

Return ONLY this JSON — no markdown, no explanation:
{
  "questionType": "${qType}",
  "question": "question text",
  "code": "code snippet or null",
  "options": ["A text", "B text", "C text", "D text"] or null,
  "correctAnswer": "exact correct answer",
  "expectedOutput": "exact output for CODE type or null",
  "hint1": "subtle clue from knowledge base",
  "hint2": "hobby-based example hint",
  "hint3": "almost the answer"
}`

    // A tiny local fallback bank (client/src/data/fallbackQuestions.js) backs
    // this up when the AI can't produce a valid question — but that bank only
    // has ~3-4 items per topic/difficulty, so falling back to it often is
    // exactly what was causing visible repeats. Retry the AI itself (with an
    // escalating anti-repeat instruction) before ever giving up to fallback.
    const normalizeForDup = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const prevList = Array.isArray(previousQuestions) ? previousQuestions : []
    // Catches near-verbatim rewrites too (same phrase run, different filler
    // words around it) — not just byte-identical repeats. A shared run of 6+
    // consecutive words is a strong signal the "new" question is really the
    // same one lightly reworded, without flagging genuinely different
    // questions that merely share the hobby/topic scaffolding.
    const hasLongCommonRun = (a, b, n = 6) => {
      const wa = normalizeForDup(a).split(' ').filter(Boolean)
      const wb = normalizeForDup(b).split(' ').filter(Boolean)
      if (wa.length < n || wb.length < n) return false
      const runsB = new Set()
      for (let i = 0; i <= wb.length - n; i++) runsB.add(wb.slice(i, i + n).join(' '))
      for (let i = 0; i <= wa.length - n; i++) if (runsB.has(wa.slice(i, i + n).join(' '))) return true
      return false
    }
    const isDuplicateQuestion = (candidateText) => {
      if (!candidateText) return false
      const norm = normalizeForDup(candidateText)
      return prevList.some(p => normalizeForDup(p) === norm || hasLongCommonRun(candidateText, p))
    }

    const MAX_ATTEMPTS = 3
    let question = null
    let lastReason = 'bad_json'
    let lastDuplicateText = ''

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const retryNote = attempt === 0 ? '' : `\n\nIMPORTANT: Your previous attempt repeated a question the student already saw: "${lastDuplicateText}". Generate a COMPLETELY DIFFERENT question — different scenario, different numbers, different wording. Do not resemble it at all.`

      const raw = await groqCall(groqQuestion, [{ role: 'user', content: prompt + retryNote }], 700)
      const clean = raw.replace(/```json|```/g, '').trim()
      let candidate
      try {
        candidate = JSON.parse(clean)
      } catch {
        lastReason = 'bad_json'
        continue
      }

      if (isDuplicateQuestion(candidate.question)) {
        console.error('Question Generation Warning: duplicate question detected, retrying', { topicId, attempt })
        lastDuplicateText = candidate.question
        lastReason = 'duplicate_question'
        continue
      }

      // The model writes `options` and `correctAnswer` in the same response but
      // nothing forces them to agree — a reworded/re-punctuated correctAnswer
      // that doesn't match any option verbatim was making genuinely correct
      // picks grade as wrong. Validate (fuzzy) and repair before this ever
      // reaches the client.
      if (Array.isArray(candidate.options) && candidate.options.length > 0) {
        const matchedOption = candidate.options.find(opt => isAnswerMatch(opt, candidate.correctAnswer))
        if (matchedOption === undefined) {
          console.error('Question Generation Warning: correctAnswer did not match any option', {
            topicId, correctAnswer: candidate.correctAnswer, options: candidate.options,
          })
          lastReason = 'correct_answer_mismatch'
          continue
        }
        // Snap to the option's exact text so client-side string comparison
        // (and the green-highlight reveal) always lines up.
        candidate.correctAnswer = matchedOption
      }

      question = candidate
      break
    }

    if (!question) {
      return res.status(200).json({ useFallback: true, reason: lastReason })
    }

    res.status(200).json({ question })

  } catch (err) {
    console.error('Question Generation Error:', err)
    res.status(200).json({ message: 'Question generation failed', useFallback: true })
  }
})

// ─── POST /api/groq/wrong-summary — uses KEY_3 (groqAnswer) ─────────────────
router.post('/wrong-summary', optionalProtect, async (req, res) => {
  try {
    const { topicId, question, userAnswer, correctAnswer, questionType, isTimeout, isCorrect: answerWasCorrect, language: requestedLanguage } = req.body || {}
    const user     = req.user || {}
    const topic    = await Topic.findOne({ topicId })
    const notes    = pythonNotes[topicId]
    const lang     = langLabel(normalizeLanguage(requestedLanguage || user.language))
    const langInstr2 = langInstruction(normalizeLanguage(requestedLanguage || user.language))
    const hobby    = normalizeHobby(req.body.hobby || user.hobby)
    const hobbyMap = hobbyStemMap[hobby]?.[topicId]
    const hobbyEx  = hobbyMap?.example || `${hobby} example`

    const prompt = answerWasCorrect
      ? `You are an enthusiastic Python tutor. The student answered correctly — reinforce their understanding.

WHAT HAPPENED:
- Concept: ${topic?.name || topicId}
- Question: ${question}
- Student Answer: ${userAnswer} ✅ (Correct!)
- Correct Answer: ${correctAnswer}

STUDENT CONTEXT (for tone/flavor only — do NOT pull numbers or values from this):
- Hobby: ${hobby}
- Hobby flavor reference (do not reuse its numbers): ${hobbyEx}
- Language: ${lang}

PYTHON KNOWLEDGE BASE:
Key Facts: ${notes?.key_facts?.slice(0, 3).join(', ') || 'None'}
Code patterns: ${notes?.code_examples?.[0] || 'None'}

Write a short reinforcement with EXACTLY this structure:

✅ Why this is correct:
(1-2 lines — explain WHY this answer works using ONLY the exact numbers/code
from the "Question" and "Correct Answer" above. Never invent a different
example, different starting values, or numbers not shown in the Question.)

💡 Deeper insight:
(1 line — one extra fact about this concept they may not know, from knowledge base)

🏏 Real world use:
(1 line — connect to ${hobby} by theme/setting only, no invented numbers: how a ${hobby} enthusiast would use this in real Python code)

RULES:
- Maximum 5 lines total
- Celebrate their correct answer but focus on building deeper understanding
- Even if they guessed, they now learn WHY it's correct
- NEVER introduce a number, variable value, or scenario that isn't literally in the Question/Correct Answer above
- ${langInstr2}
- Return only the explanation — no JSON, no extra labels`
      : `You are a friendly Python tutor explaining a mistake.

WHAT HAPPENED:
- Concept: ${topic?.name || topicId}
- Question: ${question}
- Student Answer: ${userAnswer || (isTimeout ? 'Did not answer — time ran out' : 'Did not answer')}
- Correct Answer: ${correctAnswer}
- Question Type: ${questionType || 'Unknown'}

STUDENT CONTEXT (for tone/flavor only — do NOT pull numbers or values from this):
- Hobby: ${hobby}
- Hobby flavor reference (do not reuse its numbers): ${hobbyEx}
- Language: ${lang}

PYTHON KNOWLEDGE BASE:
Common Mistakes: ${notes?.common_mistakes?.join(', ') || 'None'}
Key Facts: ${notes?.key_facts?.slice(0, 3).join(', ') || 'None'}

Write explanation with EXACTLY this structure:

❌ What went wrong:
(1 line — specific, not vague. Reference their actual wrong answer.)

✅ Correct approach:
(1-2 lines — trace through the EXACT code/numbers shown in the "Question"
above, step by step, to reach the "Correct Answer" above. Never invent a
different example, different starting values, or numbers not shown in the
Question — that confuses the student instead of helping them.)
(If code question: show the correct 1-2 lines)

💡 Remember:
(1 line — key fact from knowledge base relevant to this mistake)

🔥 You've got this:
(1 encouraging line — reference their hobby by theme only, no invented numbers)

RULES:
- Maximum 6 lines total
- Never say 'you are wrong' or anything discouraging
- Be specific — reference their actual answer
- Use hobby naturally — do not force it
- NEVER introduce a number, variable value, or scenario that isn't literally in the Question/Correct Answer above
- ${langInstr2}
- Return only the explanation — no JSON, no labels beyond the emoji headers`

    const summary = await groqCall(groqAnswer, [{ role: 'user', content: prompt }], 350)
    res.status(200).json({ summary })

  } catch (err) {
    console.error('Summary Error:', err)
    const fbLang = normalizeLanguage(req.body?.language || req.user?.language)
    const fallback = feedbackMessages.fallbackWrong[fbLang] || feedbackMessages.fallbackWrong.english
    res.status(200).json({ summary: fallback, fallback: true })
  }
})

// ─── POST /api/groq/ide-check — uses KEY_3 (groqAnswer) ─────────────────────
router.post('/ide-check', optionalProtect, async (req, res) => {
  try {
    const { code, expectedOutput, userOutput, topicId, language } = req.body || {}
    const topic = await Topic.findOne({ topicId })

    const prompt = `A student wrote Python code. Review it and explain what went wrong.

STUDENT CODE:
${code}

EXPECTED OUTPUT: ${expectedOutput}
ACTUAL OUTPUT: ${userOutput}
CONCEPT: ${topic?.name || topicId}
LANGUAGE: ${langLabel(normalizeLanguage(language))}

Instructions:
1. Line 1: What the code is doing wrong (specific)
2. Line 2: What needs to be fixed (clear direction)
3. Line 3: Encouragement

Rules:
- Maximum 3 lines
- No complete solution — guide only
- ${langInstruction(normalizeLanguage(language))}
- Return ONLY the feedback.`

    const feedback = await groqCall(groqAnswer, [{ role: 'user', content: prompt }], 250)
    res.status(200).json({ feedback })

  } catch (err) {
    const fbLang2 = normalizeLanguage(req.body?.language)
    res.status(200).json({
      feedback: feedbackMessages.ideFallback[fbLang2] || feedbackMessages.ideFallback.english,
    })
  }
})

// ─── POST /api/groq/challenge-question — uses KEY_4 (groqChallenge) ──────────
router.post('/challenge-question', protect, async (req, res) => {
  try {
    const { topicId, questionNum, previousQuestions, previousAnswers, language: requestedLanguage } = req.body || {}
    const user     = req.user
    const topic    = await Topic.findOne({ topicId })
    const hobbyMap = hobbyStemMap[user?.hobby]?.[topicId]

    const notes = pythonNotes[topicId]
    const challengeNotesCtx = notes ? `
REFERENCE KNOWLEDGE BASE (use to evaluate answers and frame questions):
Key Concepts: ${notes.concepts.join(' | ')}
Common Mistakes: ${notes.common_mistakes.join(' | ')}
Key Facts: ${notes.key_facts.join(' | ')}
Advanced (for Q7-Q10): ${notes.level_progression?.[4] || ''} | ${notes.level_progression?.[5] || ''}
` : ''

    const prompt = `You are a strict but fair technical interviewer conducting a Python concept interview.

INTERVIEW CONTEXT:
Topic: ${topic?.name || topicId}
Hobby Context: ${hobbyMap?.example || 'general programming'}
Language: ${langLabel(normalizeLanguage(requestedLanguage || user.language))}
Question Number: ${questionNum}/10
Previous Questions: ${JSON.stringify(previousQuestions || [])}
Previous Answers: ${JSON.stringify(previousAnswers || [])}
${challengeNotesCtx}
YOUR JOB:
- Evaluate the last answer (if any). Was it conceptually correct and complete?
- If YES and you are satisfied → respond EXACTLY with the single word: GREAT
- If NO or it's question 1 → ask the next interview question

QUESTION PROGRESSION:
- Q1-Q3: Basic understanding
- Q4-Q6: Application ("How would you use this in a real scenario?")
- Q7-Q9: Deep understanding ("What happens if... Why does...")
- Q10: Real hobby-based scenario question (hardest)

STRICT RULES:
1. NEVER repeat previous questions
2. NEVER be vague — ask specific, focused questions
3. Use the hobby context in Q7-Q10
4. If the answer is partially right, ask a clarifying follow-up
5. Be strict — do not accept vague answers
6. ${langInstruction(normalizeLanguage(requestedLanguage || user.language))}

RESPOND WITH:
- EXACTLY "GREAT" if satisfied (nothing else, no punctuation)
- OR the next interview question (one question only, no extra text)`

    const response = await groqCall(groqChallenge, [{ role: 'user', content: prompt }], 200)
    // Tolerate trailing punctuation/whitespace drift ("GREAT." / "GREAT!") —
    // a strict === was treating minor formatting noise as an unsatisfied
    // answer and forcing an unnecessary extra question.
    const isComplete = response.trim().toUpperCase().replace(/[.!?]+$/, '') === 'GREAT'
    res.status(200).json({ question: response, isComplete })

  } catch (err) {
    console.error('Challenge Error:', err)
    res.status(200).json({
      question: {
        hindi:     'Chaliye ek simple Python concept se shuru karte hain. Is topic ka ek practical use batao.',
        tamil:     'ஒரு simple Python concept-இல் இருந்து தொடங்குவோம். இந்த topic-இன் ஒரு practical use சொல்லுங்கள்.',
        malayalam: 'ഒരു simple Python concept-ൽ നിന്ന് തുടങ്ങാം. ഈ topic-ന്റെ ഒരു practical use പറയൂ.',
      }[normalizeLanguage(req.body?.language || req.user?.language)] || 'Let us start with a simple Python concept. Tell me one practical use of this topic.',
      isComplete: false,
      fallback: true,
    })
  }
})

module.exports = router
