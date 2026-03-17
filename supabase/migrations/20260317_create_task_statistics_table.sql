-- Create task_statistics table to store custom task statistics
-- This allows users to override auto-calculated metrics like worker count, hours, days, and costs

CREATE TABLE IF NOT EXISTS task_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_count INTEGER NOT NULL DEFAULT 0,
  hours_worked DECIMAL(10, 2) NOT NULL DEFAULT 0,
  days_worked INTEGER NOT NULL DEFAULT 0,
  actual_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, task_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_task_statistics_user_id ON task_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_task_statistics_task_id ON task_statistics(task_id);
CREATE INDEX IF NOT EXISTS idx_task_statistics_user_task ON task_statistics(user_id, task_id);

-- Enable RLS
ALTER TABLE task_statistics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own task statistics
CREATE POLICY "Users can view their own task statistics" 
ON task_statistics FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own task statistics
CREATE POLICY "Users can create their own task statistics"
ON task_statistics FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own task statistics
CREATE POLICY "Users can update their own task statistics"
ON task_statistics FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own task statistics
CREATE POLICY "Users can delete their own task statistics"
ON task_statistics FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_statistics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_statistics_updated_at_trigger ON task_statistics;
CREATE TRIGGER update_task_statistics_updated_at_trigger
BEFORE UPDATE ON task_statistics
FOR EACH ROW
EXECUTE FUNCTION update_task_statistics_updated_at();

COMMENT ON TABLE task_statistics IS 'Custom task statistics for tracking worker count, hours, days, and costs per task';
