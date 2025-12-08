import { Context, Next } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'

export const session = () => {
  return async (c: Context, next: Next) => {
    let sessionId = getCookie(c, 'cs_session')

    if (!sessionId) {
      sessionId = crypto.randomUUID()
      setCookie(c, 'cs_session', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    }

    c.set('sessionId', sessionId)
    await next()
  }
}
