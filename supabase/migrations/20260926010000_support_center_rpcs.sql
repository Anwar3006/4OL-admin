-- Public Support Centre
--
-- One ticket queue serves the mobile app, office staff, and the public
-- website. Public creation is intentionally routed through the Next.js API
-- so it can supply a stable, server-derived rate-limit key; the RPC itself
-- is not callable by anon/authenticated browser clients.

ALTER TABLE public.chat_support
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';

ALTER TABLE public.chat_support
  DROP CONSTRAINT IF EXISTS chat_support_source_check;

ALTER TABLE public.chat_support
  ADD CONSTRAINT chat_support_source_check
  CHECK (source IN ('app', 'web', 'office'));

CREATE INDEX IF NOT EXISTS chat_support_active_created_at_idx
  ON public.chat_support (created_at DESC)
  WHERE is_deleted = false;

CREATE OR REPLACE FUNCTION public.create_public_support_ticket(
  p_name text,
  p_email text,
  p_subject text,
  p_message text,
  p_category text DEFAULT 'Other',
  p_rate_limit_key uuid DEFAULT NULL
)
RETURNS TABLE (id bigint, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_limit record;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_subject text := btrim(coalesce(p_subject, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_category text := coalesce(nullif(btrim(p_category), ''), 'Other');
BEGIN
  IF p_rate_limit_key IS NULL THEN
    RAISE EXCEPTION 'support_rate_limit_key_required';
  END IF;

  SELECT *
  INTO v_rate_limit
  FROM public.check_and_increment_rate_limit(
    p_rate_limit_key,
    'public_support_ticket',
    3600,
    5
  );

  IF NOT coalesce(v_rate_limit.allowed, false) THEN
    RAISE EXCEPTION 'support_rate_limited';
  END IF;

  IF char_length(v_name) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'support_invalid_name';
  END IF;
  IF v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'support_invalid_email';
  END IF;
  IF char_length(v_subject) NOT BETWEEN 3 AND 160 THEN
    RAISE EXCEPTION 'support_invalid_subject';
  END IF;
  IF char_length(v_message) NOT BETWEEN 10 AND 5000 THEN
    RAISE EXCEPTION 'support_invalid_message';
  END IF;
  IF v_category NOT IN ('Billing', 'Technical', 'Health Consultation', 'Account', 'BedTracker', 'Other') THEN
    v_category := 'Other';
  END IF;

  RETURN QUERY
  INSERT INTO public.chat_support (
    requested_by,
    user_name,
    contact_email,
    subject,
    message,
    category,
    priority,
    status,
    source
  )
  VALUES (
    NULL,
    v_name,
    v_email,
    v_subject,
    v_message,
    v_category,
    'Low',
    'Open',
    'web'
  )
  RETURNING chat_support.id, chat_support.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_support_tickets(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id bigint,
  requested_by uuid,
  user_name text,
  contact_email text,
  source text,
  subject text,
  message text,
  priority text,
  status text,
  is_deleted boolean,
  created_at timestamptz,
  updated_at timestamptz,
  assigned_to uuid,
  assigned_at timestamptz,
  escalated_at timestamptz,
  escalated_to uuid,
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid,
  category text,
  tags text[],
  response_time_minutes integer,
  satisfaction_rating integer,
  first_response_at timestamptz,
  first_name text,
  last_name text,
  phone_number text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_4ol_permission(auth.uid(), 'chats.view') THEN
    RAISE EXCEPTION 'support_forbidden';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'support_invalid_pagination';
  END IF;

  RETURN QUERY
  SELECT
    cs.id,
    cs.requested_by,
    cs.user_name,
    cs.contact_email,
    cs.source,
    cs.subject,
    cs.message,
    cs.priority,
    cs.status,
    cs.is_deleted,
    cs.created_at,
    cs.updated_at,
    cs.assigned_to,
    cs.assigned_at,
    cs.escalated_at,
    cs.escalated_to,
    cs.resolution_notes,
    cs.resolved_at,
    cs.resolved_by,
    cs.category,
    cs.tags,
    cs.response_time_minutes,
    cs.satisfaction_rating,
    cs.first_response_at,
    up.first_name,
    up.last_name,
    up.phone_number,
    count(*) OVER ()
  FROM public.chat_support cs
  LEFT JOIN public.user_profiles up ON up.user_id = cs.requested_by
  WHERE cs.is_deleted = false
  ORDER BY cs.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_support_ticket_status(
  p_ticket_id bigint,
  p_status text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_resolution_notes text DEFAULT NULL,
  p_update_assignee boolean DEFAULT false,
  p_update_resolution_notes boolean DEFAULT false
)
RETURNS TABLE (id bigint, subject text, status text, requested_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF NOT public.has_4ol_permission(auth.uid(), 'chats.moderate') THEN
    RAISE EXCEPTION 'support_forbidden';
  END IF;
  IF p_ticket_id IS NULL OR p_ticket_id < 1 THEN
    RAISE EXCEPTION 'support_invalid_ticket';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('Open', 'Unread', 'Pending', 'Resolved', 'Escalated') THEN
    RAISE EXCEPTION 'support_invalid_status';
  END IF;
  IF p_resolution_notes IS NOT NULL AND char_length(p_resolution_notes) > 2000 THEN
    RAISE EXCEPTION 'support_invalid_resolution_notes';
  END IF;
  IF p_status IS NULL AND NOT p_update_assignee AND NOT p_update_resolution_notes THEN
    RAISE EXCEPTION 'support_empty_update';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_support
    WHERE chat_support.id = p_ticket_id AND chat_support.is_deleted = false
  ) THEN
    RAISE EXCEPTION 'support_ticket_not_found';
  END IF;

  RETURN QUERY
  UPDATE public.chat_support cs
  SET
    status = coalesce(p_status, cs.status),
    assigned_to = CASE WHEN p_update_assignee THEN p_assigned_to ELSE cs.assigned_to END,
    assigned_at = CASE
      WHEN p_update_assignee AND p_assigned_to IS NULL THEN NULL
      WHEN p_update_assignee THEN v_now
      ELSE cs.assigned_at
    END,
    resolution_notes = CASE
      WHEN p_update_resolution_notes THEN nullif(btrim(coalesce(p_resolution_notes, '')), '')
      ELSE cs.resolution_notes
    END,
    resolved_at = CASE WHEN p_status = 'Resolved' THEN v_now ELSE cs.resolved_at END,
    resolved_by = CASE WHEN p_status = 'Resolved' THEN auth.uid() ELSE cs.resolved_by END,
    escalated_at = CASE WHEN p_status = 'Escalated' THEN v_now ELSE cs.escalated_at END,
    updated_at = v_now
  WHERE cs.id = p_ticket_id
    AND cs.is_deleted = false
  RETURNING cs.id, cs.subject, cs.status, cs.requested_by;
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_support_ticket(text, text, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_support_tickets(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_support_ticket_status(bigint, text, uuid, text, boolean, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_public_support_ticket(text, text, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_support_tickets(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_support_ticket_status(bigint, text, uuid, text, boolean, boolean) TO authenticated;
