export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      devotional_access: {
        Row: {
          access_started_at: string | null
          access_status: string
          expires_at: string | null
          sample_granted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_started_at?: string | null
          access_status?: string
          expires_at?: string | null
          sample_granted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_started_at?: string | null
          access_status?: string
          expires_at?: string | null
          sample_granted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "devotional_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      devotional_day_completions: {
        Row: {
          completed_at: string
          day_number: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          day_number: number
          user_id: string
        }
        Update: {
          completed_at?: string
          day_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_day_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "devotional_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      devotional_payment_events: {
        Row: {
          buyer_email: string | null
          event_id: string
          event_type: string
          occurred_at: string
          order_id: string
          payment_provider: string
          processed_at: string
          user_id: string | null
        }
        Insert: {
          buyer_email?: string | null
          event_id: string
          event_type: string
          occurred_at: string
          order_id: string
          payment_provider: string
          processed_at?: string
          user_id?: string | null
        }
        Update: {
          buyer_email?: string | null
          event_id?: string
          event_type?: string
          occurred_at?: string
          order_id?: string
          payment_provider?: string
          processed_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devotional_payment_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "devotional_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      devotional_payment_orders: {
        Row: {
          access_status: string
          buyer_email: string | null
          last_event_type: string
          occurred_at: string
          order_id: string
          payment_provider: string
          user_id: string | null
        }
        Insert: {
          access_status: string
          buyer_email?: string | null
          last_event_type: string
          occurred_at: string
          order_id: string
          payment_provider: string
          user_id?: string | null
        }
        Update: {
          access_status?: string
          buyer_email?: string | null
          last_event_type?: string
          occurred_at?: string
          order_id?: string
          payment_provider?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devotional_payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "devotional_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      devotional_profiles: {
        Row: {
          created_at: string
          email: string | null
          last_activity_at: string | null
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          last_activity_at?: string | null
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          last_activity_at?: string | null
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      devotional_sample_invites: {
        Row: {
          code_hash: string
          created_at: string
          enabled: boolean
          expires_at: string | null
          id: string
          label: string
          max_uses: number | null
          used_count: number
        }
        Insert: {
          code_hash: string
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          label: string
          max_uses?: number | null
          used_count?: number
        }
        Update: {
          code_hash?: string
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          label?: string
          max_uses?: number | null
          used_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_devotional_payment_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_occurred_at: string
          p_order_id: string
          p_provider: string
          p_user_id: string
        }
        Returns: boolean
      }
      assert_devotional_access: { Args: never; Returns: string }
      claim_devotional_purchases: { Args: never; Returns: number }
      complete_devotional_day: { Args: { p_day: number }; Returns: Json }
      get_devotional_progress: { Args: never; Returns: Json }
      link_devotional_purchases: {
        Args: { p_user_id: string }
        Returns: number
      }
      record_devotional_purchase_event: {
        Args: {
          p_email: string
          p_event_id: string
          p_event_type: string
          p_occurred_at: string
          p_order_id: string
          p_provider: string
        }
        Returns: string
      }
      redeem_devotional_sample: { Args: { p_code: string }; Returns: string }
      refresh_devotional_access: {
        Args: { p_user_id: string }
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
