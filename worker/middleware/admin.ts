import { Context, Next } from 'hono'
import { Env } from '../types'

export const adminAuth = () => {
  return async (c: Context<Env>, next: Next) => {
    const token = c.req.header('x-admin-token')
    
    if (!token || token !== c.env.ADMIN_TOKEN) {
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
  }
}
