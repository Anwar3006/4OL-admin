-- =============================================================================
-- Close an anon-callable gap in the RBAC enforcement primitives.
--
-- This project grants EXECUTE on newly-created public-schema functions to
-- `anon` directly (confirmed via pg_proc.proacl — anon=X/postgres on
-- creation), not only via the PUBLIC pseudo-role. 20260817_rbac_permission_catalog.sql's
-- `revoke all on function ... from public` therefore did NOT revoke anon's
-- access: has_4ol_permission, get_effective_admin_permissions and
-- is_platform_admin were all callable by unauthenticated callers via
-- /rest/v1/rpc/<function>, letting anyone pass an arbitrary user_id and
-- learn that user's admin permissions with no session at all.
--
-- search_top_rated_items and is_app_admin are deliberately left alone: the
-- former is intentionally anon-callable for a public browse feature, and
-- the latter must stay anon-executable so RLS policies that call it remain
-- evaluable for anon-scoped queries.
-- =============================================================================

revoke all on function public.has_4ol_permission(uuid, text) from anon;
revoke all on function public.get_effective_admin_permissions(uuid) from anon;
revoke all on function public.is_platform_admin(uuid) from anon;
