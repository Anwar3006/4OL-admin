-- =============================================================================
-- Anatomy drug body-part links (Task 5).
--
-- Lets the existing AI body-part review queue propose drug mappings while
-- keeping publication human-controlled through drug_body_parts.
-- =============================================================================

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ai_body_part_mappings'
  ) then
    alter table public.ai_body_part_mappings
      drop constraint if exists ai_body_part_mappings_content_type_check;

    alter table public.ai_body_part_mappings
      add constraint ai_body_part_mappings_content_type_check
      check (content_type in ('condition','symptom','tip','workout','drug'));
  end if;
end $$;

