import { z } from "zod"

export const scoreSchema = z.object({
  playerName: z.string().min(1).max(20).transform(val => val.replace(/[\x00-\x1F\x7F]/g, '')), // Basic sanitization
  songId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  mode: z.enum(['cursor', 'body', 'mobile', 'hand', 'face']).default('cursor'),
  score: z.number().int().min(0),
  maxCombo: z.number().int().min(0),
  rank: z.string().min(1).max(5),
  accuracy: z.number().min(0).max(100).optional(),
  turnstileToken: z.string().optional(),
})

export const querySchema = z.object({
  songId: z.string().min(1),
  mode: z.enum(['cursor', 'body', 'mobile', 'hand', 'face']).optional(),
  period: z.enum(['all', 'weekly', 'daily']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ScorePayload = z.infer<typeof scoreSchema>
export type RankingQuery = z.infer<typeof querySchema>
