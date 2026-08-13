-- Epic 22: Internal Admin Task Manager.
--
-- tasks/page.tsx's Kanban board + stat cards were a fully-built UI shell
-- with zero backing table — TaskStats.tsx had hardcoded 4/6/3/12, and
-- KanbanBoard.tsx rendered an entirely fabricated task list (fake
-- compliance/security/dev tasks, fake user initials) with no drag-and-drop
-- persistence and a non-functional "+ New Task" button. This creates the
-- real table and RPCs the UI needs.

CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  description    text,
  status         text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'under_review', 'completed')),
  priority       text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category       text,
  assignee_id    uuid REFERENCES public.user_profiles(user_id),
  due_date       date,
  board_position integer NOT NULL DEFAULT 0,
  created_by     uuid REFERENCES public.user_profiles(user_id),
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_tasks_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON public.admin_tasks(status, board_position);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assignee ON public.admin_tasks(assignee_id);

ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access_admin_tasks ON public.admin_tasks;
CREATE POLICY admin_full_access_admin_tasks ON public.admin_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin', 'registrar')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin', 'registrar')
    )
  );

CREATE OR REPLACE FUNCTION public.set_admin_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_tasks_updated_at ON public.admin_tasks;
CREATE TRIGGER trg_admin_tasks_updated_at
  BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_admin_tasks_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- get_admin_task_stats() — real counts for TaskStats.tsx.
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_admin_task_stats();

CREATE OR REPLACE FUNCTION public.get_admin_task_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'new', count(*) FILTER (WHERE status = 'new'),
    'in_progress', count(*) FILTER (WHERE status = 'in_progress'),
    'under_review', count(*) FILTER (WHERE status = 'under_review'),
    'completed', count(*) FILTER (WHERE status = 'completed')
  )
  FROM public.admin_tasks;
$$;

REVOKE ALL ON FUNCTION public.get_admin_task_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_task_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_task_stats() TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- update_admin_task_status — moves a task between Kanban columns and
-- persists its position, logging the move as a real activity_logs row
-- (22.4) instead of the change vanishing on refresh like before. Also
-- stamps completed_at when a task lands in 'completed' and clears it if
-- moved back out (drag-and-drop is bidirectional).
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.update_admin_task_status(uuid, text, integer, uuid);

CREATE OR REPLACE FUNCTION public.update_admin_task_status(
  p_task_id        uuid,
  p_new_status     text,
  p_board_position integer,
  p_admin_id       uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_title      text;
BEGIN
  IF p_new_status NOT IN ('new', 'in_progress', 'under_review', 'completed') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  SELECT status, title INTO v_old_status, v_title
  FROM public.admin_tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task % not found', p_task_id;
  END IF;

  UPDATE public.admin_tasks
  SET
    status = p_new_status,
    board_position = p_board_position,
    completed_at = CASE
      WHEN p_new_status = 'completed' AND v_old_status <> 'completed' THEN now()
      WHEN p_new_status <> 'completed' THEN NULL
      ELSE completed_at
    END
  WHERE id = p_task_id;

  IF p_admin_id IS NOT NULL AND v_old_status IS DISTINCT FROM p_new_status THEN
    PERFORM public.log_admin_activity(
      p_admin_id, 'move_task', 'admin_tasks', p_task_id::text,
      format('Moved "%s" from %s to %s', v_title, v_old_status, p_new_status)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_admin_task_status(uuid, text, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_admin_task_status(uuid, text, integer, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_admin_task_status(uuid, text, integer, uuid) TO authenticated, service_role;
