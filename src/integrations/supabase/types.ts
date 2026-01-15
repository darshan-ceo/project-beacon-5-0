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
      case_statutory_deadlines: {
        Row: {
          base_date: string
          calculated_deadline: string
          case_id: string
          completed_date: string | null
          created_at: string | null
          event_type_id: string
          extension_count: number | null
          extension_deadline: string | null
          id: string
          remarks: string | null
          status: string | null
          task_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          base_date: string
          calculated_deadline: string
          case_id: string
          completed_date?: string | null
          created_at?: string | null
          event_type_id: string
          extension_count?: number | null
          extension_deadline?: string | null
          id?: string
          remarks?: string | null
          status?: string | null
          task_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          base_date?: string
          calculated_deadline?: string
          case_id?: string
          completed_date?: string | null
          created_at?: string | null
          event_type_id?: string
          extension_count?: number | null
          extension_deadline?: string | null
          id?: string
          remarks?: string | null
          status?: string | null
          task_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_statutory_deadlines_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_activity_summary"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_statutory_deadlines_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_statutory_deadlines_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "statutory_event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_statutory_deadlines_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_statutory_deadlines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "case_statutory_deadlines_tenant_id_fkey"
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
          case_sequence: string | null
          case_type: string | null
          case_year: string | null
          city: string | null
          client_id: string
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          completion_reason: string | null
          created_at: string | null
          description: string | null
          financial_year: string | null
          form_type: string | null
          forum_id: string | null
          id: string
          interest_amount: number | null
          is_read_only: boolean | null
          issue_type: string | null
          next_hearing_date: string | null
          notice_date: string | null
          notice_no: string | null
          notice_type: string | null
          office_file_no: string | null
          owner_id: string | null
          penalty_amount: number | null
          priority: string | null
          reply_due_date: string | null
          section_invoked: string | null
          stage_code: string | null
          state_bench_city: string | null
          state_bench_state: string | null
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
          case_sequence?: string | null
          case_type?: string | null
          case_year?: string | null
          city?: string | null
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          completion_reason?: string | null
          created_at?: string | null
          description?: string | null
          financial_year?: string | null
          form_type?: string | null
          forum_id?: string | null
          id?: string
          interest_amount?: number | null
          is_read_only?: boolean | null
          issue_type?: string | null
          next_hearing_date?: string | null
          notice_date?: string | null
          notice_no?: string | null
          notice_type?: string | null
          office_file_no?: string | null
          owner_id?: string | null
          penalty_amount?: number | null
          priority?: string | null
          reply_due_date?: string | null
          section_invoked?: string | null
          stage_code?: string | null
          state_bench_city?: string | null
          state_bench_state?: string | null
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
          case_sequence?: string | null
          case_type?: string | null
          case_year?: string | null
          city?: string | null
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          completion_reason?: string | null
          created_at?: string | null
          description?: string | null
          financial_year?: string | null
          form_type?: string | null
          forum_id?: string | null
          id?: string
          interest_amount?: number | null
          is_read_only?: boolean | null
          issue_type?: string | null
          next_hearing_date?: string | null
          notice_date?: string | null
          notice_no?: string | null
          notice_type?: string | null
          office_file_no?: string | null
          owner_id?: string | null
          penalty_amount?: number | null
          priority?: string | null
          reply_due_date?: string | null
          section_invoked?: string | null
          stage_code?: string | null
          state_bench_city?: string | null
          state_bench_state?: string | null
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
      client_contacts: {
        Row: {
          client_id: string | null
          created_at: string | null
          data_scope: Database["public"]["Enums"]["entity_data_scope"] | null
          designation: string | null
          emails: Json | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          name: string
          notes: string | null
          owner_user_id: string | null
          phones: Json | null
          roles: string[] | null
          source: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          data_scope?: Database["public"]["Enums"]["entity_data_scope"] | null
          designation?: string | null
          emails?: Json | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name: string
          notes?: string | null
          owner_user_id?: string | null
          phones?: Json | null
          roles?: string[] | null
          source?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          data_scope?: Database["public"]["Enums"]["entity_data_scope"] | null
          designation?: string | null
          emails?: Json | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          phones?: Json | null
          roles?: string[] | null
          source?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "client_contacts_tenant_id_fkey"
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
          head_client_id: string | null
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
          head_client_id?: string | null
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
          head_client_id?: string | null
          id?: string
          name?: string
          tenant_id?: string
          total_clients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_groups_head_client_id_fkey"
            columns: ["head_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_groups_head_client_id_fkey"
            columns: ["head_client_id"]
            isOneToOne: false
            referencedRelation: "clients_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notifications: {
        Row: {
          action_required: boolean | null
          client_id: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          tenant_id: string
          title: string
          type: string
          urgent: boolean | null
        }
        Insert: {
          action_required?: boolean | null
          client_id: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id: string
          title: string
          type: string
          urgent?: boolean | null
        }
        Update: {
          action_required?: boolean | null
          client_id?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id?: string
          title?: string
          type?: string
          urgent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "client_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_users: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          portal_role: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          portal_role?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          portal_role?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "client_portal_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: Json | null
          city: string | null
          client_group_id: string | null
          created_at: string | null
          data_scope: Database["public"]["Enums"]["entity_data_scope"] | null
          display_name: string
          email: string | null
          gstin: string | null
          id: string
          jurisdiction: Json | null
          owner_id: string | null
          pan: string | null
          phone: string | null
          portal_access: Json | null
          signatories: Json | null
          state: string | null
          status: string | null
          tenant_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          city?: string | null
          client_group_id?: string | null
          created_at?: string | null
          data_scope?: Database["public"]["Enums"]["entity_data_scope"] | null
          display_name: string
          email?: string | null
          gstin?: string | null
          id?: string
          jurisdiction?: Json | null
          owner_id?: string | null
          pan?: string | null
          phone?: string | null
          portal_access?: Json | null
          signatories?: Json | null
          state?: string | null
          status?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          city?: string | null
          client_group_id?: string | null
          created_at?: string | null
          data_scope?: Database["public"]["Enums"]["entity_data_scope"] | null
          display_name?: string
          email?: string | null
          gstin?: string | null
          id?: string
          jurisdiction?: Json | null
          owner_id?: string | null
          pan?: string | null
          phone?: string | null
          portal_access?: Json | null
          signatories?: Json | null
          state?: string | null
          status?: string | null
          tenant_id?: string
          type?: string | null
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
      communication_logs: {
        Row: {
          attachments: Json | null
          case_id: string | null
          channel: string
          client_id: string | null
          created_at: string | null
          delivered_at: string | null
          direction: string
          failure_reason: string | null
          id: string
          message: string
          message_id: string | null
          read_at: string | null
          sent_by: string | null
          sent_by_name: string | null
          sent_to: string
          sent_to_name: string | null
          status: string
          subject: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          case_id?: string | null
          channel: string
          client_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          failure_reason?: string | null
          id?: string
          message: string
          message_id?: string | null
          read_at?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          sent_to: string
          sent_to_name?: string | null
          status?: string
          subject?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          case_id?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          failure_reason?: string | null
          id?: string
          message?: string
          message_id?: string | null
          read_at?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          sent_to?: string
          sent_to_name?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_activity_summary"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "communication_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "communication_logs_tenant_id_fkey"
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
          bench_location: string | null
          city: string | null
          code: string | null
          created_at: string
          created_by: string | null
          email: string | null
          established_year: number | null
          id: string
          jurisdiction: string | null
          level: string | null
          name: string
          officer_designation: string | null
          phone: string | null
          state: string | null
          status: string | null
          tax_jurisdiction: string | null
          tenant_id: string
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bench_location?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          established_year?: number | null
          id?: string
          jurisdiction?: string | null
          level?: string | null
          name: string
          officer_designation?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          tax_jurisdiction?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bench_location?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          established_year?: number | null
          id?: string
          jurisdiction?: string | null
          level?: string | null
          name?: string
          officer_designation?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          tax_jurisdiction?: string | null
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
      custom_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
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
      escalation_events: {
        Row: {
          assigned_to: string | null
          current_level: number | null
          escalated_to: string | null
          id: string
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          status: string | null
          task_id: string | null
          tenant_id: string
          triggered_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          current_level?: number | null
          escalated_to?: string | null
          id?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          status?: string | null
          task_id?: string | null
          tenant_id: string
          triggered_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          current_level?: number | null
          escalated_to?: string | null
          id?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          status?: string | null
          task_id?: string | null
          tenant_id?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_events_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_events_escalated_to_employees_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "employee_productivity_metrics"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "escalation_events_escalated_to_employees_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "escalation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "escalation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          trigger: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          trigger: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          trigger?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_credentials: {
        Row: {
          aato_band: string | null
          access_token: string | null
          authorized_signatories: Json | null
          client_id: string
          consent_granted_at: string | null
          consent_id: string | null
          consent_revoked_at: string | null
          consent_status: string | null
          consent_valid_till: string | null
          created_at: string | null
          created_by: string | null
          e_invoice_enabled: boolean | null
          e_waybill_enabled: boolean | null
          filing_frequency: string | null
          gstin: string
          id: string
          last_sync: string | null
          refresh_token: string | null
          registered_email: string | null
          registered_mobile: string | null
          sync_error: string | null
          tenant_id: string
          token_expiry: string | null
          updated_at: string | null
        }
        Insert: {
          aato_band?: string | null
          access_token?: string | null
          authorized_signatories?: Json | null
          client_id: string
          consent_granted_at?: string | null
          consent_id?: string | null
          consent_revoked_at?: string | null
          consent_status?: string | null
          consent_valid_till?: string | null
          created_at?: string | null
          created_by?: string | null
          e_invoice_enabled?: boolean | null
          e_waybill_enabled?: boolean | null
          filing_frequency?: string | null
          gstin: string
          id?: string
          last_sync?: string | null
          refresh_token?: string | null
          registered_email?: string | null
          registered_mobile?: string | null
          sync_error?: string | null
          tenant_id: string
          token_expiry?: string | null
          updated_at?: string | null
        }
        Update: {
          aato_band?: string | null
          access_token?: string | null
          authorized_signatories?: Json | null
          client_id?: string
          consent_granted_at?: string | null
          consent_id?: string | null
          consent_revoked_at?: string | null
          consent_status?: string | null
          consent_valid_till?: string | null
          created_at?: string | null
          created_by?: string | null
          e_invoice_enabled?: boolean | null
          e_waybill_enabled?: boolean | null
          filing_frequency?: string | null
          gstin?: string
          id?: string
          last_sync?: string | null
          refresh_token?: string | null
          registered_email?: string | null
          registered_mobile?: string | null
          sync_error?: string | null
          tenant_id?: string
          token_expiry?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gst_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gst_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_return_status: {
        Row: {
          arn: string | null
          client_id: string
          created_at: string | null
          due_date: string | null
          filing_date: string | null
          filing_status: string | null
          financial_year: string | null
          gstin: string
          id: string
          interest: number | null
          is_overdue: boolean | null
          last_synced_at: string | null
          late_fee: number | null
          reference_id: string | null
          return_period: string
          return_type: string
          sync_error: string | null
          sync_source: string | null
          tax_liability: number | null
          tax_paid: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          arn?: string | null
          client_id: string
          created_at?: string | null
          due_date?: string | null
          filing_date?: string | null
          filing_status?: string | null
          financial_year?: string | null
          gstin: string
          id?: string
          interest?: number | null
          is_overdue?: boolean | null
          last_synced_at?: string | null
          late_fee?: number | null
          reference_id?: string | null
          return_period: string
          return_type: string
          sync_error?: string | null
          sync_source?: string | null
          tax_liability?: number | null
          tax_paid?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          arn?: string | null
          client_id?: string
          created_at?: string | null
          due_date?: string | null
          filing_date?: string | null
          filing_status?: string | null
          financial_year?: string | null
          gstin?: string
          id?: string
          interest?: number | null
          is_overdue?: boolean | null
          last_synced_at?: string | null
          late_fee?: number | null
          reference_id?: string | null
          return_period?: string
          return_type?: string
          sync_error?: string | null
          sync_source?: string | null
          tax_liability?: number | null
          tax_paid?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gst_return_status_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_return_status_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_return_status_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "gst_return_status_tenant_id_fkey"
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
          order_file_path: string | null
          order_file_url: string | null
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
          order_file_path?: string | null
          order_file_url?: string | null
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
          order_file_path?: string | null
          order_file_url?: string | null
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
      holidays: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          is_active: boolean | null
          name: string
          state: string | null
          tenant_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          is_active?: boolean | null
          name: string
          state?: string | null
          tenant_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          state?: string | null
          tenant_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holidays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "holidays_tenant_id_fkey"
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
          appointment_date: string | null
          assistant: Json | null
          availability: Json | null
          bench: string | null
          chambers: string | null
          city: string | null
          court_id: string | null
          created_at: string
          created_by: string | null
          designation: string | null
          email: string | null
          id: string
          jurisdiction: string | null
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          retirement_date: string | null
          specialization: string[] | null
          state: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string
          years_of_service: number | null
        }
        Insert: {
          appointment_date?: string | null
          assistant?: Json | null
          availability?: Json | null
          bench?: string | null
          chambers?: string | null
          city?: string | null
          court_id?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          jurisdiction?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          retirement_date?: string | null
          specialization?: string[] | null
          state?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
          years_of_service?: number | null
        }
        Update: {
          appointment_date?: string | null
          assistant?: Json | null
          availability?: Json | null
          bench?: string | null
          chambers?: string | null
          city?: string | null
          court_id?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          jurisdiction?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          retirement_date?: string | null
          specialization?: string[] | null
          state?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
          years_of_service?: number | null
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
      permissions: {
        Row: {
          action: string
          description: string | null
          key: string
          module: string
        }
        Insert: {
          action: string
          description?: string | null
          key: string
          module: string
        }
        Update: {
          action?: string
          description?: string | null
          key?: string
          module?: string
        }
        Relationships: []
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
      role_permissions: {
        Row: {
          created_at: string | null
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
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
      sms_config: {
        Row: {
          created_at: string | null
          daily_limit: number | null
          dlt_entity_id: string | null
          id: string
          is_active: boolean | null
          monthly_limit: number | null
          provider: string
          sender_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_limit?: number | null
          dlt_entity_id?: string | null
          id?: string
          is_active?: boolean | null
          monthly_limit?: number | null
          provider?: string
          sender_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_limit?: number | null
          dlt_entity_id?: string | null
          id?: string
          is_active?: boolean | null
          monthly_limit?: number | null
          provider?: string
          sender_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sms_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_delivery_logs: {
        Row: {
          created_at: string | null
          credits_used: number | null
          delivery_timestamp: string | null
          dlt_template_id: string | null
          error_message: string | null
          id: string
          message_text: string
          provider_message_id: string | null
          recipient_phone: string
          related_entity_id: string | null
          related_entity_type: string | null
          status: string
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          credits_used?: number | null
          delivery_timestamp?: string | null
          dlt_template_id?: string | null
          error_message?: string | null
          id?: string
          message_text: string
          provider_message_id?: string | null
          recipient_phone: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          credits_used?: number | null
          delivery_timestamp?: string | null
          dlt_template_id?: string | null
          error_message?: string | null
          id?: string
          message_text?: string
          provider_message_id?: string | null
          recipient_phone?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_delivery_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sms_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_delivery_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sms_delivery_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          category: string
          character_count: number | null
          created_at: string | null
          created_by: string | null
          dlt_template_id: string | null
          id: string
          is_active: boolean | null
          name: string
          template_text: string
          tenant_id: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          category?: string
          character_count?: number | null
          created_at?: string | null
          created_by?: string | null
          dlt_template_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_text: string
          tenant_id: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          category?: string
          character_count?: number | null
          created_at?: string | null
          created_by?: string | null
          dlt_template_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_text?: string
          tenant_id?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sms_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_transition_approvals: {
        Row: {
          action: string
          actor_id: string
          actor_role: string | null
          comments: string | null
          created_at: string | null
          id: string
          tenant_id: string
          transition_id: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_role?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          tenant_id: string
          transition_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          tenant_id?: string
          transition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_transition_approvals_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transition_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stage_transition_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transition_approvals_transition_id_fkey"
            columns: ["transition_id"]
            isOneToOne: false
            referencedRelation: "stage_transitions"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_transitions: {
        Row: {
          actor_role: string | null
          approval_comments: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          case_id: string
          client_visible_summary: string | null
          comments: string | null
          created_at: string | null
          created_by: string
          from_stage: string | null
          id: string
          is_confirmed: boolean | null
          order_date: string | null
          order_document_id: string | null
          order_number: string | null
          override_reason: string | null
          preserves_future_history: boolean | null
          reason_category: string | null
          reason_details: string | null
          remand_type: string | null
          requires_approval: boolean | null
          tenant_id: string
          to_stage: string
          transition_type: string
          validation_status: string | null
          validation_warnings: string[] | null
        }
        Insert: {
          actor_role?: string | null
          approval_comments?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          case_id: string
          client_visible_summary?: string | null
          comments?: string | null
          created_at?: string | null
          created_by: string
          from_stage?: string | null
          id?: string
          is_confirmed?: boolean | null
          order_date?: string | null
          order_document_id?: string | null
          order_number?: string | null
          override_reason?: string | null
          preserves_future_history?: boolean | null
          reason_category?: string | null
          reason_details?: string | null
          remand_type?: string | null
          requires_approval?: boolean | null
          tenant_id: string
          to_stage: string
          transition_type: string
          validation_status?: string | null
          validation_warnings?: string[] | null
        }
        Update: {
          actor_role?: string | null
          approval_comments?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          case_id?: string
          client_visible_summary?: string | null
          comments?: string | null
          created_at?: string | null
          created_by?: string
          from_stage?: string | null
          id?: string
          is_confirmed?: boolean | null
          order_date?: string | null
          order_document_id?: string | null
          order_number?: string | null
          override_reason?: string | null
          preserves_future_history?: boolean | null
          reason_category?: string | null
          reason_details?: string | null
          remand_type?: string | null
          requires_approval?: boolean | null
          tenant_id?: string
          to_stage?: string
          transition_type?: string
          validation_status?: string | null
          validation_warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stage_transitions_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transitions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transitions_order_document_id_fkey"
            columns: ["order_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transitions_order_document_id_fkey"
            columns: ["order_document_id"]
            isOneToOne: false
            referencedRelation: "pending_review_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      statutory_acts: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statutory_acts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "statutory_acts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      statutory_event_types: {
        Row: {
          act_id: string
          base_date_type: string
          code: string
          created_at: string | null
          created_by: string | null
          deadline_count: number
          deadline_type: string
          description: string | null
          extension_allowed: boolean | null
          extension_days: number | null
          id: string
          is_active: boolean | null
          legal_reference: string | null
          max_extension_count: number | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          act_id: string
          base_date_type?: string
          code: string
          created_at?: string | null
          created_by?: string | null
          deadline_count?: number
          deadline_type?: string
          description?: string | null
          extension_allowed?: boolean | null
          extension_days?: number | null
          id?: string
          is_active?: boolean | null
          legal_reference?: string | null
          max_extension_count?: number | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          act_id?: string
          base_date_type?: string
          code?: string
          created_at?: string | null
          created_by?: string | null
          deadline_count?: number
          deadline_type?: string
          description?: string | null
          extension_allowed?: boolean | null
          extension_days?: number | null
          id?: string
          is_active?: boolean | null
          legal_reference?: string | null
          max_extension_count?: number | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statutory_event_types_act_id_fkey"
            columns: ["act_id"]
            isOneToOne: false
            referencedRelation: "statutory_acts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statutory_event_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "statutory_event_types_tenant_id_fkey"
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
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          tenant_id: string
          usage_count: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          usage_count?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          usage_count?: number
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
      task_creation_footprints: {
        Row: {
          case_id: string
          created_at: string
          id: string
          stage: string
          task_id: string
          template_id: string
          tenant_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          stage: string
          task_id: string
          template_id: string
          tenant_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          stage?: string
          task_id?: string
          template_id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      task_followups: {
        Row: {
          attachments: Json | null
          blockers: string | null
          client_interaction: boolean | null
          created_at: string
          created_by: string
          created_by_name: string
          escalation_requested: boolean | null
          hours_logged: number | null
          id: string
          internal_review: boolean | null
          next_actions: string | null
          next_follow_up_date: string | null
          outcome: string | null
          remarks: string | null
          status: string | null
          support_needed: boolean | null
          task_id: string
          tenant_id: string
          work_date: string
        }
        Insert: {
          attachments?: Json | null
          blockers?: string | null
          client_interaction?: boolean | null
          created_at?: string
          created_by: string
          created_by_name: string
          escalation_requested?: boolean | null
          hours_logged?: number | null
          id?: string
          internal_review?: boolean | null
          next_actions?: string | null
          next_follow_up_date?: string | null
          outcome?: string | null
          remarks?: string | null
          status?: string | null
          support_needed?: boolean | null
          task_id: string
          tenant_id: string
          work_date: string
        }
        Update: {
          attachments?: Json | null
          blockers?: string | null
          client_interaction?: boolean | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          escalation_requested?: boolean | null
          hours_logged?: number | null
          id?: string
          internal_review?: boolean | null
          next_actions?: string | null
          next_follow_up_date?: string | null
          outcome?: string | null
          remarks?: string | null
          status?: string | null
          support_needed?: boolean | null
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
      task_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          created_by: string | null
          created_by_name: string
          id: string
          is_system_message: boolean | null
          message: string
          status_update: string | null
          task_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          created_by?: string | null
          created_by_name: string
          id?: string
          is_system_message?: boolean | null
          message: string
          status_update?: string | null
          task_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          is_system_message?: boolean | null
          message?: string
          status_update?: string | null
          task_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "task_messages_tenant_id_fkey"
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
          actual_hours: number | null
          assigned_by: string | null
          assigned_to: string | null
          attachments: Json | null
          bundle_id: string | null
          case_id: string | null
          case_number: string | null
          client_id: string | null
          completed_date: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          due_date_validated: boolean | null
          escalation_level: number | null
          estimated_hours: number | null
          hearing_id: string | null
          id: string
          is_auto_generated: boolean | null
          priority: string | null
          stage: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string
          timezone: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_by?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          bundle_id?: string | null
          case_id?: string | null
          case_number?: string | null
          client_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_date_validated?: boolean | null
          escalation_level?: number | null
          estimated_hours?: number | null
          hearing_id?: string | null
          id?: string
          is_auto_generated?: boolean | null
          priority?: string | null
          stage?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id: string
          timezone?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_by?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          bundle_id?: string | null
          case_id?: string | null
          case_number?: string | null
          client_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_date_validated?: boolean | null
          escalation_level?: number | null
          estimated_hours?: number | null
          hearing_id?: string | null
          id?: string
          is_auto_generated?: boolean | null
          priority?: string | null
          stage?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string
          timezone?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "task_bundles"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_directory"
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
      whatsapp_config: {
        Row: {
          created_at: string | null
          daily_limit: number | null
          id: string
          instance_id: string | null
          is_active: boolean | null
          monthly_limit: number | null
          provider: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          instance_id?: string | null
          is_active?: boolean | null
          monthly_limit?: number | null
          provider?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          instance_id?: string | null
          is_active?: boolean | null
          monthly_limit?: number | null
          provider?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "whatsapp_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_delivery_logs: {
        Row: {
          created_at: string | null
          credits_used: number | null
          delivery_timestamp: string | null
          error_message: string | null
          id: string
          message_text: string
          provider_message_id: string | null
          recipient_phone: string
          related_entity_id: string | null
          related_entity_type: string | null
          status: string
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          credits_used?: number | null
          delivery_timestamp?: string | null
          error_message?: string | null
          id?: string
          message_text: string
          provider_message_id?: string | null
          recipient_phone: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          credits_used?: number | null
          delivery_timestamp?: string | null
          error_message?: string | null
          id?: string
          message_text?: string
          provider_message_id?: string | null
          recipient_phone?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_delivery_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sms_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_delivery_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "storage_usage_by_tenant"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "whatsapp_delivery_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      can_user_view_case: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      can_user_view_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      can_user_view_contact: {
        Args: { _contact_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_case_by_hierarchy: {
        Args: {
          _case_assigned_to: string
          _case_owner_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_view_subordinate_tasks: {
        Args: { _assignee_id: string; _viewer_id: string }
        Returns: boolean
      }
      check_tenant_limits: {
        Args: { _limit_type: string; _tenant_id: string }
        Returns: boolean
      }
      create_client_notification: {
        Args: {
          p_action_required?: boolean
          p_client_id: string
          p_message: string
          p_related_id?: string
          p_related_type?: string
          p_title: string
          p_type: string
          p_urgent?: boolean
        }
        Returns: string
      }
      ensure_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      get_employee_data_scope: { Args: { _user_id: string }; Returns: string }
      get_user_tenant_id: { Args: never; Returns: string }
      has_module_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_partner: { Args: { _user_id: string }; Returns: boolean }
      is_in_same_team: {
        Args: { _other_user_id: string; _user_id: string }
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
      entity_data_scope: "OWN" | "TEAM" | "ALL"
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
      entity_data_scope: ["OWN", "TEAM", "ALL"],
      license_tier: ["trial", "basic", "professional", "enterprise"],
    },
  },
} as const
