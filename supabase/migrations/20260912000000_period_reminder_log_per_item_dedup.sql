-- The shared (user_id, reminder_kind, sent_on) dedup key meant only ONE
-- checklist reminder could ever go out per user per day, regardless of how
-- many items were actually due -- distinct-on-user in the query silently
-- picked one and the others were never even considered. period_upcoming /
-- fertile_window_start / ovulation_test_due genuinely are one-per-day
-- events, so their dedup semantics must not change; checklist_due /
-- checklist_followup need to dedup per (user, day, item) instead. Using a
-- coalesce-to-sentinel expression index keeps both correct in one key: the
-- three date-driven kinds always pass checklist_item_id = null, which
-- coalesces to the same sentinel and behaves exactly as before (one per
-- day); checklist rows always carry a real item id and dedup per-item.
alter table public.period_reminder_log
  drop constraint period_reminder_log_user_id_reminder_kind_sent_on_key;

create unique index period_reminder_log_dedup_key
  on public.period_reminder_log (
    user_id, reminder_kind, sent_on,
    (coalesce(checklist_item_id, '00000000-0000-0000-0000-000000000000'::uuid))
  );
