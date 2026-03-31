-- Conditions table
ALTER TABLE public.conditions ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.conditions ALTER COLUMN slug DROP NOT NULL;
ALTER TABLE public.conditions ALTER COLUMN nhs_link DROP NOT NULL;
ALTER TABLE public.conditions ALTER COLUMN is_systemic DROP NOT NULL;

-- Healthy Living table (healthy_living_info)
ALTER TABLE public.healthy_living_info ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.healthy_living_info ALTER COLUMN slug DROP NOT NULL;

-- Symptoms table
ALTER TABLE public.symptoms ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.symptoms ALTER COLUMN slug DROP NOT NULL;
ALTER TABLE public.symptoms ALTER COLUMN nhs_link DROP NOT NULL;
ALTER TABLE public.symptoms ALTER COLUMN is_systemic DROP NOT NULL;
