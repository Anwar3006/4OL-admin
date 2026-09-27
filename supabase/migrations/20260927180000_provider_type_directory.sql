-- Provider directory taxonomy. A public listing entity is separate from its
-- workspace kind: spas remain care facilities, but never people profiles.

alter table public.provider_types
  add column if not exists listing_entity text not null default 'business'
  check (listing_entity in ('person', 'business'));

alter table public.provider_types
  drop constraint if exists provider_types_directory_category_chk,
  add constraint provider_types_directory_category_chk check (
    directory_category is null or directory_category in (
      'health_facilities', 'health_professionals', 'fitness_wellness',
      'pharmacies_shops', 'health_schools', 'ambulance'
    )
  );

update public.provider_types
set directory_category = 'health_facilities', listing_entity = 'business',
    icon = case key
      when 'hospital_clinic' then 'fa6:hospital'
      when 'dental_clinic' then 'fa6:tooth'
      when 'eye_clinic' then 'ion:eye'
      when 'physio_centre' then 'mci:arm-flex-outline'
      when 'osteopathy_centre' then 'fa6:bone'
      when 'prosthetics_centre' then 'mci:human-cane'
      when 'psychiatric_centre' then 'mci:head-heart-outline'
      when 'care_home' then 'mci:shield-home-outline'
      when 'maternity_home' then 'mci:baby-carriage'
      when 'diagnostic_lab' then 'fa6:flask'
      when 'imaging_centre' then 'mci:scanner'
      when 'herbal_centre' then 'mci:leaf' end
where key = any(array['hospital_clinic','dental_clinic','eye_clinic','physio_centre','osteopathy_centre','prosthetics_centre','psychiatric_centre','care_home','maternity_home','diagnostic_lab','imaging_centre','herbal_centre']);

update public.provider_types
set directory_category = 'health_schools', listing_entity = 'business', icon = 'fa6:graduation-cap'
where key = 'health_school';

update public.provider_types
set directory_category = 'pharmacies_shops', listing_entity = 'business',
    icon = case key
      when 'pharmacy' then 'fa6:prescription-bottle-medical'
      when 'otc_medicine_seller' then 'mci:pill'
      when 'supplement_shop' then 'mci:food-apple'
      when 'healthy_food_shop' then 'mci:leaf'
      when 'herbal_product_seller' then 'mci:leaf' end
where key = any(array['pharmacy','otc_medicine_seller','supplement_shop','healthy_food_shop','herbal_product_seller']);

update public.provider_types
set directory_category = 'health_professionals', listing_entity = 'person',
    icon = case key
      when 'doctor' then 'fa6:user-doctor'
      when 'nurse_midwife' then 'fa6:user-nurse'
      when 'physiotherapist' then 'mci:arm-flex-outline'
      when 'dietitian' then 'mci:food-apple'
      when 'optometrist' then 'ion:eye'
      when 'counsellor' then 'mci:account-heart-outline' end
where key = any(array['doctor','nurse_midwife','physiotherapist','dietitian','optometrist','counsellor']);

update public.provider_types
set directory_category = 'fitness_wellness',
    listing_entity = case when key = 'personal_trainer' then 'person' else 'business' end,
    icon = case when key in ('personal_trainer','gym') then 'fa6:dumbbell' else 'fa6:calendar-days' end
where key = any(array['personal_trainer','gym','event_organiser']);

update public.provider_types
set directory_category = 'ambulance', listing_entity = 'business', icon = 'fa6:truck-medical'
where key = 'ambulance_service';

update public.provider_types
set directory_category = null, listing_entity = 'business',
    icon = case key when 'wholesaler' then 'fa6:boxes-stacked' else 'fa6:truck-medical' end
where key = any(array['wholesaler','medical_supplier']);

insert into public.provider_types
  (key, kind, label, directory_category, listing_entity, icon, is_listed, sort_order, is_active)
values
  ('spa', 'care_facility', 'Spa', 'fitness_wellness', 'business', 'mci:spa', true, 430, true)
on conflict (key) do update set
  kind = excluded.kind, label = excluded.label,
  directory_category = excluded.directory_category,
  listing_entity = excluded.listing_entity, icon = excluded.icon,
  is_listed = excluded.is_listed, sort_order = excluded.sort_order, is_active = excluded.is_active;

insert into public.provider_type_requirements (provider_type, credential_type, required_for_activation)
values ('spa', 'business_reg', true)
on conflict (provider_type, credential_type) do update set
  required_for_activation = excluded.required_for_activation;

notify pgrst, 'reload schema';
