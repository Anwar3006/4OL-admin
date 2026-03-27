-- ============================================================
-- Workouts Table
-- ============================================================

-- Body parts enum values (from reference design):
-- Arm, Back, Biceps, Chest, Chest and Triceps, Glutes, Hamstring,
-- Legs, Quadriceps, Rectus Abdominus Muscle, Shoulder, Triceps

-- Equipment types (from reference design):
-- No Equipment, Barbell, Dumbbell, Kettlebell, Gym Machine Workout,
-- Resistance Band, Treadmill, Exercise Bike,
-- Yoga/Exercise Mat, Skipping Ropes, Exercise Balls, Weight Bench, Pull up bar

CREATE TABLE IF NOT EXISTS workouts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name        TEXT NOT NULL,
  primary_body_part    TEXT NOT NULL,
  secondary_body_part  TEXT,
  equipment_type       TEXT NOT NULL,
  intensity            SMALLINT CHECK (intensity BETWEEN 1 AND 5),
  video_url            TEXT,
  thumbnail_urls       TEXT[] DEFAULT '{}',
  how_to               JSONB DEFAULT '[]'::jsonb,          -- rich text (HTML string)
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_workouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_workouts_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workouts_primary_body_part  ON workouts(primary_body_part);
CREATE INDEX IF NOT EXISTS idx_workouts_equipment_type     ON workouts(equipment_type);
CREATE INDEX IF NOT EXISTS idx_workouts_intensity          ON workouts(intensity);
CREATE INDEX IF NOT EXISTS idx_workouts_is_active          ON workouts(is_active);
CREATE INDEX IF NOT EXISTS idx_workouts_exercise_name      ON workouts USING gin(to_tsvector('english', exercise_name));

-- RLS
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Allow public read of active workouts (mobile app)
CREATE POLICY "Public can read active workouts"
  ON workouts FOR SELECT
  USING (is_active = true);

-- Admin full access (admin panel uses service role or anon with is checked)
CREATE POLICY "Service role full access to workouts"
  ON workouts
  USING (true)
  WITH CHECK (true);
