/**
 * Database types, generated from the live schema.
 *
 * Regenerate after any migration with:
 *   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
 *
 * Trimmed to the two exports this codebase actually uses, `Json` and
 * `Database`. The generator also emits `Tables<>`, `TablesInsert<>`,
 * `TablesUpdate<>`, `Enums<>`, `CompositeTypes<>` and `Constants`, which are
 * convenience generics nothing here imports; they are left out rather than
 * carried as a hundred lines of dead code.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      coasters: {
        Row: {
          country: string
          created_at: string
          id: string
          is_active: boolean
          manufacturer: string
          name: string
          park: string
          type: string
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          is_active?: boolean
          manufacturer: string
          name: string
          park: string
          type: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manufacturer?: string
          name?: string
          park?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          show_on_leaderboard: boolean
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          is_admin?: boolean
          show_on_leaderboard?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
          show_on_leaderboard?: boolean
        }
        Relationships: []
      }
      rides: {
        Row: {
          coaster_id: string
          created_at: string
          id: string
          note: string | null
          ridden_on: string
          user_id: string
        }
        Insert: {
          coaster_id: string
          created_at?: string
          id?: string
          note?: string | null
          ridden_on?: string
          user_id: string
        }
        Update: {
          coaster_id?: string
          created_at?: string
          id?: string
          note?: string | null
          ridden_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rides_coaster_id_fkey'
            columns: ['coaster_id']
            isOneToOne: false
            referencedRelation: 'coasters'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: { p_window?: string }
        Returns: {
          credits: number
          display_name: string
          rank: number
        }[]
      }
      get_my_stats: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      search_coasters: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          country: string
          id: string
          manufacturer: string
          name: string
          park: string
          type: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

/** The shape get_my_stats() returns, which Postgres hands over as jsonb. */
export type UserStats = {
  credits: number
  rides: number
  by_country: { label: string; credits: number }[]
  by_manufacturer: { label: string; credits: number }[]
  by_type: { label: string; credits: number }[]
  most_ridden: { name: string; park: string; rides: number } | null
}
