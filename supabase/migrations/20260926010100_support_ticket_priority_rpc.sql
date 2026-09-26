-- Preserve the office triage priority control while routing every ticket
-- status change through the permission-checked support RPC.

DROP FUNCTION IF EXISTS public.update_support_ticket_status(bigint, text, uuid, text, boolean, boolean);

CREATE FUNCTION public.update_support_ticket_status(
  p_ticket_id bigint,
  p_status text DEFAULT NULL,
  p_priority text DEFAULT NULL,
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
  IF p_priority IS NOT NULL AND p_priority NOT IN ('Low', 'Medium', 'High') THEN
    RAISE EXCEPTION 'support_invalid_priority';
  END IF;
  IF p_resolution_notes IS NOT NULL AND char_length(p_resolution_notes) > 2000 THEN
    RAISE EXCEPTION 'support_invalid_resolution_notes';
  END IF;
  IF p_status IS NULL AND p_priority IS NULL AND NOT p_update_assignee AND NOT p_update_resolution_notes THEN
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
    priority = coalesce(p_priority, cs.priority),
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

REVOKE ALL ON FUNCTION public.update_support_ticket_status(bigint, text, text, uuid, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_support_ticket_status(bigint, text, text, uuid, text, boolean, boolean) TO authenticated;
