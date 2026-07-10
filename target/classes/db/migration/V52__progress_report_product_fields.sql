ALTER TABLE milestone_progress_reports
    ADD COLUMN IF NOT EXISTS source_code_url TEXT,
    ADD COLUMN IF NOT EXISTS demo_link TEXT,
    ADD COLUMN IF NOT EXISTS submission_notes TEXT;

UPDATE milestone_progress_reports
SET submission_notes = content
WHERE submission_notes IS NULL;
