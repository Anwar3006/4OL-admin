-- P0-11: private storage bucket for credential documents. Matches the
-- existing hcp-verification/job-documents/prescriptions pattern exactly:
-- no storage.objects RLS policy is added, because none of those buckets has
-- one either — access is signed-URL-only, issued server-side through
-- getAdminClient(), never direct client-side bucket access. That server
-- route (issuing a scoped signed upload URL to the owner's own folder, and
-- signed read URLs for admins) is application code, left for whoever wires
-- submit_credential()'s document upload step to this bucket.
insert into storage.buckets (id, name, public)
values ('provider-credentials', 'provider-credentials', false)
on conflict (id) do nothing;
