/*
  # CivicSense AI - Initial Database Schema

  ## Overview
  This migration creates the foundation for the CivicSense AI platform, enabling citizens to report civic issues and authorities to manage them effectively.

  ## New Tables

  ### 1. `civic_reports`
  Main table storing all citizen-reported civic issues.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for each report
  - `user_id` (uuid, foreign key) - Links to auth.users, the citizen who reported
  - `issue_type` (text) - Category: pothole, garbage, streetlight, drainage, road_damage, other
  - `title` (text) - Brief title of the issue
  - `description` (text) - Detailed description
  - `image_url` (text) - URL of uploaded image
  - `latitude` (numeric) - Geographic latitude
  - `longitude` (numeric) - Geographic longitude
  - `address` (text) - Human-readable address
  - `status` (text) - Current status: pending, in_progress, resolved, rejected
  - `priority` (text) - Priority level: low, medium, high, critical
  - `ai_confidence` (numeric) - AI detection confidence score (0-1)
  - `resolved_at` (timestamptz) - When the issue was resolved
  - `created_at` (timestamptz) - When the report was created
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `report_updates`
  Tracks status updates and comments on reports.
  
  **Columns:**
  - `id` (uuid, primary key)
  - `report_id` (uuid, foreign key) - Links to civic_reports
  - `user_id` (uuid, foreign key) - Who made the update
  - `status` (text) - New status if changed
  - `comment` (text) - Update comment/note
  - `created_at` (timestamptz)

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Citizens can create reports and view their own reports
  - Citizens can view all reports (public transparency)
  - Authenticated users can add updates to reports
  - All read operations require authentication

  ## Indexes
  - Indexes on frequently queried fields for performance
*/

-- Create civic_reports table
CREATE TABLE IF NOT EXISTS civic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  issue_type text NOT NULL CHECK (issue_type IN ('pothole', 'garbage', 'streetlight', 'drainage', 'road_damage', 'other')),
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  latitude numeric,
  longitude numeric,
  address text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ai_confidence numeric DEFAULT 0.0 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create report_updates table
CREATE TABLE IF NOT EXISTS report_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES civic_reports(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  status text CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_civic_reports_user_id ON civic_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_civic_reports_status ON civic_reports(status);
CREATE INDEX IF NOT EXISTS idx_civic_reports_issue_type ON civic_reports(issue_type);
CREATE INDEX IF NOT EXISTS idx_civic_reports_created_at ON civic_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civic_reports_location ON civic_reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_report_updates_report_id ON report_updates(report_id);

-- Enable Row Level Security
ALTER TABLE civic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for civic_reports

-- Anyone authenticated can view all reports (public transparency)
CREATE POLICY "Authenticated users can view all reports"
  ON civic_reports
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
  ON civic_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
  ON civic_reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for report_updates

-- Anyone authenticated can view all updates
CREATE POLICY "Authenticated users can view all updates"
  ON report_updates
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create updates
CREATE POLICY "Authenticated users can create updates"
  ON report_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_civic_reports_updated_at ON civic_reports;
CREATE TRIGGER update_civic_reports_updated_at
  BEFORE UPDATE ON civic_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();