export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_id: string
          name: string
          email: string
          role: string
          telegram_id: string | null
          telegram_linked: boolean
          owned_kpi_ids: string[]
          created_at: string
          last_login_at: string | null
          mfa_enabled: boolean
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      kpis: {
        Row: {
          id: string
          name: string
          category: string
          strategic_purpose: string
          target: string
          target_numeric: number | null
          current_value: number | null
          current_value_display: string
          cadence: string
          next_check_date: string
          owner_id: string
          type: string
          status: string
          platform: string
          trend: string | null
          why_its_core: string
          upload_schema_id: string
          visible_to_roles: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['kpis']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['kpis']['Insert']>
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          role: string
          content: string
          source: string
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>
      }
      recovery_plans: {
        Row: {
          id: string
          kpi_id: string
          owner_id: string
          status: string
          summary: string
          root_cause: string
          actions: unknown[]
          target_date: string
          confidence_level: string
          source: string
          ai_suggestion: string | null
          ai_warning: string | null
          approved_by_id: string | null
          approved_at: string | null
          rejection_reason: string | null
          previous_plan_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['recovery_plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['recovery_plans']['Insert']>
      }
      accountability_events: {
        Row: {
          id: string
          kpi_id: string
          triggered_at: string
          type: string
          actor_id: string
          message: string
          source: string
          metadata: Record<string, unknown> | null
        }
        Insert: Omit<Database['public']['Tables']['accountability_events']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['accountability_events']['Insert']>
      }
      audit_log: {
        Row: {
          id: string
          actor_id: string
          action: string
          resource_type: string
          resource_id: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>
        Update: never
      }
      upload_records: {
        Row: {
          id: string
          kpi_id: string
          uploaded_by_id: string
          file_name: string
          file_size: number
          status: string
          rows_processed: number | null
          rows_rejected: number | null
          errors: unknown | null
          uploaded_at: string
          processed_at: string | null
          storage_path: string | null
        }
        Insert: Omit<Database['public']['Tables']['upload_records']['Row'], 'id' | 'uploaded_at'>
        Update: Partial<Database['public']['Tables']['upload_records']['Insert']>
      }
      market_watch: {
        Row: {
          id: string
          platform: string
          category: string
          subcategory: string
          period: string
          rank: number
          brand: string
          is_northstar: boolean
          market_share: number
          sales_est_low: number
          sales_est_high: number
          units_est_low: number
          units_est_high: number
          growth: number | null
          snapshot_date: string
        }
        Insert: Omit<Database['public']['Tables']['market_watch']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['market_watch']['Insert']>
      }
    }
  }
}
