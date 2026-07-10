ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS evidence_collection_due_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS staff_access_scope VARCHAR(50),
    ADD COLUMN IF NOT EXISTS staff_access_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS staff_sla_due_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS staff_sla_escalated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS admin_final_expert_percentage INT,
    ADD COLUMN IF NOT EXISTS admin_final_note TEXT,
    ADD COLUMN IF NOT EXISTS admin_revision_note TEXT,
    ADD COLUMN IF NOT EXISTS admin_revision_requested_at TIMESTAMP;

ALTER TABLE disputes DROP CONSTRAINT IF EXISTS chk_disputes_status;
ALTER TABLE disputes ADD CONSTRAINT chk_disputes_status CHECK (
    status IN (
        'Open',
        'UnderReview',
        'Resolved',
        'Escalated',
        'PENDING_SELF_RESOLVE',
        'ESCALATION_REQUESTED',
        'STAFF_REVIEWING',
        'STAFF_DECIDED',
        'REPORT_REVISION_REQUESTED',
        'INTERVENTION_REJECTED',
        'RESOLVED',
        'CANCELLED'
    )
);

CREATE INDEX IF NOT EXISTS idx_disputes_staff_sla_due
    ON disputes(staff_sla_due_at, status);
