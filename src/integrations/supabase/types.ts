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
      analytics_snapshots: {
        Row: {
          created_at: string | null
          id: string
          metric_type: string
          metric_value: Json
          snapshot_date: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_type: string
          metric_value: Json
          snapshot_date: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_type?: string
          metric_value?: Json
          snapshot_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "analytics_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      automation_logs: {
        Row: {
          actions_executed: Json | null
          case_id: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          rule_id: string | null
          rule_name: string
          status: string
          tenant_id: string
          trigger_data: Json | null
          trigger_event: string
        }
        Insert: {
          actions_executed?: Json | null
          case_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          rule_id?: string | null
          rule_name: string
          status: string
          tenant_id: string
          trigger_data?: Json | null
          trigger_event: string
        }
        Update: {
          actions_executed?: Json | null
          case_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          rule_id?: string | null
          rule_name?: string
          status?: string
          tenant_id?: string
          trigger_data?: Json | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_activity_summary"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "automation_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          execution_count: number | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_triggered: string | null
          name: string
          success_count: number | null
          tenant_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          name: string
          success_count?: number | null
          tenant_id: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_count?: number | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          name?: string
          success_count?: number | null
          tenant_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
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
          authority_id: string | null
          case_number: string
          client_id: string
          created_at: string | null
          description: string | null
          forum_id: string | null
          id: string
          interest_amount: number | null
          next_hearing_date: string | null
          notice_date: string | null
          notice_no: string | null
          notice_type: string | null
          owner_id: string | null
          penalty_amount: number | null
          priority: string | null
          reply_due_date: string | null
          stage_code: string | null
          status: string | null
          tax_demand: number | null
          tenant_id: string
          title: string
          total_demand: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          authority_id?: string | null
          case_number: string
          client_id: string
          created_at?: string | null
          description?: string | null
          forum_id?: string | null
          id?: string
          interest_amount?: number | null
          next_hearing_date?: string | null
          notice_date?: string | null
          notice_no?: string | null
          notice_type?: string | null
          owner_id?: string | null
          penalty_amount?: number | null
          priority?: string | null
          reply_due_date?: string | null
          stage_code?: string | null
          status?: string | null
          tax_demand?: number | null
          tenant_id: string
          title: string
          total_demand?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          authority_id?: string | null
          case_number?: string
          client_id?: string
          created_at?: string | null
          description?: string | null
          forum_id?: string | null
          id?: string
          interest_amount?: number | null
          next_hearing_date?: string | null
          notice_date?: string | null
          notice_no?: string | null
          notice_type?: string | null
          owner_id?: string | null
          penalty_amount?: number | null
          priority?: string | null
          reply_due_date?: string | null
          stage_code?: string | null
          status?: string | null
          tax_demand?: number | null
          tenant_id?: string
          title?: string
          total_demand?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "courts"
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
      client_groups: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string
          total_clients: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          total_clients?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          total_clients?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          city: string | null
          client_group_id: string | null
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
          client_group_id?: string | null
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
          client_group_id?: string | null
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
            foreignKeyName: "clients_client_group_id_fkey"
            columns: ["client_group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
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
      courts: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          created_at: string
          created_by: string | null
          established_year: number | null
          id: string
          jurisdiction: string | null
          level: string | null
          name: string
          state: string | null
          tenant_id: string
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          established_year?: number | null
          id?: string
          jurisdiction?: string | null
          level?: string | null
          name: string
          state?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          established_year?: number | null
          id?: string
          jurisdiction?: string | null
          level?: string | null
          name?: string
          state?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "courts_tenant_id_fkey"
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
          is_default: boolean | null
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
          id: string
          is_default?: boolean | null
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
          is_default?: boolean | null
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
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_directory"
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
      employees: {
        Row: {
          aadhaar: string | null
          ai_access: boolean | null
          alternate_contact: string | null
          areas_of_practice: string[] | null
          bar_council_no: string | null
          billable: boolean | null
          billing_rate: number | null
          blood_group: string | null
          branch: string | null
          city: string | null
          confirmation_date: string | null
          created_at: string | null
          created_by: string | null
          current_address: string | null
          data_scope: string | null
          date_of_joining: string | null
          default_task_category: string | null
          department: string
          designation: string | null
          dob: string | null
          documents: Json | null
          email: string
          employee_code: string
          employment_type: string | null
          experience_years: number | null
          full_name: string
          gender: string | null
          graduation_year: number | null
          gst_practitioner_id: string | null
          icai_no: string | null
          id: string
          incentive_eligible: boolean | null
          manager_id: string | null
          mobile: string | null
          module_access: string[] | null
          notes: string | null
          official_email: string | null
          pan: string | null
          permanent_address: string | null
          personal_email: string | null
          pincode: string | null
          profile_photo: string | null
          qualification: string | null
          reporting_to: string | null
          role: string
          specialization: string[] | null
          state: string | null
          status: string | null
          tenant_id: string
          university: string | null
          updated_at: string | null
          updated_by: string | null
          weekly_off: string | null
          whatsapp_access: boolean | null
          work_shift: string | null
          workload_capacity: number | null
        }
        Insert: {
          aadhaar?: string | null
          ai_access?: boolean | null
          alternate_contact?: string | null
          areas_of_practice?: string[] | null
          bar_council_no?: string | null
          billable?: boolean | null
          billing_rate?: number | null
          blood_group?: string | null
          branch?: string | null
          city?: string | null
          confirmation_date?: string | null
          created_at?: string | null
          created_by?: string | null
          current_address?: string | null
          data_scope?: string | null
          date_of_joining?: string | null
          default_task_category?: string | null
          department: string
          designation?: string | null
          dob?: string | null
          documents?: Json | null
          email: string
          employee_code: string
          employment_type?: string | null
          experience_years?: number | null
          full_name: string
          gender?: string | null
          graduation_year?: number | null
          gst_practitioner_id?: string | null
          icai_no?: string | null
          id: string
          incentive_eligible?: boolean | null
          manager_id?: string | null
          mobile?: string | null
          module_access?: string[] | null
          notes?: string | null
          official_email?: string | null
          pan?: string | null
          permanent_address?: string | null
          personal_email?: string | null
          pincode?: string | null
          profile_photo?: string | null
          qualification?: string | null
          reporting_to?: string | null
          role: string
          specialization?: string[] | null
          state?: string | null
          status?: string | null
          tenant_id: string
          university?: string | null
          updated_at?: string | null
          updated_by?: string | null
          weekly_off?: string | null
          whatsapp_access?: boolean | null
          work_shift?: string | null
          workload_capacity?: number | null
        }
        Update: {
          aadhaar?: string | null
          ai_access?: boolean | null
          alternate_contact?: string | null
          areas_of_practice?: string[] | null
          bar_council_no?: string | null
          billable?: boolean | null
          billing_rate?: number | null
          blood_group?: string | null
          branch?: string | null
          city?: string | null
          confirmation_date?: string | null
          created_at?: string | null
          created_by?: string | null
          current_address?: string | null
          data_scope?: string | null
          date_of_joining?: string | null
          default_task_category?: string | null
          department?: string
          designation?: string | null
          dob?: string | null
          documents?: Json | null
          email?: string
          employee_code?: string
          employment_type?: string | null
          experience_years?: number | null
          full_name?: string
          gender?: string | null
          graduation_year?: number | null
          gst_practitioner_id?: string | null
          icai_no?: string | null
          id?: string
          incentive_eligible?: boolean | null
          manager_id?: string | null
          mobile?: string | null
          module_access?: string[] | null
          notes?: string | null
          official_email?: string | null
          pan?: string | null
          permanent_address?: string | null
          personal_email?: string | null
          pincode?: string | null
          profile_photo?: string | null
          qualification?: string | null
          reporting_to?: string | null
          role?: string
          specialization?: string[] | null
          state?: string | null
          status?: string | null
          tenant_id?: string
          university?: string | null
          updated_at?: string | null
          updated_by?: string | null
          weekly_off?: string | null
          whatsapp_access?: boolean | null
          work_shift?: string | null
          workload_capacity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employee_productivity_metrics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "employee_productivity_metrics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hearings: {
        Row: {
          authority_id: string | null
          case_id: string
          court_id: string | null
          court_name: string | null
          created_at: string | null
          forum_id: string | null
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
          authority_id?: string | null
          case_id: string
          court_id?: string | null
          court_name?: string | null
          created_at?: string | null
          forum_id?: string | null
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
          authority_id?: string | null
          case_id?: string
          court_id?: string | null
          court_name?: string | null
          created_at?: string | null
          forum_id?: string | null
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
            foreignKeyName: "hearings_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "hearings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "courts"
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
      issue_types: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          frequency_count: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          frequency_count?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          frequency_count?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      judges: {
        Row: {
          court_id: string | null
          created_at: string
          created_by: string | null
          designation: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          court_id?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          court_id?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judges_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "judges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_baselines: {
        Row: {
          baseline_value: number | null
          created_at: string | null
          created_by: string | null
          effective_from: string
          id: string
          metric_name: string
          period: string | null
          target_value: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          baseline_value?: number | null
          created_at?: string | null
          created_by?: string | null
          effective_from: string
          id?: string
          metric_name: string
          period?: string | null
          target_value?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          baseline_value?: number | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          id?: string
          metric_name?: string
          period?: string | null
          target_value?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_baselines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_baselines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "performance_baselines_tenant_id_fkey"
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
      report_execution_log: {
        Row: {
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          file_size_bytes: number | null
          id: string
          row_count: number | null
          scheduled_report_id: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          file_size_bytes?: number | null
          id?: string
          row_count?: number | null
          scheduled_report_id?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          file_size_bytes?: number | null
          id?: string
          row_count?: number | null
          scheduled_report_id?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_execution_log_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_execution_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "report_execution_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          filters: Json | null
          format: string | null
          id: string
          include_charts: boolean | null
          last_error: string | null
          last_run: string | null
          next_run: string | null
          recipients: string[]
          report_name: string
          report_type: string
          schedule_cron: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          filters?: Json | null
          format?: string | null
          id?: string
          include_charts?: boolean | null
          last_error?: string | null
          last_run?: string | null
          next_run?: string | null
          recipients: string[]
          report_name: string
          report_type: string
          schedule_cron: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          filters?: Json | null
          format?: string | null
          id?: string
          include_charts?: boolean | null
          last_error?: string | null
          last_run?: string | null
          next_run?: string | null
          recipients?: string[]
          report_name?: string
          report_type?: string
          schedule_cron?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "scheduled_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_encrypted: boolean | null
          setting_key: string
          setting_value: Json
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          setting_key: string
          setting_value: Json
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          setting_key?: string
          setting_value?: Json
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      task_bundle_items: {
        Row: {
          assigned_role: string | null
          bundle_id: string
          created_at: string | null
          description: string | null
          due_days: number | null
          id: string
          order_index: number
          priority: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          assigned_role?: string | null
          bundle_id: string
          created_at?: string | null
          description?: string | null
          due_days?: number | null
          id?: string
          order_index: number
          priority?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          assigned_role?: string | null
          bundle_id?: string
          created_at?: string | null
          description?: string | null
          due_days?: number | null
          id?: string
          order_index?: number
          priority?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "task_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_bundle_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_bundle_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_bundles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_used_at: string | null
          name: string
          stage_codes: string[] | null
          tenant_id: string
          trigger_event: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_used_at?: string | null
          name: string
          stage_codes?: string[] | null
          tenant_id: string
          trigger_event: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_used_at?: string | null
          name?: string
          stage_codes?: string[] | null
          tenant_id?: string
          trigger_event?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_bundles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_bundles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_bundles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_followups: {
        Row: {
          client_interaction: boolean | null
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          internal_review: boolean | null
          outcome: string | null
          status: string | null
          task_id: string
          tenant_id: string
          work_date: string
        }
        Insert: {
          client_interaction?: boolean | null
          created_at?: string
          created_by: string
          created_by_name: string
          id?: string
          internal_review?: boolean | null
          outcome?: string | null
          status?: string | null
          task_id: string
          tenant_id: string
          work_date: string
        }
        Update: {
          client_interaction?: boolean | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          id?: string
          internal_review?: boolean | null
          outcome?: string | null
          status?: string | null
          task_id?: string
          tenant_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_followups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_followups_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          metadata: Json | null
          note: string
          task_id: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_name: string
          id?: string
          metadata?: Json | null
          note: string
          task_id: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_name?: string
          id?: string
          metadata?: Json | null
          note?: string
          task_id?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_notes_tenant_id_fkey"
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
      timeline_entries: {
        Row: {
          case_id: string
          created_at: string | null
          created_by: string
          created_by_name: string | null
          description: string
          id: string
          metadata: Json | null
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          case_id: string
          created_at?: string | null
          created_by: string
          created_by_name?: string | null
          description: string
          id: string
          metadata?: Json | null
          tenant_id: string
          title: string
          type: string
        }
        Update: {
          case_id?: string
          created_at?: string | null
          created_by?: string
          created_by_name?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_activity_summary"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "timeline_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
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
      audit_log_with_user_details: {
        Row: {
          action_type: string | null
          details: Json | null
          document_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          ip_address: unknown
          tenant_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_designation: string | null
          user_id: string | null
          user_name: string | null
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
      case_analytics_summary: {
        Row: {
          active_cases: number | null
          avg_age_days: number | null
          breached_cases: number | null
          completed_cases: number | null
          critical_cases: number | null
          stage_code: string | null
          tenant_id: string | null
          total_cases: number | null
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
      clients_directory: {
        Row: {
          city: string | null
          client_group_id: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          owner_id: string | null
          state: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          client_group_id?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          owner_id?: string | null
          state?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          client_group_id?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          owner_id?: string | null
          state?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_client_group_id_fkey"
            columns: ["client_group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
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
      employee_productivity_metrics: {
        Row: {
          assigned_cases: number | null
          assigned_tasks: number | null
          avg_task_completion_days: number | null
          completed_tasks: number | null
          employee_code: string | null
          employee_id: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hearing_outcome_trends: {
        Row: {
          completion_rate: number | null
          count: number | null
          period: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
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
      timeline_compliance_trends: {
        Row: {
          adjourned_hearings: number | null
          completed_hearings: number | null
          compliance_rate: number | null
          period: string | null
          tenant_id: string | null
          total_hearings: number | null
        }
        Relationships: [
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
