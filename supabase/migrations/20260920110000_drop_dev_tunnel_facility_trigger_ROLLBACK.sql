-- ROLLBACK for 20260920110000_drop_dev_tunnel_facility_trigger
--
-- Restores the original function and trigger definitions (captured from prod
-- 20 Sept 2026) but leaves the trigger DISABLED, because enabling it sends
-- facility contact data to a developer dev tunnel with a leaked secret.
-- Do not enable it. If you need a webhook on facility creation, point it at a
-- real endpoint with a secret from Vault, not a hard-coded header.
begin;

create or replace function public.handle_new_facility()
returns trigger
language plpgsql
as $function$BEGIN
  -- This sends the new row data to your external API/Action
  PERFORM net.http_post(
    url := 'https://bx9dscmp-3000.uks1.devtunnels.ms/api/notify',
    body := jsonb_build_object(
      'facility_whatsapp', NEW.whatsapp_number,
      'facility_phone', NEW.contact_number,
      'owner_phone', NEW.person_contact_number,
      'facility_name', NEW.facility_name,
      'facility_email', NEW.email,
      'temp_key', NEW.gps_address
    ),
    headers := '{"Content-Type": "application/json", "x-webhook-secret": "4OurLife-WhatsApp"}'::jsonb
  );
  RETURN NEW;
END;$function$;

create trigger on_facility_created
  after insert on public.facility_profile
  for each row execute function public.handle_new_facility();

alter table public.facility_profile disable trigger on_facility_created;

commit;
