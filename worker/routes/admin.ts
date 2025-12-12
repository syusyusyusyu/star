import { Hono } from 'hono'
import { adminAuth } from '../middleware/admin'
import { getSupabase } from '../supabaseClient'
import { Env } from '../types'

const app = new Hono<Env>()

app.use('*', adminAuth())

app.delete('/scores', async (c) => {
  const confirm = c.req.query('confirm')
  const songId = c.req.query('songId')
  const mode = c.req.query('mode')
  
  if (!confirm) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Missing confirm parameter' } }, 400)
  }

  const supabase = getSupabase(c.env)
  let query = supabase.from('scores').delete({ count: 'exact' })

  if (confirm === 'ALL') {
    // Delete all: use a condition that matches everything
    query = query.neq('id', '00000000-0000-0000-0000-000000000000')
  } else if (confirm === 'true') {
    // Conditional delete
    if (!songId && !mode) {
       return c.json({ error: { code: 'BAD_REQUEST', message: 'Condition required (songId or mode) when confirm=true' } }, 400)
    }
    if (songId) query = query.eq('song_id', songId)
    if (mode) query = query.eq('mode', mode)
  } else {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid confirm value' } }, 400)
  }
  
  const { count, error } = await query
  
  if (error) {
    console.error('Admin delete error:', error)
    return c.json({
      error: {
        code: 'DB_ERROR',
        message: error.message
      },
      meta: {
        requestId: c.get('requestId')
      }
    }, 500)
  }

  return c.json({
    data: { deleted: count },
    meta: {
      requestId: c.get('requestId')
    }
  })
})

export default app
