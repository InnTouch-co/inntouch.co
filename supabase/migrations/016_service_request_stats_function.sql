-- Create optimized function for service request statistics
-- This function calculates all stats in a single database query instead of loading all data

CREATE OR REPLACE FUNCTION get_service_request_stats(p_hotel_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'pending', COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0),
    'in_progress', COALESCE(COUNT(*) FILTER (WHERE status = 'in_progress'), 0),
    'completed_today', COALESCE(
      COUNT(*) FILTER (
        WHERE status = 'completed' 
        AND DATE(COALESCE(updated_at, created_at)) = CURRENT_DATE
      ), 
      0
    ),
    'avg_response_minutes', COALESCE(
      ROUND(
        AVG(EXTRACT(EPOCH FROM (COALESCE(updated_at, created_at) - created_at)) / 60)
        FILTER (
          WHERE (status = 'in_progress' OR status = 'completed') 
          AND COALESCE(updated_at, created_at) > created_at
        )
      )::bigint,
      0
    )
  ) INTO v_result
  FROM service_requests
  WHERE hotel_id = p_hotel_id
    AND is_deleted = false;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_service_request_stats(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_service_request_stats(uuid) IS 'Optimized function to calculate service request statistics for a hotel. Returns pending, in_progress, completed_today counts and average response time in minutes.';

