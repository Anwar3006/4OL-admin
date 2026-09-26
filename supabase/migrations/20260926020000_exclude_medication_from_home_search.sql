-- Consumer Home search intentionally excludes the medication catalogue.
-- Medication remains discoverable through the dedicated medication/reminder
-- flows, where the resulting guidance and purchase intent are contextual.

CREATE OR REPLACE FUNCTION public.global_search_v2(
  p_search_term text,
  p_result_limit integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_term text := trim(coalesce(p_search_term, ''));
  v_escaped text;
  v_limit int := least(greatest(coalesce(p_result_limit, 12), 1), 30);
  v_per_entity int := 5;
  v_results jsonb;
  v_total int;
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
BEGIN
  IF char_length(v_term) < 2 THEN
    RETURN jsonb_build_object('results', '[]'::jsonb, 'total', 0);
  END IF;

  v_escaped := replace(replace(replace(v_term, '\', '\\'), '%', '\%'), '_', '\_');

  WITH ranked AS (
    SELECT 'conditions'::text AS entity_type, c.id::text AS id,
           c.name AS title, c.slug AS subtitle, c.image_url AS image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(c.name, '')), plainto_tsquery('simple', v_term)),
             similarity(c.name, v_term)
           ) AS rank
    FROM public.conditions c
    WHERE c.name ILIKE '%' || v_escaped || '%'
       OR similarity(c.name, v_term) > 0.2
    UNION ALL
    SELECT 'symptoms', s.id::text, s.name, s.slug, s.image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(s.name, '')), plainto_tsquery('simple', v_term)),
             similarity(s.name, v_term)
           )
    FROM public.symptoms s
    WHERE s.name ILIKE '%' || v_escaped || '%'
       OR similarity(s.name, v_term) > 0.2
    UNION ALL
    SELECT 'healthy_living', h.id::text, h.name, h.slug, h.image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(h.name, '')), plainto_tsquery('simple', v_term)),
             similarity(h.name, v_term)
           )
    FROM public.healthy_living_info h
    WHERE (h.status IS NULL OR h.status = 'published')
      AND (h.name ILIKE '%' || v_escaped || '%'
           OR similarity(h.name, v_term) > 0.2)
    UNION ALL
    SELECT 'facility_profile', f.id::text, f.name, f.area, f.featured_image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(f.name, '') || ' ' || coalesce(f.area, '')),
                     plainto_tsquery('simple', v_term)),
             similarity(f.name, v_term)
           )
    FROM public.providers f
    WHERE f.status::text = 'active'
      AND f.kind IN ('care_facility', 'vendor')
      AND (f.name ILIKE '%' || v_escaped || '%'
           OR f.area ILIKE '%' || v_escaped || '%'
           OR similarity(f.name, v_term) > 0.2)
  ),
  capped AS (
    SELECT r.*, row_number() OVER (PARTITION BY entity_type ORDER BY rank DESC) AS rn
    FROM ranked r
  ),
  final AS (
    SELECT * FROM capped
    WHERE rn <= v_per_entity
    ORDER BY rank DESC
    LIMIT v_limit
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'entity_type', entity_type, 'id', id, 'title', title,
           'subtitle', subtitle, 'image_url', image_url, 'rank', rank
         ) ORDER BY rank DESC), '[]'::jsonb),
         count(*)
  INTO v_results, v_total
  FROM final;

  BEGIN
    INSERT INTO public.analytics_events (event_type, user_id, metadata)
    VALUES (
      CASE WHEN v_total = 0 THEN 'search_zero_results' ELSE 'search_executed' END,
      v_uid,
      jsonb_build_object('term', left(v_term, 120), 'result_count', v_total, 'source', 'global_search_v2')
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('results', coalesce(v_results, '[]'::jsonb), 'total', coalesce(v_total, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.global_search_v2(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.global_search_v2(text, integer) TO authenticated, service_role;
