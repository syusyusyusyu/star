export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      scores: {
        Row: {
          id: string
          session_id: string
          song_id: string
          mode: string
          score: number
          max_combo: number
          rank: string
          accuracy: number | null
          is_suspicious: boolean
          player_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          song_id: string
          mode?: string
          score: number
          max_combo: number
          rank: string
          accuracy?: number | null
          is_suspicious?: boolean
          player_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          song_id?: string
          mode?: string
          score?: number
          max_combo?: number
          rank?: string
          accuracy?: number | null
          is_suspicious?: boolean
          player_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
