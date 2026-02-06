/*
  # CivicSense AI - Enhanced Schema Migration
  
  This migration adds:
  - Role-based access control (RBAC)
  - Audit logging with triggers
  - SLA tracking and escalation
  - Duplicate detection support
  - Citizen feedback system
  - Rate limiting
  - Enhanced indexing
*/

-- ============================================
-- 1. ROLE-BASED ACCESS CONTROL (RBAC)
-- ============================================

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('citizen', 'ward_officer', 'dept_admin', 'city_admin')),
  ward_id text,
  department text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Role permissions lookup
CREATE TABLE IF NOT EXISTS role_permissions (
  role text PRIMARY KEY,
  can_create_report boolean DEFAULT false,
  can_view_all_reports boolean DEFAULT false,
  can_update_any_report boolean DEFAULT false,
  can_delete_report boolean DEFAULT false,
  can_assign_reports boolean DEFAULT false,
  can_manage_users boolean DEFAULT false,
  can_view_analytics boolean DEFAULT false,
  can_manage_sla boolean DEFAULT false
);

-- Default permissions
INSERT INTO role_permissions VALUES
  ('citizen', true, true, false, false, false, false, false, false),
  ('ward_officer', true, true, true, false, true, false, true, false),
  ('dept_admin', true, true, true, true, true, false, true, true),
  ('city_admin', true, true, true, true, true, true, true, true)
ON CONFLICT (role) DO NOTHING;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION user_has_role(p_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = p_role 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's highest role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM user_roles 
  WHERE user_id = auth.uid() AND is_active = true
  ORDER BY 
    CASE role 
      WHEN 'city_admin' THEN 1 
      WHEN 'dept_admin' THEN 2 
      WHEN 'ward_officer' THEN 3 
      ELSE 4 
    END
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'citizen');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-assign citizen role on signup
CREATE OR REPLACE FUNCTION auto_assign_citizen_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'citizen')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger should be created via Supabase dashboard or after enabling auth schema access
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION auto_assign_citizen_role();

-- ============================================
-- 2. AUDIT LOGGING
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  changed_by uuid REFERENCES auth.users(id),
  user_role text,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields text[];
  v_old_data jsonb;
  v_new_data jsonb;
BEGIN
  -- Determine changed fields for UPDATE
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO v_changed_fields
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW) ->> key IS DISTINCT FROM to_jsonb(OLD) ->> key;
  END IF;

  v_old_data := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  v_new_data := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;

  INSERT INTO audit_logs (
    table_name, record_id, action, old_data, new_data, 
    changed_fields, changed_by, user_role
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    v_old_data,
    v_new_data,
    v_changed_fields,
    auth.uid(),
    get_user_role()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to civic_reports
DROP TRIGGER IF EXISTS tr_audit_civic_reports ON civic_reports;
CREATE TRIGGER tr_audit_civic_reports
  AFTER INSERT OR UPDATE OR DELETE ON civic_reports
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- 3. SLA CONFIGURATION & TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS sla_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority text NOT NULL UNIQUE,
  response_time_hours int NOT NULL,
  resolution_time_hours int NOT NULL,
  escalation_level_1_hours int NOT NULL,
  escalation_level_2_hours int NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Default SLA configurations
INSERT INTO sla_config (priority, response_time_hours, resolution_time_hours, escalation_level_1_hours, escalation_level_2_hours) VALUES
  ('critical', 2, 24, 4, 12),
  ('high', 8, 72, 24, 48),
  ('medium', 24, 168, 72, 120),
  ('low', 72, 336, 168, 240)
ON CONFLICT (priority) DO NOTHING;

-- Escalations tracking
CREATE TABLE IF NOT EXISTS escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES civic_reports(id) ON DELETE CASCADE NOT NULL,
  from_level int NOT NULL,
  to_level int NOT NULL,
  reason text NOT NULL,
  escalated_by uuid REFERENCES auth.users(id),
  notified_users uuid[],
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 4. PRIORITY RULES
-- ============================================

CREATE TABLE IF NOT EXISTS priority_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_type text NOT NULL,
  factor_value text NOT NULL,
  priority_weight numeric NOT NULL CHECK (priority_weight >= 0 AND priority_weight <= 1),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(factor_type, factor_value)
);

-- Default priority weights by issue type
INSERT INTO priority_rules (factor_type, factor_value, priority_weight, description) VALUES
  ('issue_type', 'pothole', 0.7, 'Road hazard - moderate risk'),
  ('issue_type', 'streetlight', 0.8, 'Safety critical - night visibility'),
  ('issue_type', 'drainage', 0.6, 'Infrastructure issue'),
  ('issue_type', 'garbage', 0.4, 'Sanitation issue'),
  ('issue_type', 'road_damage', 0.75, 'Road hazard - higher risk'),
  ('issue_type', 'other', 0.3, 'General issue')
ON CONFLICT (factor_type, factor_value) DO NOTHING;

-- Priority calculation function
CREATE OR REPLACE FUNCTION calculate_priority_score(
  p_issue_type text,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_ai_confidence numeric DEFAULT 0.5
) RETURNS TABLE(score numeric, priority text) AS $$
DECLARE
  v_base_score numeric := 0.5;
  v_time_multiplier numeric := 1.0;
  v_final_score numeric;
BEGIN
  -- Get base score from issue type
  SELECT priority_weight INTO v_base_score
  FROM priority_rules
  WHERE factor_type = 'issue_type' 
  AND factor_value = p_issue_type 
  AND is_active = true;
  
  v_base_score := COALESCE(v_base_score, 0.5);
  
  -- Time multiplier (night reports = higher priority for streetlights)
  IF p_issue_type = 'streetlight' AND EXTRACT(HOUR FROM now()) NOT BETWEEN 6 AND 18 THEN
    v_time_multiplier := 1.3;
  END IF;
  
  -- Calculate final score with AI confidence adjustment
  v_final_score := v_base_score * v_time_multiplier * (0.5 + p_ai_confidence * 0.5);
  v_final_score := LEAST(v_final_score, 1.0); -- Cap at 1.0
  
  -- Map score to priority
  RETURN QUERY SELECT 
    v_final_score,
    CASE 
      WHEN v_final_score >= 0.75 THEN 'critical'::text
      WHEN v_final_score >= 0.55 THEN 'high'::text
      WHEN v_final_score >= 0.35 THEN 'medium'::text
      ELSE 'low'::text
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. CITIZEN FEEDBACK
-- ============================================

CREATE TABLE IF NOT EXISTS citizen_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES civic_reports(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  rating int CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  is_satisfied boolean,
  would_recommend boolean,
  response_time_rating int CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 6. RATE LIMITING
-- ============================================

CREATE TABLE IF NOT EXISTS user_rate_limits (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  reports_today int DEFAULT 0,
  reports_this_hour int DEFAULT 0,
  last_report_at timestamptz,
  daily_reset_at date DEFAULT CURRENT_DATE,
  hourly_reset_at timestamptz DEFAULT date_trunc('hour', now()),
  is_trusted boolean DEFAULT false,
  trust_reason text,
  spam_score numeric DEFAULT 0,
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  blocked_until timestamptz
);

-- Rate limit check function
CREATE OR REPLACE FUNCTION check_and_update_rate_limit(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_limits user_rate_limits%ROWTYPE;
  v_max_hourly int;
  v_max_daily int;
  v_result jsonb;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO v_limits FROM user_rate_limits WHERE user_id = p_user_id;
  
  IF v_limits IS NULL THEN
    INSERT INTO user_rate_limits (user_id) VALUES (p_user_id);
    RETURN jsonb_build_object('allowed', true, 'remaining_hourly', 3, 'remaining_daily', 10);
  END IF;
  
  -- Check if blocked
  IF v_limits.is_blocked AND (v_limits.blocked_until IS NULL OR v_limits.blocked_until > now()) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'User is blocked', 'blocked_until', v_limits.blocked_until);
  END IF;
  
  -- Reset counters if needed
  IF v_limits.daily_reset_at < CURRENT_DATE THEN
    UPDATE user_rate_limits SET reports_today = 0, daily_reset_at = CURRENT_DATE WHERE user_id = p_user_id;
    v_limits.reports_today := 0;
  END IF;
  
  IF v_limits.hourly_reset_at < date_trunc('hour', now()) THEN
    UPDATE user_rate_limits SET reports_this_hour = 0, hourly_reset_at = date_trunc('hour', now()) WHERE user_id = p_user_id;
    v_limits.reports_this_hour := 0;
  END IF;
  
  -- Set limits based on trust status
  IF v_limits.is_trusted THEN
    v_max_hourly := 10;
    v_max_daily := 50;
  ELSE
    v_max_hourly := 3;
    v_max_daily := 10;
  END IF;
  
  -- Check limits
  IF v_limits.reports_this_hour >= v_max_hourly THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Hourly limit reached', 'reset_at', date_trunc('hour', now()) + interval '1 hour');
  END IF;
  
  IF v_limits.reports_today >= v_max_daily THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Daily limit reached', 'reset_at', CURRENT_DATE + 1);
  END IF;
  
  -- Update counters
  UPDATE user_rate_limits 
  SET reports_today = reports_today + 1, 
      reports_this_hour = reports_this_hour + 1,
      last_report_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'allowed', true, 
    'remaining_hourly', v_max_hourly - v_limits.reports_this_hour - 1,
    'remaining_daily', v_max_daily - v_limits.reports_today - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. ENHANCED CIVIC_REPORTS TABLE
-- ============================================

-- Add new columns (if they don't exist)
DO $$ 
BEGIN
  -- SLA tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'sla_due_at') THEN
    ALTER TABLE civic_reports ADD COLUMN sla_due_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'escalation_level') THEN
    ALTER TABLE civic_reports ADD COLUMN escalation_level int DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'assigned_to') THEN
    ALTER TABLE civic_reports ADD COLUMN assigned_to uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'assigned_at') THEN
    ALTER TABLE civic_reports ADD COLUMN assigned_at timestamptz;
  END IF;
  
  -- Location and organization
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'ward_id') THEN
    ALTER TABLE civic_reports ADD COLUMN ward_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'department') THEN
    ALTER TABLE civic_reports ADD COLUMN department text;
  END IF;
  
  -- Validation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'validation_status') THEN
    ALTER TABLE civic_reports ADD COLUMN validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'suspicious', 'rejected'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'validation_issues') THEN
    ALTER TABLE civic_reports ADD COLUMN validation_issues jsonb DEFAULT '[]';
  END IF;
  
  -- AI/Image analysis
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'ai_detected_type') THEN
    ALTER TABLE civic_reports ADD COLUMN ai_detected_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'image_hash') THEN
    ALTER TABLE civic_reports ADD COLUMN image_hash text;
  END IF;
  
  -- Priority score
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'priority_score') THEN
    ALTER TABLE civic_reports ADD COLUMN priority_score numeric;
  END IF;
  
  -- Duplicate tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'is_duplicate') THEN
    ALTER TABLE civic_reports ADD COLUMN is_duplicate boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'duplicate_of') THEN
    ALTER TABLE civic_reports ADD COLUMN duplicate_of uuid REFERENCES civic_reports(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'civic_reports' AND column_name = 'duplicate_count') THEN
    ALTER TABLE civic_reports ADD COLUMN duplicate_count int DEFAULT 0;
  END IF;
END $$;

-- Update status constraint to include 'reopened'
ALTER TABLE civic_reports DROP CONSTRAINT IF EXISTS civic_reports_status_check;
ALTER TABLE civic_reports ADD CONSTRAINT civic_reports_status_check 
  CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected', 'reopened'));

-- SLA due date trigger
CREATE OR REPLACE FUNCTION set_sla_due_date()
RETURNS TRIGGER AS $$
DECLARE
  v_resolution_hours int;
  v_priority_result record;
BEGIN
  -- Calculate priority if not set
  IF NEW.priority_score IS NULL THEN
    SELECT * INTO v_priority_result 
    FROM calculate_priority_score(NEW.issue_type, NEW.latitude, NEW.longitude, NEW.ai_confidence);
    
    NEW.priority := v_priority_result.priority;
    NEW.priority_score := v_priority_result.score;
  END IF;
  
  -- Set SLA due date
  SELECT resolution_time_hours INTO v_resolution_hours
  FROM sla_config WHERE priority = NEW.priority;
  
  IF v_resolution_hours IS NOT NULL THEN
    NEW.sla_due_at := NEW.created_at + (v_resolution_hours || ' hours')::interval;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_sla_due_date ON civic_reports;
CREATE TRIGGER tr_set_sla_due_date
  BEFORE INSERT ON civic_reports
  FOR EACH ROW EXECUTE FUNCTION set_sla_due_date();

-- ============================================
-- 8. DUPLICATE DETECTION
-- ============================================

-- Function to check for potential duplicates
CREATE OR REPLACE FUNCTION check_duplicate_report(
  p_lat numeric,
  p_lng numeric,
  p_issue_type text,
  p_user_id uuid,
  p_radius_meters int DEFAULT 100,
  p_time_window_hours int DEFAULT 72
) RETURNS TABLE(
  is_duplicate boolean, 
  existing_report_id uuid,
  existing_title text,
  distance_meters numeric,
  hours_ago numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true,
    cr.id,
    cr.title,
    ROUND(
      6371000 * acos(
        cos(radians(p_lat)) * cos(radians(cr.latitude)) * 
        cos(radians(cr.longitude) - radians(p_lng)) + 
        sin(radians(p_lat)) * sin(radians(cr.latitude))
      )
    )::numeric as dist_meters,
    ROUND(EXTRACT(EPOCH FROM (now() - cr.created_at)) / 3600)::numeric as hrs_ago
  FROM civic_reports cr
  WHERE cr.issue_type = p_issue_type
    AND cr.status NOT IN ('resolved', 'rejected')
    AND cr.created_at > NOW() - (p_time_window_hours || ' hours')::interval
    AND cr.latitude IS NOT NULL 
    AND cr.longitude IS NOT NULL
    AND 6371000 * acos(
      cos(radians(p_lat)) * cos(radians(cr.latitude)) * 
      cos(radians(cr.longitude) - radians(p_lng)) + 
      sin(radians(p_lat)) * sin(radians(cr.latitude))
    ) <= p_radius_meters
  ORDER BY dist_meters
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. ENHANCED INDEXES
-- ============================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_civic_reports_status_priority_created 
  ON civic_reports(status, priority, created_at DESC);

-- Partial index for active issues only
CREATE INDEX IF NOT EXISTS idx_civic_reports_active 
  ON civic_reports(created_at DESC) 
  WHERE status IN ('pending', 'in_progress', 'reopened');

-- Index for SLA tracking
CREATE INDEX IF NOT EXISTS idx_civic_reports_sla_due 
  ON civic_reports(sla_due_at) 
  WHERE status NOT IN ('resolved', 'rejected');

-- Index for assigned reports
CREATE INDEX IF NOT EXISTS idx_civic_reports_assigned 
  ON civic_reports(assigned_to, status) 
  WHERE assigned_to IS NOT NULL;

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escalations_report_id ON escalations(report_id);
CREATE INDEX IF NOT EXISTS idx_citizen_feedback_report ON citizen_feedback(report_id);

-- ============================================
-- 10. UPDATED RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- User Roles policies
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT TO authenticated
  USING (user_has_role('city_admin'));

CREATE POLICY "City admins can manage roles"
  ON user_roles FOR ALL TO authenticated
  USING (user_has_role('city_admin'));

-- Audit logs - read only for admins
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (user_has_role('dept_admin') OR user_has_role('city_admin'));

-- SLA config - read all, write for admins
CREATE POLICY "Anyone can view SLA config"
  ON sla_config FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage SLA config"
  ON sla_config FOR ALL TO authenticated
  USING (user_has_role('city_admin'));

-- Role permissions - read only
CREATE POLICY "Anyone can view permissions"
  ON role_permissions FOR SELECT TO authenticated
  USING (true);

-- Priority rules - read all, write for admins
CREATE POLICY "Anyone can view priority rules"
  ON priority_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage priority rules"
  ON priority_rules FOR ALL TO authenticated
  USING (user_has_role('city_admin'));

-- Escalations
CREATE POLICY "Officers can view escalations"
  ON escalations FOR SELECT TO authenticated
  USING (
    user_has_role('ward_officer') OR 
    user_has_role('dept_admin') OR 
    user_has_role('city_admin')
  );

-- Citizen feedback
CREATE POLICY "Users can view own feedback"
  ON citizen_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback for own reports"
  ON citizen_feedback FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM civic_reports 
      WHERE id = report_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all feedback"
  ON citizen_feedback FOR SELECT TO authenticated
  USING (user_has_role('ward_officer') OR user_has_role('dept_admin') OR user_has_role('city_admin'));

-- User rate limits - users see own, admins see all
CREATE POLICY "Users can view own rate limits"
  ON user_rate_limits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage rate limits"
  ON user_rate_limits FOR ALL TO authenticated
  USING (user_has_role('city_admin'));

-- Updated civic_reports policies for RBAC
DROP POLICY IF EXISTS "Users can update own reports" ON civic_reports;

CREATE POLICY "Users can update reports based on role"
  ON civic_reports FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR
    user_has_role('ward_officer') OR
    user_has_role('dept_admin') OR
    user_has_role('city_admin')
  )
  WITH CHECK (
    auth.uid() = user_id OR
    user_has_role('ward_officer') OR
    user_has_role('dept_admin') OR
    user_has_role('city_admin')
  );

-- Officers can delete (with audit trail)
CREATE POLICY "Officers can delete reports"
  ON civic_reports FOR DELETE TO authenticated
  USING (user_has_role('dept_admin') OR user_has_role('city_admin'));
