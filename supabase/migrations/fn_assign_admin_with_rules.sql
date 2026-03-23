-- =============================================================================
-- fn_assign_admin_with_rules
--
-- Atomically performs three writes that must succeed or fail together:
--   1. Updates conversations.last_message_at + last_message_preview
--   2. Inserts the Rules of Conduct as a system message in messages
--   3. Inserts/updates the admin in conversation_members
--
-- Using an RPC keeps all writes in one round-trip and one transaction,
-- so the conversation preview, system message, and membership are never out of sync.
--
-- Parameters:
--   p_conversation_id  uuid  – target conversation
--   p_user_id          uuid  – the admin/leader being assigned (becomes sender)
--   p_role             text  – the role to assign ('admin', 'group_leader', etc.)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_assign_admin_with_rules(
  p_conversation_id uuid,
  p_user_id         uuid,
  p_role            text DEFAULT 'admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER          -- runs with the function owner's privileges so RLS
                          -- on both tables is satisfied from the server context
SET search_path = public
AS $$
BEGIN
  -- 1. Stamp the conversation with the latest activity metadata
  UPDATE conversations
  SET
    last_message_at      = NOW(),
    last_message_preview = 'System: Rules of Conduct updated'
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation % not found', p_conversation_id;
  END IF;

  -- 2. Insert the Rules of Conduct as a system message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    message_type
  ) VALUES (
    p_conversation_id,
    p_user_id,
    E'RULES OF CONDUCT:\n1. Be respectful to all members.\n2. No spam or self-promotion.\n3. Keep discussions relevant to group\'s subject matter.\n4. Protect your privacy and others\'.',
    'system'
  );

  -- 3. Insert or update the admin in conversation_members
  INSERT INTO conversation_members (
    conversation_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    p_conversation_id,
    p_user_id,
    p_role,
    NOW()
  )
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    joined_at = NOW(),
    left_at = NULL;
END;
$$;

-- Grant execute to the authenticated role so the server action can call it
-- via the service_role client (which inherits all grants)
GRANT EXECUTE ON FUNCTION public.fn_assign_admin_with_rules(uuid, uuid)
  TO authenticated;
