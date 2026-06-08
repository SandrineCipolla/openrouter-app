import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import historyRouter from './routes/history'
import chatRouter from './routes/chat'

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/history', historyRouter)
app.use('/api/chat', chatRouter)

app.listen(PORT, () => {
  console.log(`Backend démarré sur http://localhost:${PORT}`)
})