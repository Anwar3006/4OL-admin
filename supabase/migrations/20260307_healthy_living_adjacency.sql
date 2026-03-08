-- Migration Script: Transform Healthy Living to Adjacency List

-- 1. Add parent_id for self-reference
ALTER TABLE healthy_living ADD COLUMN parent_id UUID REFERENCES healthy_living(id) ON DELETE CASCADE;

-- 2. Add index for performance
CREATE INDEX idx_healthy_living_parent_id ON healthy_living(parent_id);

-- 3. Migrate data from healthy_living_types to healthy_living
-- This ensures existing sub-categories are preserved as child nodes
INSERT INTO healthy_living (name, about, parent_id, slug, image_url, attribution)
SELECT 
    t.type_name, 
    t.about_type, 
    t.healthy_living_id, 
    lower(regexp_replace(t.type_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || floor(random() * 1000)::text,
    '', 
    '{}'::jsonb
FROM healthy_living_types t;

-- 4. Remove types table
DROP TABLE IF EXISTS healthy_living_types;

-- 5. Remove legacy fields from healthy_living
ALTER TABLE healthy_living 
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS contact_your_doctor,
DROP COLUMN IF EXISTS more_information;

-- NOTE: The 'about' field is preserved as the unified content field.
