const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const User    = require('../models/User')
const protect = require('../middleware/auth')

const router = express.Router()

const sanitizeName  = (n) => n.trim().replace(/\s+/g, ' ')
const sanitizeEmail = (e) => e.trim().toLowerCase()

const nameRegex     = /^[a-zA-Z\s]{3,30}$/
const emailRegex    = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~])[^\s]{8,64}$/

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '14d' })

const formatAuthUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  hobby: user.hobby,
  language: user.language,
  onboardingComplete: user.onboardingComplete,
  streak: user.streak,
  totalPoints: user.totalPoints,
  badges: user.badges,
  speedModeEnabled: user.speedModeEnabled,
  isDeveloper: user.isDeveloper || false,
})

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    let { name, email, password } = req.body || {}

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please complete all fields' })
    }

    name  = sanitizeName(name)
    email = sanitizeEmail(email)

    if (name.length < 3 || name.length > 30) {
      return res.status(400).json({ message: 'Name must be 3-30 characters' })
    }
    if (!nameRegex.test(name)) {
      return res.status(400).json({ message: 'Name can only contain letters and spaces' })
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' })
    }

    if (password.length < 8 || password.length > 64) {
      return res.status(400).json({ message: 'Password must be 8-64 characters' })
    }
    if (/\s/.test(password)) {
      return res.status(400).json({ message: 'Password cannot contain spaces' })
    }
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password needs uppercase, lowercase, number, and special character',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const language = ['english', 'hindi', 'tamil', 'malayalam'].includes(req.body.language) ? req.body.language : 'english'
    await User.create({ name, email, password: hashedPassword, language })

    // No auto-login — redirect to /login on frontend
    res.status(201).json({ message: 'Account created. Please login.' })

  } catch (err) {
    console.error('Signup Error:', err)
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

// ─── POST /api/auth/dev-login — open Development Mode, no credentials ─────────
// Disabled for public/demo deployment. Left in place, commented out, on purpose.
// router.post('/dev-login', async (req, res) => {
//   try {
//     const email = 'development@stemlearn.local'
//     const hashedPassword = await bcrypt.hash(`dev-${Date.now()}-${Math.random()}`, 12)
//
//     const user = await User.findOneAndUpdate(
//       { email },
//       {
//         $set: {
//           name: 'Development Mode',
//           password: hashedPassword,
//           isDeveloper: true,
//           onboardingComplete: true,
//           language: 'english',
//           hobby: 'cricket',
//         },
//         $setOnInsert: {
//           streak: 0,
//           totalPoints: 0,
//           weeklyPoints: 0,
//           dailyPoints: 0,
//           badges: [],
//           speedModeEnabled: false,
//         },
//       },
//       { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
//     )
//
//     const token = generateToken(user._id)
//     res.status(200).json({ token, user: formatAuthUser(user) })
//   } catch (err) {
//     console.error('Dev Login Error:', err)
//     res.status(500).json({ message: 'Could not open Development Mode' })
//   }
// })

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ message: 'Please complete all fields' })
    }

    email = sanitizeEmail(email)

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' })
    }

    const token = generateToken(user._id)

    res.status(200).json({ token, user: formatAuthUser(user) })

  } catch (err) {
    console.error('Login Error:', err)
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.status(200).json({ user: req.user })
})

module.exports = router
