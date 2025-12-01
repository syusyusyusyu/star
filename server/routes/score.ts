import { Hono } from 'hono'
import { supabase } from '../supabaseClient'

type PlayMode = 'cursor' | 'body'

const isPlayMode = (mode: unknown): mode is PlayMode =>
  mode === 'cursor' || mode === 'body'

export const scoreRoute = new Hono()

scoreRoute.post('/score', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) {
    return c.json({ ok: false, error: 'Invalid JSON' }, 400)
  }

  const { songId, mode, score, maxCombo, rank } = body as {
    songId?: string
    mode?: unknown
    score?: unknown
    maxCombo?: unknown
    rank?: unknown
  }

  if (!songId || !mode || score === undefined || maxCombo === undefined || !rank) {
    return c.json({ ok: false, error: 'songId, mode, score, maxCombo and rank are required' }, 400)
  }

  if (!isPlayMode(mode)) {
    return c.json({ ok: false, error: 'mode must be cursor or body' }, 400)
  }

  if (typeof score !== 'number' || Number.isNaN(score) || typeof maxCombo !== 'number' || Number.isNaN(maxCombo)) {
    return c.json({ ok: false, error: 'score and maxCombo must be numbers' }, 400)
  }

  const { error } = await supabase.from('scores').insert({
    song_id: songId,
    mode,
    score,
    max_combo: maxCombo,
    rank: String(rank),
  })

  if (error) {
    console.error('[score] insert error', error)
    return c.json({ ok: false, error: 'Failed to save score' }, 500)
  }

  return c.json({ ok: true })
})

scoreRoute.get('/ranking', async (c) => {
  const songId = c.req.query('songId')
  const modeParam = c.req.query('mode')

  if (!songId) {
    return c.json({ ok: false, error: 'songId is required' }, 400)
  }

  if (modeParam && !isPlayMode(modeParam)) {
    return c.json({ ok: false, error: 'mode must be cursor or body' }, 400)
  }

  let query = supabase
    .from('scores')
    .select('score,max_combo,rank,mode,created_at')
    .eq('song_id', songId)
    .order('score', { ascending: false })
    .limit(10)

  if (modeParam) {
    query = query.eq('mode', modeParam)
  }

  const { data, error } = await query

  if (error) {
    console.error('[score] ranking error', error)
    return c.json({ ok: false, error: 'Failed to fetch ranking' }, 500)
  }

  return c.json({ ok: true, data })
})

export default scoreRoute
