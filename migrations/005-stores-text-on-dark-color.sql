-- Add text_on_dark_color column to stores table
-- This color will be used for text displayed on dark backgrounds (header and order summary)

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS text_on_dark_color TEXT DEFAULT '#FFFFFF';

-- Update existing stores to have white text by default
UPDATE stores 
SET text_on_dark_color = '#FFFFFF' 
WHERE text_on_dark_color IS NULL;
