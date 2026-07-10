ALTER TABLE milestones DROP CONSTRAINT IF EXISTS chk_milestones_status;
ALTER TABLE milestones ADD CONSTRAINT chk_milestones_status
    CHECK (status IN ('PENDING', 'DEPOSITED', 'IN_PROGRESS', 'OVERDUE', 'UNDER_REVIEW', 'DISPUTED', 'COMPLETED', 'CANCELLED'));

ALTER TABLE contract_milestones DROP CONSTRAINT IF EXISTS chk_contract_milestones_status;
ALTER TABLE contract_milestones ADD CONSTRAINT chk_contract_milestones_status
    CHECK (status IN ('PENDING', 'DEPOSITED', 'IN_PROGRESS', 'OVERDUE', 'UNDER_REVIEW', 'DISPUTED', 'COMPLETED', 'CANCELLED'));

ALTER TABLE milestone_progress_reports
    ADD COLUMN IF NOT EXISTS business_feedback TEXT,
    ADD COLUMN IF NOT EXISTS feedback_by_account_id INT REFERENCES account(account_id),
    ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS requires_adjustment BOOLEAN NOT NULL DEFAULT FALSE;
