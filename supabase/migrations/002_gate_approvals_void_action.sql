-- Add 'voided' to gate_approvals.action check constraint
-- Safe to run whether or not the column currently has a check constraint.
-- Drop the existing constraint (if any) then re-add it with 'voided' included.

ALTER TABLE gate_approvals
  DROP CONSTRAINT IF EXISTS gate_approvals_action_check;

ALTER TABLE gate_approvals
  ADD CONSTRAINT gate_approvals_action_check
  CHECK (action IN ('approved', 'rejected', 'voided'));
