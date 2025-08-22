-- Performance indexes for True Crime Tracker

-- Content table indexes
CREATE INDEX IF NOT EXISTS idx_content_case_id ON content(case_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_killer_id ON content(killer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_platform ON content(platform) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_release_date ON content(release_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_rating ON content(average_rating DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_popularity ON content(view_count DESC) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_content_platform_type ON content(platform, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_case_platform ON content(case_id, platform) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_killer_platform ON content(killer_id, platform) WHERE deleted_at IS NULL;

-- User watchlist indexes
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_id ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_content_id ON user_watchlist(content_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_added_at ON user_watchlist(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_status ON user_watchlist(status) WHERE status != 'removed';
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_content ON user_watchlist(user_id, content_id);

-- User progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_content_id ON user_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_updated_at ON user_progress(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON user_progress(user_id, completed) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_user_progress_user_content ON user_progress(user_id, content_id);

-- Platform availability indexes
CREATE INDEX IF NOT EXISTS idx_platform_availability_content_id ON platform_availability(content_id);
CREATE INDEX IF NOT EXISTS idx_platform_availability_platform ON platform_availability(platform);
CREATE INDEX IF NOT EXISTS idx_platform_availability_available ON platform_availability(available) WHERE available = true;
CREATE INDEX IF NOT EXISTS idx_platform_availability_expires ON platform_availability(expires_at) WHERE expires_at IS NOT NULL;

-- Cases table indexes
CREATE INDEX IF NOT EXISTS idx_cases_name ON cases(name);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_year ON cases(year_start);
CREATE INDEX IF NOT EXISTS idx_cases_location ON cases(location);
CREATE INDEX IF NOT EXISTS idx_cases_victim_count ON cases(victim_count DESC);

-- Killers table indexes
CREATE INDEX IF NOT EXISTS idx_killers_name ON killers(name);
CREATE INDEX IF NOT EXISTS idx_killers_active_years ON killers(active_start, active_end);
CREATE INDEX IF NOT EXISTS idx_killers_victim_count ON killers(victim_count DESC);
CREATE INDEX IF NOT EXISTS idx_killers_capture_status ON killers(capture_status);

-- Social features indexes
CREATE INDEX IF NOT EXISTS idx_user_ratings_user_id ON user_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_content_id ON user_ratings(content_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_created_at ON user_ratings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discussions_content_id ON discussions(content_id);
CREATE INDEX IF NOT EXISTS idx_discussions_case_id ON discussions(case_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_user_id ON discussions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);

-- Search optimization indexes (for text search)
CREATE INDEX IF NOT EXISTS idx_content_search ON content USING gin(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cases_search ON cases USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

CREATE INDEX IF NOT EXISTS idx_killers_search ON killers USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(aliases, '') || ' ' || coalesce(description, ''))
);

-- JSONB indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_content_metadata ON content USING gin(metadata) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_availability_metadata ON platform_availability USING gin(metadata);

-- Partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_content_netflix ON content(id) WHERE platform = 'netflix' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_hulu ON content(id) WHERE platform = 'hulu' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_prime ON content(id) WHERE platform = 'prime' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_hbo ON content(id) WHERE platform = 'hbo' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_documentary ON content(id) WHERE type = 'documentary' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_series ON content(id) WHERE type = 'series' AND deleted_at IS NULL;

-- Function to analyze index usage
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
  schemaname text,
  tablename text,
  indexname text,
  index_size text,
  idx_scan bigint,
  idx_tup_read bigint,
  idx_tup_fetch bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.schemaname::text,
    s.tablename::text,
    s.indexrelname::text,
    pg_size_pretty(pg_relation_size(s.indexrelid))::text,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch
  FROM pg_stat_user_indexes s
  JOIN pg_index i ON s.indexrelid = i.indexrelid
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find missing indexes (queries without indexes)
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE (
  tablename text,
  attname text,
  n_distinct real,
  correlation real
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::text AS tablename,
    a.attname::text,
    s.n_distinct,
    s.correlation
  FROM pg_stats s
  JOIN pg_class c ON s.tablename = c.relname
  JOIN pg_attribute a ON c.oid = a.attrelid AND a.attname = s.attname
  WHERE s.schemaname = 'public'
    AND s.n_distinct > 100
    AND abs(s.correlation) < 0.1
    AND NOT EXISTS (
      SELECT 1
      FROM pg_index i
      WHERE i.indrelid = c.oid
        AND a.attnum = ANY(i.indkey)
    )
  ORDER BY s.n_distinct DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON INDEX idx_content_case_id IS 'Optimizes queries filtering by case';
COMMENT ON INDEX idx_content_platform IS 'Optimizes platform-specific content queries';
COMMENT ON INDEX idx_user_watchlist_user_content IS 'Optimizes watchlist lookups for specific user-content pairs';
COMMENT ON INDEX idx_content_search IS 'Full-text search index for content';
COMMENT ON INDEX idx_content_metadata IS 'JSONB index for flexible metadata queries';