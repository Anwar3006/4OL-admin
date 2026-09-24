-- P2-03 step 4a · Add `paid_chat` to subscription_privilege
--
-- P1-07 lists this value; it was never added. It is the provider half of the
-- premium chat rule: the patient needs an `all_access` subscription and the
-- provider needs `paid_chat` on its plan.
--
-- **This migration contains nothing but the ALTER TYPE, on purpose.** A new enum
-- value cannot be *used* in the same transaction that adds it — Postgres raises
-- "unsafe use of new value of enum type". Any policy, function or seed that
-- mentions 'paid_chat' therefore has to land in a later migration, and keeping
-- this one alone is what makes that safe.
--
-- Note on the naming in the handover: it says the patient needs "full_access"
-- premium. The value in this schema is **`all_access`** —
-- `user_subscriptions.scope` is CHECKed to ('all_access','fitness_only'), and
-- `get_my_entitlement()` returns it as `tier_scope`. Use `all_access`.
--
-- Adding an enum value is not reversible in Postgres; see the rollback file.

alter type public.subscription_privilege add value if not exists 'paid_chat';
