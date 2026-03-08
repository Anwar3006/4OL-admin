-- Migration Script: Refactor Healthy Living Table
-- Run this to drop and recreate the table with improved schema

-- 1. Drop existing table and related objects
DROP TABLE IF EXISTS healthy_living CASCADE;

-- 2. Drop any existing RPC functions
DROP FUNCTION IF EXISTS insert_healthy_living CASCADE;
DROP FUNCTION IF EXISTS update_healthy_living CASCADE;
DROP FUNCTION IF EXISTS delete_healthy_living CASCADE;
DROP FUNCTION IF EXISTS insert_healthy_living_tree CASCADE;

-- 3. Create the healthy_living table
--    - adjacency list via parent_id for the hierarchy (Alcohol → Low-Risk Drinking, etc.)
--    - content_sections JSONB stores rich-text sections WITHIN a single node's detail page
--      (NOT child nodes — those go in the DB as separate rows with parent_id)
--    - description is the short preview text shown on cards
--    - display_order controls sibling ordering
CREATE TABLE healthy_living (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ DEFAULT now(),
    name            TEXT        NOT NULL,
    slug            TEXT        UNIQUE NOT NULL,
    description     TEXT,                                               -- Short card preview text
    content_sections JSONB      DEFAULT '[]'::jsonb,                   -- [{sub_name: string, sub_content: jsonb}]
    display_order   INT         DEFAULT 0,                              -- Ordering among siblings
    parent_id       UUID        REFERENCES healthy_living(id) ON DELETE CASCADE,
    image_url       TEXT,
    attribution     JSONB       DEFAULT '{}'::jsonb
);

-- 4. Indexes - Not inserted yet
CREATE INDEX idx_healthy_living_parent_id    ON healthy_living(parent_id);
CREATE INDEX idx_healthy_living_display_order ON healthy_living(parent_id, display_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RECURSIVE TREE INSERT
--    Accepts a full JSON tree and inserts parent + all descendants in one
--    transaction. The frontend builds the tree, computes slugs, then calls this.
--
--    Tree node shape (JSONB):
--    {
--      "name":             "Alcohol",
--      "slug":             "alcohol",
--      "description":      "Short card text",
--      "content_sections": [{"sub_name": "...", "sub_content": {...}}],
--      "display_order":    0,
--      "image_url":        "https://...",
--      "attribution":      {...},
--      "children":         [ <same shape recursively> ]
--    }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION insert_healthy_living_tree(
    p_node      JSONB,
    p_parent_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id    UUID;
    v_child JSONB;
    v_order INT := 0;
BEGIN
    INSERT INTO healthy_living (
        name, slug, description, content_sections,
        display_order, parent_id, image_url, attribution
    )
    VALUES (
        p_node->>'name',
        p_node->>'slug',
        p_node->>'description',
        COALESCE(p_node->'content_sections', '[]'::jsonb),
        COALESCE((p_node->>'display_order')::INT, 0),
        p_parent_id,
        NULLIF(p_node->>'image_url', ''),
        COALESCE(p_node->'attribution', '{}'::jsonb)
    )
    RETURNING id INTO v_id;

    -- Recursively insert children
    FOR v_child IN
        SELECT value FROM jsonb_array_elements(COALESCE(p_node->'children', '[]'::jsonb))
    LOOP
        PERFORM insert_healthy_living_tree(
            v_child || jsonb_build_object('display_order', v_order),
            v_id
        );
        v_order := v_order + 1;
    END LOOP;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SINGLE NODE INSERT (still useful for quick additions)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION insert_healthy_living(
    p_name             TEXT,
    p_slug             TEXT,
    p_description      TEXT        DEFAULT NULL,
    p_content_sections JSONB       DEFAULT '[]'::jsonb,
    p_display_order    INT         DEFAULT 0,
    p_parent_id        UUID        DEFAULT NULL,
    p_image_url        TEXT        DEFAULT NULL,
    p_attribution      JSONB       DEFAULT '{}'::jsonb
) RETURNS SETOF healthy_living AS $$
BEGIN
    RETURN QUERY
    INSERT INTO healthy_living (
        name, slug, description, content_sections,
        display_order, parent_id, image_url, attribution
    )
    VALUES (
        p_name, p_slug, p_description, p_content_sections,
        p_display_order, p_parent_id,
        NULLIF(p_image_url, ''), p_attribution
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SINGLE NODE UPDATE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_healthy_living(
    p_id               UUID,
    p_name             TEXT,
    p_slug             TEXT,
    p_description      TEXT        DEFAULT NULL,
    p_content_sections JSONB       DEFAULT '[]'::jsonb,
    p_display_order    INT         DEFAULT 0,
    p_parent_id        UUID        DEFAULT NULL,
    p_image_url        TEXT        DEFAULT NULL,
    p_attribution      JSONB       DEFAULT '{}'::jsonb
) RETURNS SETOF healthy_living AS $$
BEGIN
    RETURN QUERY
    UPDATE healthy_living
    SET
        name              = p_name,
        slug              = p_slug,
        description       = p_description,
        content_sections  = p_content_sections,
        display_order     = p_display_order,
        parent_id         = p_parent_id,
        image_url         = NULLIF(p_image_url, ''),
        attribution       = p_attribution
    WHERE id = p_id
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. DELETE (cascade handled by FK, but RPC kept for consistency)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_healthy_living(p_id UUID) RETURNS VOID AS $$
BEGIN
    DELETE FROM healthy_living WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;
