ALTER TABLE operations ADD COLUMN IF NOT EXISTS scheduled_date DATE;
UPDATE operations SET scheduled_date = TO_DATE(split_part(shift, ' | ', 1), 'YYYY-MM-DD') WHERE shift LIKE '% | %';
-- Strip the date from the shift string for clean shift names
UPDATE operations SET shift = split_part(shift, ' | ', 2) WHERE shift LIKE '% | %';
