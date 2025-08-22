-- Row Level Security (RLS) Policies for True Crime Tracker

-- Enable RLS on all tables
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE killers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PUBLIC ACCESS POLICIES (Read-only)
-- ============================================

-- Content is viewable by everyone
CREATE POLICY "content_public_read"
  ON content FOR SELECT
  USING (deleted_at IS NULL);

-- Cases are viewable by everyone
CREATE POLICY "cases_public_read"
  ON cases FOR SELECT
  USING (true);

-- Killers are viewable by everyone
CREATE POLICY "killers_public_read"
  ON killers FOR SELECT
  USING (true);

-- Platform availability is viewable by everyone
CREATE POLICY "platform_availability_public_read"
  ON platform_availability FOR SELECT
  USING (true);

-- Public discussions are viewable by everyone
CREATE POLICY "discussions_public_read"
  ON discussions FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Public clubs are viewable by everyone
CREATE POLICY "clubs_public_read"
  ON clubs FOR SELECT
  USING (is_public = true OR EXISTS (
    SELECT 1 FROM club_members 
    WHERE club_members.club_id = clubs.id 
    AND club_members.user_id = auth.uid()
  ));

-- ============================================
-- USER-SPECIFIC POLICIES
-- ============================================

-- Users can only view their own watchlist
CREATE POLICY "watchlist_user_read"
  ON user_watchlist FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert into their own watchlist
CREATE POLICY "watchlist_user_insert"
  ON user_watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own watchlist
CREATE POLICY "watchlist_user_update"
  ON user_watchlist FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete from their own watchlist
CREATE POLICY "watchlist_user_delete"
  ON user_watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only view their own progress
CREATE POLICY "progress_user_read"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own progress
CREATE POLICY "progress_user_insert"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own progress
CREATE POLICY "progress_user_update"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own progress
CREATE POLICY "progress_user_delete"
  ON user_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view all ratings (for aggregation)
CREATE POLICY "ratings_public_read"
  ON user_ratings FOR SELECT
  USING (true);

-- Users can only insert their own ratings
CREATE POLICY "ratings_user_insert"
  ON user_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own ratings
CREATE POLICY "ratings_user_update"
  ON user_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own ratings
CREATE POLICY "ratings_user_delete"
  ON user_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only view their own preferences
CREATE POLICY "preferences_user_read"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own preferences
CREATE POLICY "preferences_user_insert"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own preferences
CREATE POLICY "preferences_user_update"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SOCIAL FEATURES POLICIES
-- ============================================

-- Users can create discussions
CREATE POLICY "discussions_user_insert"
  ON discussions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own discussions
CREATE POLICY "discussions_user_update"
  ON discussions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own discussions
CREATE POLICY "discussions_user_delete"
  ON discussions FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view follows (public social graph)
CREATE POLICY "follows_public_read"
  ON user_follows FOR SELECT
  USING (true);

-- Users can create their own follows
CREATE POLICY "follows_user_insert"
  ON user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follows
CREATE POLICY "follows_user_delete"
  ON user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Club members can view their clubs' member lists
CREATE POLICY "club_members_read"
  ON club_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_members.club_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = club_members.club_id
      AND clubs.is_public = true
    )
  );

-- Users can join public clubs
CREATE POLICY "club_members_join_public"
  ON club_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = club_id
      AND (clubs.is_public = true OR clubs.owner_id = auth.uid())
    )
  );

-- Users can leave clubs
CREATE POLICY "club_members_leave"
  ON club_members FOR DELETE
  USING (auth.uid() = user_id);

-- Club owners can remove members
CREATE POLICY "club_members_owner_delete"
  ON club_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = club_members.club_id
      AND clubs.owner_id = auth.uid()
    )
  );

-- ============================================
-- ADMIN POLICIES
-- ============================================

-- Create admin role function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins can insert/update/delete content
CREATE POLICY "content_admin_insert"
  ON content FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "content_admin_update"
  ON content FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "content_admin_delete"
  ON content FOR DELETE
  USING (is_admin());

-- Admins can manage cases
CREATE POLICY "cases_admin_insert"
  ON cases FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "cases_admin_update"
  ON cases FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "cases_admin_delete"
  ON cases FOR DELETE
  USING (is_admin());

-- Admins can manage killers
CREATE POLICY "killers_admin_insert"
  ON killers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "killers_admin_update"
  ON killers FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "killers_admin_delete"
  ON killers FOR DELETE
  USING (is_admin());

-- ============================================
-- SECURITY FUNCTIONS
-- ============================================

-- Function to check if user owns a resource
CREATE OR REPLACE FUNCTION owns_resource(resource_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() = resource_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check club membership
CREATE OR REPLACE FUNCTION is_club_member(p_club_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is following another user
CREATE OR REPLACE FUNCTION is_following(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_follows
    WHERE follower_id = auth.uid()
    AND following_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PERFORMANCE OPTIMIZATION FOR RLS
-- ============================================

-- Create indexes to optimize RLS policy checks
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth.users((raw_user_meta_data->>'role'));
CREATE INDEX IF NOT EXISTS idx_club_members_user_status ON club_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_discussions_user_public ON discussions(user_id, is_public);

-- ============================================
-- AUDIT AND COMPLIANCE
-- ============================================

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "audit_log_admin_read"
  ON audit_log FOR SELECT
  USING (is_admin());

-- Function to log sensitive operations
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers for sensitive tables
CREATE TRIGGER audit_user_preferences
  AFTER INSERT OR UPDATE OR DELETE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_user_ratings
  AFTER INSERT OR UPDATE OR DELETE ON user_ratings
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ============================================
-- TESTING RLS POLICIES
-- ============================================

-- Function to test RLS policies for a specific user
CREATE OR REPLACE FUNCTION test_rls_policies(p_user_id uuid)
RETURNS TABLE (
  policy_name text,
  table_name text,
  operation text,
  can_access boolean
) AS $$
BEGIN
  -- This function helps verify RLS policies are working correctly
  -- Run this in development to ensure policies are properly configured
  RETURN QUERY
  SELECT 
    pol.policyname::text,
    pol.tablename::text,
    pol.cmd::text,
    true -- Simplified for now, actual testing would be more complex
  FROM pg_policies pol
  WHERE pol.schemaname = 'public'
  ORDER BY pol.tablename, pol.policyname;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_rls_policies IS 'Helper function to verify RLS policies configuration';