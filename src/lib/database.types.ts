export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Role types
export type UserRole = 'citizen' | 'ward_officer' | 'dept_admin' | 'city_admin';
export type IssueType = 'pothole' | 'garbage' | 'streetlight' | 'drainage' | 'road_damage' | 'other';
export type ReportStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected' | 'reopened';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type ValidationStatus = 'pending' | 'valid' | 'suspicious' | 'rejected';

export interface Database {
  public: {
    Tables: {
      civic_reports: {
        Row: {
          id: string
          user_id: string
          issue_type: IssueType
          title: string
          description: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          address: string | null
          status: ReportStatus
          priority: Priority
          priority_score: number | null
          ai_confidence: number
          ai_detected_type: string | null
          image_hash: string | null
          validation_status: ValidationStatus
          validation_issues: Json
          sla_due_at: string | null
          escalation_level: number
          assigned_to: string | null
          assigned_at: string | null
          ward_id: string | null
          department: string | null
          is_duplicate: boolean
          duplicate_of: string | null
          duplicate_count: number
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          issue_type: IssueType
          title: string
          description: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          address?: string | null
          status?: ReportStatus
          priority?: Priority
          priority_score?: number | null
          ai_confidence?: number
          ai_detected_type?: string | null
          image_hash?: string | null
          validation_status?: ValidationStatus
          validation_issues?: Json
          sla_due_at?: string | null
          escalation_level?: number
          assigned_to?: string | null
          assigned_at?: string | null
          ward_id?: string | null
          department?: string | null
          is_duplicate?: boolean
          duplicate_of?: string | null
          duplicate_count?: number
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          issue_type?: IssueType
          title?: string
          description?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          address?: string | null
          status?: ReportStatus
          priority?: Priority
          priority_score?: number | null
          ai_confidence?: number
          ai_detected_type?: string | null
          image_hash?: string | null
          validation_status?: ValidationStatus
          validation_issues?: Json
          sla_due_at?: string | null
          escalation_level?: number
          assigned_to?: string | null
          assigned_at?: string | null
          ward_id?: string | null
          department?: string | null
          is_duplicate?: boolean
          duplicate_of?: string | null
          duplicate_count?: number
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      report_updates: {
        Row: {
          id: string
          report_id: string
          user_id: string
          status: ReportStatus | null
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
          status?: ReportStatus | null
          comment: string
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          user_id?: string
          status?: ReportStatus | null
          comment?: string
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: UserRole
          ward_id: string | null
          department: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: UserRole
          ward_id?: string | null
          department?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: UserRole
          ward_id?: string | null
          department?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      role_permissions: {
        Row: {
          role: UserRole
          can_create_report: boolean
          can_view_all_reports: boolean
          can_update_any_report: boolean
          can_delete_report: boolean
          can_assign_reports: boolean
          can_manage_users: boolean
          can_view_analytics: boolean
          can_manage_sla: boolean
        }
        Insert: {
          role: UserRole
          can_create_report?: boolean
          can_view_all_reports?: boolean
          can_update_any_report?: boolean
          can_delete_report?: boolean
          can_assign_reports?: boolean
          can_manage_users?: boolean
          can_view_analytics?: boolean
          can_manage_sla?: boolean
        }
        Update: {
          role?: UserRole
          can_create_report?: boolean
          can_view_all_reports?: boolean
          can_update_any_report?: boolean
          can_delete_report?: boolean
          can_assign_reports?: boolean
          can_manage_users?: boolean
          can_view_analytics?: boolean
          can_manage_sla?: boolean
        }
      }
      sla_config: {
        Row: {
          id: string
          priority: Priority
          response_time_hours: number
          resolution_time_hours: number
          escalation_level_1_hours: number
          escalation_level_2_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          priority: Priority
          response_time_hours: number
          resolution_time_hours: number
          escalation_level_1_hours: number
          escalation_level_2_hours: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          priority?: Priority
          response_time_hours?: number
          resolution_time_hours?: number
          escalation_level_1_hours?: number
          escalation_level_2_hours?: number
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data: Json | null
          new_data: Json | null
          changed_fields: string[] | null
          changed_by: string | null
          user_role: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
          changed_fields?: string[] | null
          changed_by?: string | null
          user_role?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
          changed_fields?: string[] | null
          changed_by?: string | null
          user_role?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      escalations: {
        Row: {
          id: string
          report_id: string
          from_level: number
          to_level: number
          reason: string
          escalated_by: string | null
          notified_users: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          from_level: number
          to_level: number
          reason: string
          escalated_by?: string | null
          notified_users?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          from_level?: number
          to_level?: number
          reason?: string
          escalated_by?: string | null
          notified_users?: string[] | null
          created_at?: string
        }
      }
      citizen_feedback: {
        Row: {
          id: string
          report_id: string
          user_id: string
          rating: number | null
          feedback_text: string | null
          is_satisfied: boolean | null
          would_recommend: boolean | null
          response_time_rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
          rating?: number | null
          feedback_text?: string | null
          is_satisfied?: boolean | null
          would_recommend?: boolean | null
          response_time_rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          user_id?: string
          rating?: number | null
          feedback_text?: string | null
          is_satisfied?: boolean | null
          would_recommend?: boolean | null
          response_time_rating?: number | null
          created_at?: string
        }
      }
      priority_rules: {
        Row: {
          id: string
          factor_type: string
          factor_value: string
          priority_weight: number
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          factor_type: string
          factor_value: string
          priority_weight: number
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          factor_type?: string
          factor_value?: string
          priority_weight?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      user_rate_limits: {
        Row: {
          user_id: string
          reports_today: number
          reports_this_hour: number
          last_report_at: string | null
          daily_reset_at: string
          hourly_reset_at: string
          is_trusted: boolean
          trust_reason: string | null
          spam_score: number
          is_blocked: boolean
          blocked_reason: string | null
          blocked_until: string | null
        }
        Insert: {
          user_id: string
          reports_today?: number
          reports_this_hour?: number
          last_report_at?: string | null
          daily_reset_at?: string
          hourly_reset_at?: string
          is_trusted?: boolean
          trust_reason?: string | null
          spam_score?: number
          is_blocked?: boolean
          blocked_reason?: string | null
          blocked_until?: string | null
        }
        Update: {
          user_id?: string
          reports_today?: number
          reports_this_hour?: number
          last_report_at?: string | null
          daily_reset_at?: string
          hourly_reset_at?: string
          is_trusted?: boolean
          trust_reason?: string | null
          spam_score?: number
          is_blocked?: boolean
          blocked_reason?: string | null
          blocked_until?: string | null
        }
      }
    }
    Functions: {
      check_duplicate_report: {
        Args: {
          p_lat: number
          p_lng: number
          p_issue_type: string
          p_user_id: string
          p_radius_meters?: number
          p_time_window_hours?: number
        }
        Returns: {
          is_duplicate: boolean
          existing_report_id: string
          existing_title: string
          distance_meters: number
          hours_ago: number
        }[]
      }
      calculate_priority_score: {
        Args: {
          p_issue_type: string
          p_lat?: number
          p_lng?: number
          p_ai_confidence?: number
        }
        Returns: {
          score: number
          priority: string
        }[]
      }
      check_and_update_rate_limit: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      user_has_role: {
        Args: {
          p_role: string
        }
        Returns: boolean
      }
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
    }
  }
}

// Convenience types
export type Report = Database['public']['Tables']['civic_reports']['Row'];
export type ReportInsert = Database['public']['Tables']['civic_reports']['Insert'];
export type ReportUpdate = Database['public']['Tables']['civic_reports']['Update'];
export type ReportUpdateEntry = Database['public']['Tables']['report_updates']['Row'];
export type UserRoleRow = Database['public']['Tables']['user_roles']['Row'];
export type RolePermissions = Database['public']['Tables']['role_permissions']['Row'];
export type SLAConfig = Database['public']['Tables']['sla_config']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type Escalation = Database['public']['Tables']['escalations']['Row'];
export type CitizenFeedback = Database['public']['Tables']['citizen_feedback']['Row'];
export type PriorityRule = Database['public']['Tables']['priority_rules']['Row'];
