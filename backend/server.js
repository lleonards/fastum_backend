require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const messagesRouter = require('./src/routes/messages')
const photosRouter = require('./src/routes/photos')

const app = express()
const PORT = process.env.PORT || 3001

// ====== MIDDLEWARES DE SEGURANÇA ======
app.use(helmet())

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else if (process.env.NODE_ENV === 'production') {
      callback(new Error('Origem não permitida pelo CORS'))
    } else {
      callback(null, true)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
})
app.use(limiter)

// Body Parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ====== ROTAS ======
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MensagemMágica API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

app.use('/api/messages', messagesRouter)
app.use('/api/photos', photosRouter)

// 404
app.use('*', (req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.originalUrl} não encontrada` })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err.message)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message
  })
})

// ====== START ======
app.listen(PORT, () => {
  console.log(`
  🚀 MensagemMágica API rodando!
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📡 URL:         http://localhost:${PORT}
  🌍 Ambiente:    ${process.env.NODE_ENV || 'development'}
  🔗 Frontend:    ${process.env.FRONTEND_URL || 'http://localhost:5173'}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
})

module.exports = app
