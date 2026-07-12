require('dotenv').config()
const express      = require('express')
const cors         = require('cors')
const path         = require('path')
const fs           = require('fs')
const connectDB    = require('./config/db')
const errorHandler = require('./middleware/errorHandler')
const startCronJobs = require('./cron/resetLeaderboard')

const app = express()

app.use(cors({
  origin: (origin, cb) => cb(null, true), // allow all origins in dev
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  next()
})

const startServer = async () => {
  try {
    await connectDB()

    // Routes are registered only after MongoDB is connected.
    app.use('/api/auth',        require('./routes/auth'))
    app.use('/api/topics',      require('./routes/topics'))
    app.use('/api/progress',    require('./routes/progress'))
    app.use('/api/groq',        require('./routes/groq'))
    app.use('/api/leaderboard', require('./routes/leaderboard'))
    app.use('/api/challenge',   require('./routes/challenge'))
    app.use('/api/profile',     require('./routes/profile'))
    app.use('/api/streak',      require('./routes/streak'))
    app.use('/api/badge',       require('./routes/badge'))

    app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' }))

    const clientDistCandidates = [
      process.env.CLIENT_DIST_DIR && path.resolve(process.env.CLIENT_DIST_DIR),
      path.join(__dirname, '..', 'client', 'dist'),
      path.join(__dirname, '..', 'dist'),
      path.join(__dirname, 'dist'),
    ].filter(Boolean)

    const clientDist = clientDistCandidates.find((candidate) => fs.existsSync(candidate))

    if (clientDist) {
      app.use(express.static(clientDist))
      app.get(/^\/(?!api).*/, (req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'))
      })
    } else {
      console.warn(
        '[STATIC] Frontend build not found. Expected one of: ' +
        clientDistCandidates.join(', ')
      )
    }

    startCronJobs()

    app.use(errorHandler)

    const PORT = process.env.PORT || 5000
    app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`))
  } catch (err) {
    console.error('Server startup failed:', err.message)
    process.exit(1)
  }
}

startServer()
