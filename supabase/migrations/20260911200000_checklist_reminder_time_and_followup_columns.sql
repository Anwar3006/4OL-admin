-- Support a time-of-day on checklist reminders (previously date-only), and
-- let period_reminder_log remember which checklist item a 'checklist_due'
-- entry was for, so a later follow-up pass can look the item up directly
-- instead of re-deriving it.
alter table public.period_ttc_checklist_progress
  add column if not exists reminder_time time without time zone;

alter table public.period_reminder_log
  add column if not exists checklist_item_id uuid references public.period_ttc_checklist_items(id);
