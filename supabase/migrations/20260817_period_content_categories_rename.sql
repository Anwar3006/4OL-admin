-- Widen two of the three Period Library categories seeded in
-- 20260817_period_content_categories.sql — "Move Your Body" and "Stay
-- Hydrated" were too narrow to capture a wide range of published content.
-- "Nutrition" was fine as-is and is untouched.
update public.period_content_categories
set slug = 'exercise', label = 'Exercise'
where slug = 'movement';

update public.period_content_categories
set slug = 'wellness', label = 'Wellness'
where slug = 'hydration';
