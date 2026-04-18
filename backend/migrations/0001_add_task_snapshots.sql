ALTER TABLE "athlete_training_state" ADD COLUMN IF NOT EXISTS "task_snapshots" jsonb DEFAULT '{}'::jsonb NOT NULL;
