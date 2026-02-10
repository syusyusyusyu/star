import { createMiddleware } from 'hono/factory'
import crypto from 'node:crypto'
import type { Env } from '../types'

export const requestId = () => {
  return createMiddleware<Env>(async (c, next) => {
    const id = c.req.header('x-request-id') || crypto.randomUUID()
    c.set('requestId', id)
    await next()
  })
}
