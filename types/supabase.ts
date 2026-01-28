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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      classes: {
        Row: {
          created_at: string
          finished_lessons: string[] | null
          fixed_class_id: string
          grade: number | null
          id: string
          level: string | null
          num_finished_lessons: number | null
          num_students: number | null
          schedule: Json | null
          state: string | null
          students: Json | null
          time: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          finished_lessons?: string[] | null
          fixed_class_id: string
          grade?: number | null
          id?: string
          level?: string | null
          num_finished_lessons?: number | null
          num_students?: number | null
          schedule?: Json | null
          state?: string | null
          students?: Json | null
          time?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          finished_lessons?: string[] | null
          fixed_class_id?: string
          grade?: number | null
          id?: string
          level?: string | null
          num_finished_lessons?: number | null
          num_students?: number | null
          schedule?: Json | null
          state?: string | null
          students?: Json | null
          time?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          atmosphere_checked: boolean | null
          atmosphere_value: string | null
          attitude_mode: string | null
          class_id: string | null
          created_at: string
          grade: number | null
          included_attitude_categories: Json | null
          included_criteria: Json | null
          knowledge_mode: string | null
          lesson_content: string | null
          level: string | null
          progress_checked: boolean | null
          progress_value: string | null
          reminders: Json | null
          school_level: string | null
          session_number: number | null
          student_count: number | null
          students: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          atmosphere_checked?: boolean | null
          atmosphere_value?: string | null
          attitude_mode?: string | null
          class_id?: string | null
          created_at?: string
          grade?: number | null
          included_attitude_categories?: Json | null
          included_criteria?: Json | null
          knowledge_mode?: string | null
          lesson_content?: string | null
          level?: string | null
          progress_checked?: boolean | null
          progress_value?: string | null
          reminders?: Json | null
          school_level?: string | null
          session_number?: number | null
          student_count?: number | null
          students?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          atmosphere_checked?: boolean | null
          atmosphere_value?: string | null
          attitude_mode?: string | null
          class_id?: string | null
          created_at?: string
          grade?: number | null
          included_attitude_categories?: Json | null
          included_criteria?: Json | null
          knowledge_mode?: string | null
          lesson_content?: string | null
          level?: string | null
          progress_checked?: boolean | null
          progress_value?: string | null
          reminders?: Json | null
          school_level?: string | null
          session_number?: number | null
          student_count?: number | null
          students?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          pay_rate: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          email: string
          full_name: string
          gender?: string | null
          id: string
          pay_rate?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          pay_rate?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      records: {
        Row: {
          absent: boolean | null
          atmosphere_checked: boolean | null
          atmosphere_value: string | null
          class_id: string | null
          class_type: string | null
          created_at: string
          date: string | null
          feedback_status: string | null
          grade: number | null
          id: string
          lesson_content: string | null
          level: string | null
          pay_rate: string | null
          progress_checked: boolean | null
          progress_value: string | null
          rate: number | null
          reminders: string[] | null
          session_number: number | null
          status: string | null
          student_count: number | null
          students: Json | null
          time_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          absent?: boolean | null
          atmosphere_checked?: boolean | null
          atmosphere_value?: string | null
          class_id?: string | null
          class_type?: string | null
          created_at?: string
          date?: string | null
          feedback_status?: string | null
          grade?: number | null
          id?: string
          lesson_content?: string | null
          level?: string | null
          pay_rate?: string | null
          progress_checked?: boolean | null
          progress_value?: string | null
          rate?: number | null
          reminders?: string[] | null
          session_number?: number | null
          status?: string | null
          student_count?: number | null
          students?: Json | null
          time_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          absent?: boolean | null
          atmosphere_checked?: boolean | null
          atmosphere_value?: string | null
          class_id?: string | null
          class_type?: string | null
          created_at?: string
          date?: string | null
          feedback_status?: string | null
          grade?: number | null
          id?: string
          lesson_content?: string | null
          level?: string | null
          pay_rate?: string | null
          progress_checked?: boolean | null
          progress_value?: string | null
          rate?: number | null
          reminders?: string[] | null
          session_number?: number | null
          status?: string | null
          student_count?: number | null
          students?: Json | null
          time_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finished: {
        Args: { cls: Database["public"]["Tables"]["classes"]["Row"] }
        Returns: number
      }
      get_classes_for_calendar: {
        Args: { token: string }
        Returns: {
          class_time: string
          fixed_class_id: string
          schedule: string[]
          state: string
        }[]
      }
      get_or_create_calendar_token: { Args: never; Returns: string }
      get_user_by_calendar_token: { Args: { token: string }; Returns: string }
      regenerate_calendar_token: { Args: never; Returns: string }
      reset_lesson_draft: { Args: never; Returns: undefined }
      update_global_pay_rate: { Args: { new_rate: string }; Returns: undefined }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
