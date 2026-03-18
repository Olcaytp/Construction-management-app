-- Add quantity and unit fields to tasks table for area/volume tracking

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'adet';

-- Add comment to document the columns
COMMENT ON COLUMN tasks.quantity IS 'Task quantity (area, volume, etc.)';
COMMENT ON COLUMN tasks.unit IS 'Unit of measurement (m2, m3, kg, adet, etc.)';
