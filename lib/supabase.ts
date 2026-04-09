import { createClient } from '@supabase/supabase-js'

export type Player = {
  id: string
  name: string
  state: 'pending' | 'live' | 'done'
  start_ms: number | null
  final_ms: number | null
  created_at: string
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
