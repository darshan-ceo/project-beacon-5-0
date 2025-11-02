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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action_type: string
          details: Json | null
          document_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          tenant_id: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          details?: Json | null
          document_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          tenant_id: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          details?: Json | null
          document_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          tenant_id?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pending_review_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          assigned_to: string | null
          case_number: string
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          notice_date: string | null
          notice_no: string | null
          notice_type: string | null
          owner_id: string | null
          priority: string | null
          stage_code: string | null
          status: string | null
          tax_demand: number | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          case_number: string
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          notice_date?: string | null
          notice_no?: string | null
          notice_type?: string | null
          owner_id?: string | null
          priority?: string | null
          stage_code?: string | null
          status?: string | null
          tax_demand?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          case_number?: string
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          notice_date?: string | null
          notice_no?: string | null
          notice_type?: string | null
          owner_id?: string | null
          priority?: string | null
          stage_code?: string | null
          status?: string | null
          tax_demand?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          city: string | null
          created_at: string | null
          display_name: string
          email: string | null
          gstin: string | null
          id: string
          owner_id: string | null
          pan: string | null
          phone: string | null
          state: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          display_name: string
          email?: string | null
          gstin?: string | null
          id?: string
          owner_id?: string | null
          pan?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          display_name?: string
          email?: string | null
          gstin?: string | null
          id?: string
          owner_id?: string | null
          pan?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          case_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          path: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          path: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          path?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_activity_summary"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "document_folders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "document_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tags: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          tag: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pending_review_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_notes: string | null
          document_id: string
          file_path: string
          file_size: number
          id: string
          upload_timestamp: string | null
          uploaded_by: string
          version_no: number
        }
        Insert: {
          change_notes?: string | null
          document_id: string
          file_path: string
          file_size: number
          id?: string
          upload_timestamp?: string | null
          uploaded_by: string
          version_no: number
        }
        Update: {
          change_notes?: string | null
          document_id?: string
          file_path?: string
          file_size?: number
          id?: string
          upload_timestamp?: string | null
          uploaded_by?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pending_review_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string | null
          category: string | null
          client_id: string | null
          created_at: string | null
          document_status: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_id: string | null
          hearing_id: string | null
          id: string
          is_latest_version: boolean | null
          mime_type: string | null
          parent_document_id: string | null
          remarks: string | null
          review_date: string | null
          review_remarks: string | null
          reviewer_id: string | null
          role: string | null
          storage_url: string | null
          task_id: string | null
          tenant_id: string
          updated_at: string | null
          upload_timestamp: string | null
          uploaded_by: string
          version: number | null
        }
        Insert: {
          case_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          document_status?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_id?: string | null
          hearing_id?: string | null
          id?: string
          is_latest_version?: boolean | null
          mime_type?: string | null
          parent_document_id?: string | null
          remarks?: string | null
          review_date?: string | null
          review_remarks?: string | null
          reviewer_id?: string | null
          role?: string | null
          storage_url?: string | null
          task_id?: string | null
          tenant_id: string
          updated_at?: string | null
          upload_timestamp?: string | null
          uploaded_by: string
          version?: number | null
        }
        Update: {
          case_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          document_status?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          folder_id?: string | null
          hearing_id?: string | null
          id?: string
          is_latest_version?: boolean | null
          mime_type?: string | null
          parent_document_id?: string | null
          remarks?: string | null
          review_date?: string | null
          review_remarks?: string | null
          reviewer_id?: string | null
          role?: string | null
          storage_url?: string | null
          task_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          upload_timestamp?: string | null
          uploaded_by?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_activity_summary"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_hearing_id_fkey"
            columns: ["hearing_id"]
            isOneToOne: false
            referencedRelation: "hearings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "pending_review_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hearings: {
        Row: {
          case_id: string
          court_name: string | null
          created_at: string | null
          hearing_date: string
          id: string
          judge_name: string | null
          next_hearing_date: string | null
          notes: string | null
          outcome: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          case_id: string
          court_name?: string | null
          created_at?: string | null
          hearing_date: string
          id?: string
          judge_name?: string | null
          next_hearing_date?: string | null
          notes?: string | null
          outcome?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          case_id?: string
          court_name?: string | null
          created_at?: string | null
          hearing_date?: string
          id?: string
          judge_name?: string | null
          next_hearing_date?: string | null
          notes?: string | null
          outcome?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hearings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_activity_summary"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "hearings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "hearings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          designation: string | null
          full_name: string | null
          id: string
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          designation?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          designation?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          case_id: string | null
          completed_date: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          hearing_id: string | null
          id: string
          priority: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          case_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          hearing_id?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          case_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          hearing_id?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_activity_summary"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_hearing_id_fkey"
            columns: ["hearing_id"]
            isOneToOne: false
            referencedRelation: "hearings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          license_key: string
          license_tier: Database["public"]["Enums"]["license_tier"]
          max_cases: number | null
          max_storage_gb: number | null
          max_users: number | null
          name: string
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_key: string
          license_tier?: Database["public"]["Enums"]["license_tier"]
          max_cases?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          name: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_key?: string
          license_tier?: Database["public"]["Enums"]["license_tier"]
          max_cases?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          name?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      case_activity_summary: {
        Row: {
          case_id: string | null
          case_number: string | null
          document_count: number | null
          hearing_count: number | null
          last_document_date: string | null
          last_hearing_date: string | null
          last_task_update: string | null
          status: string | null
          task_count: number | null
          tenant_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_by_category: {
        Row: {
          avg_file_size_bytes: number | null
          category: string | null
          document_count: number | null
          tenant_id: string | null
          total_size_bytes: number | null
          unique_cases: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_by_user: {
        Row: {
          approved_count: number | null
          pending_count: number | null
          rejected_count: number | null
          tenant_id: string | null
          total_documents: number | null
          total_storage_bytes: number | null
          uploaded_by: string | null
          uploader_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_review_documents: {
        Row: {
          case_number: string | null
          case_title: string | null
          category: string | null
          days_pending: number | null
          file_name: string | null
          id: string | null
          tenant_id: string | null
          upload_timestamp: string | null
          uploaded_by: string | null
          uploader_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_usage_by_tenant: {
        Row: {
          license_tier: Database["public"]["Enums"]["license_tier"] | null
          max_storage_gb: number | null
          storage_remaining_bytes: number | null
          storage_used_bytes: number | null
          storage_used_percentage: number | null
          tenant_id: string | null
          tenant_name: string | null
          total_documents: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_tenant_limits: {
        Args: { _limit_type: string; _tenant_id: string }
        Returns: boolean
      }
      get_user_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "partner"
        | "admin"
        | "manager"
        | "ca"
        | "advocate"
        | "staff"
        | "clerk"
        | "client"
        | "user"
      license_tier: "trial" | "basic" | "professional" | "enterprise"
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
  public: {
    Enums: {
      app_role: [
        "partner",
        "admin",
        "manager",
        "ca",
        "advocate",
        "staff",
        "clerk",
        "client",
        "user",
      ],
      license_tier: ["trial", "basic", "professional", "enterprise"],
    },
  },
} as const
