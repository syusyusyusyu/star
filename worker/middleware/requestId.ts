import { Context, Next } from 'hono'

export const requestId = () => {
  return async (c: Context, next: Next) => {
    const id = c.req.header('x-request-id') || crypto.randomUUID()
    c.set('requestId', id)
    await next()
  }
}
