import { createMiddleware } from 'hono/factory'
import { getCookie, setCookie } from 'hono/cookie'
import crypto from 'node:crypto'
import type { Env } from '../types'

export const session = () => {
  return createMiddleware<Env>(async (c, next) => {
    let sessionId = getCookie(c, 'cs_session')

    if (!sessionId) {
      sessionId = crypto.randomUUID()
      setCookie(c, 'cs_session', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    }

    c.set('sessionId', sessionId)
    await next()
  })
}
