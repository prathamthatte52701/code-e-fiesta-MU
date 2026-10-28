const mongoose = require('mongoose')
const { Schema } = mongoose

const levelDataSchema = new Schema({
  completed: { type: Boolean, default: false },
  questionsAttempted: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  currentDifficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    default: 'EASY',
  },
  last3Answers: { type: [Boolean], default: [] },
  last3Times: { type: [Number], default: [] },
  speedModeUsed: { type: Boolean, default: false },

  // Batch tracking fields
  currentBatchCorrect: { type: Number, default: 0 },
  currentBatchCount:   { type: Number, default: 0 },
  failCount:           { type: Number, default: 0 },
  levelType:           { type: String, enum: ['MCQ', 'FILL', 'IDE'], default: 'MCQ' },
  theoryNeeded:        { type: Boolean, default: false },
}, { _id: false })

const wrongAnswerSchema = new Schema({
  concept: String,
  questionText: String,
  userAnswer: String,
  correctAnswer: String,
  level: Number,
  conceptTag: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false })

const conceptMasterySchema = new Schema({
  key: String,
  score: { type: Number, default: 50 },
  attempts: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  lastSeen: Date,
}, { _id: false })

const progressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  topicId: { type: String, required: true },

  currentLevel: { type: Number, default: 1, min: 1, max: 5 },

  levels: {
    1: { type: levelDataSchema, default: () => ({}) },
    2: { type: levelDataSchema, default: () => ({}) },
    3: { type: levelDataSchema, default: () => ({}) },
    4: { type: levelDataSchema, default: () => ({}) },
    5: { type: levelDataSchema, default: () => ({}) },
  },

  topicCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  firstBloodShown: { type: Boolean, default: false },

  aiChallengeUnlocked: { type: Boolean, default: false },
  aiChallengeCompleted: { type: Boolean, default: false },
  aiChallengeScore: { type: Number, default: 0 },

  wrongAnswers: { type: [wrongAnswerSchema], default: [] },

  conceptMastery: { type: [conceptMasterySchema], default: [] },
  masteryHistory: { type: [{ day: String, avg: Number, _id: false }], default: [] },

  lastRevisionDate: { type: Date, default: null },
  revisionDue: { type: Boolean, default: false },

  consecutiveCorrect: { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now },
})

progressSchema.index({ userId: 1, topicId: 1 }, { unique: true })

module.exports = mongoose.model('Progress', progressSchema)
