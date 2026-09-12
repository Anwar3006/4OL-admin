-- get_due_period_reminders' checklist follow-up loop inserts
-- reminder_kind = 'checklist_followup', which this constraint didn't
-- whitelist yet.
alter table public.period_reminder_log drop constraint period_reminder_log_reminder_kind_check;
alter table public.period_reminder_log add constraint period_reminder_log_reminder_kind_check
  check (reminder_kind = ANY (ARRAY['period_upcoming'::text, 'fertile_window_start'::text, 'ovulation_test_due'::text, 'checklist_due'::text, 'checklist_followup'::text]));
