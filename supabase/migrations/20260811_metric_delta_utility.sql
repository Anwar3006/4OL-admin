-- Epic 10.7: shared created_at delta utility for dashboard RPCs.
-- Counts rows in a selected window and the immediately preceding equal
-- window, returning a consistent current/previous/percent JSON contract.

CREATE OR REPLACE FUNCTION public.count_created_at_delta(
  p_table regclass,
  p_created_at_column text,
  p_start_at timestamptz,
  p_end_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_start_at timestamptz;
  current_count integer;
  previous_count integer;
BEGIN
  IF p_start_at IS NULL OR p_end_at IS NULL OR p_start_at >= p_end_at THEN
    RAISE EXCEPTION 'Invalid delta window: start_at must be before end_at';
  END IF;

  previous_start_at := p_start_at - (p_end_at - p_start_at);

  EXECUTE format(
    'SELECT count(*)::int FROM %s WHERE %I >= $1 AND %I < $2',
    p_table,
    p_created_at_column,
    p_created_at_column
  )
  INTO current_count
  USING p_start_at, p_end_at;

  EXECUTE format(
    'SELECT count(*)::int FROM %s WHERE %I >= $1 AND %I < $2',
    p_table,
    p_created_at_column,
    p_created_at_column
  )
  INTO previous_count
  USING previous_start_at, p_start_at;

  RETURN jsonb_build_object(
    'current', current_count,
    'previous', previous_count,
    'percent',
      CASE
        WHEN previous_count = 0 THEN NULL
        ELSE round(((current_count - previous_count)::numeric / previous_count) * 100, 1)
      END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.count_created_at_delta(regclass, text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_created_at_delta(regclass, text, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.count_created_at_delta(regclass, text, timestamptz, timestamptz) TO authenticated, service_role;
