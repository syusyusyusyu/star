import { Hono } from 'hono'
import { adminAuth } from '../middleware/admin'
import { getSupabase } from '../supabaseClient'
import { Env } from '../types'

const app = new Hono<Env>()

app.use('*', adminAuth())

app.delete('/scores', async (c) => {
  const supabase = getSupabase(c.env)
  
  const { count, error } = await supabase
    .from('scores')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows (hacky way to delete all without where clause if needed, but usually delete() requires a filter or explicit allow)
    // Actually supabase-js delete() usually requires a filter. .neq('id', '...') is a way to select all.
    // Or better: .gt('created_at', '1970-01-01')
  
  // To delete all rows safely without a specific condition, we can use a condition that is always true.
  // However, Supabase client might block delete without filter.
  // Let's use .neq('song_id', 'dummy') assuming no song_id is 'dummy', or better .not('id', 'is', null)
  
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
