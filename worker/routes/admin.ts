import { Hono } from 'hono'
import { adminAuth } from '../middleware/admin'
import { deleteScores } from '../services/adminService'
import { Env } from '../types'

const app = new Hono<Env>()

app.use('*', adminAuth())

app.delete('/scores', async (c) => {
  return deleteScores(c)
})

export default app