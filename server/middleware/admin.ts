import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'

export const adminAuth = () => {
  return createMiddleware<Env>(async (c, next) => {
    const token = c.req.header('x-admin-token')

    if (!token || token !== process.env.ADMIN_TOKEN) {
      return c.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid admin token'
        },
        meta: {
          requestId: c.get('requestId')
        }
      }, 401)
    }

    await next()
  })
}
