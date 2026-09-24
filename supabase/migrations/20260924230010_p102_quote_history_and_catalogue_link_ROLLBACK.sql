-- Rollback for 20260924230010_p102_quote_history_and_catalogue_link.sql.
drop function if exists public.get_vendor_enquiry_quote_history(uuid);
drop trigger if exists trg_enquiry_response_catalogue_guard on public.enquiry_responses;
drop function if exists public.fn_enquiry_response_catalogue_guard();
drop index if exists public.enquiry_responses_facility_status_idx;
alter table public.enquiry_responses drop column if exists catalogue_item_id;
notify pgrst, 'reload schema';
