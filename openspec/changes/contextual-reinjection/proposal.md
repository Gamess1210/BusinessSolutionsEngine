## Why

Between Gate 2 approval (Solutions Review) and Gate 3 (Business Proposal generation), the BA sometimes discovers missing context — a follow-up client call, a corrected constraint, new stakeholder requirements. Currently, the capture input panel (brain-dump, guided, transcript) is only accessible at `captured` status, so there is no sanctioned path to add this context without reverting the engagement manually. This forces BAs to either proceed with incomplete context or manipulate database state directly, both of which produce unreliable proposals.

## What Changes

- **Input panel availability**: The capture input panel (brain-dump, guided mode, transcript) becomes accessible at `gate2_review` status in addition to `captured`. No other gate statuses unlock it.
- **Supplementary input banner**: When a new input is submitted at `gate2_review`, a dismissible banner appears on the engagement detail screen. It warns that the brief and solutions were generated without this input, and offers a single action: **Regenerate brief & solutions**.
- **Regeneration flow**: If the BA confirms regeneration, the system re-runs `consolidationChain` (all inputs combined, including the new one), then re-runs the appropriate solution chain (`quickIdeasChain` or `deepAnalysisChain` depending on `analysis_mode`). The engagement remains at `gate2_review` throughout.
- **Gate 2 reset**: After regeneration completes, the existing Gate 2 approval record is voided (or a new `gate2_review` status is written), and the BA must re-review and re-approve the updated solutions before Gate 3 can proceed.
- **No automatic progression**: Regeneration never triggers Gate 3 automatically. The BA must explicitly re-approve Gate 2.

## Rejection and Re-run Flow

1. BA adds supplementary input at `gate2_review`.
2. Banner appears: *"New context added. The current brief and solutions do not reflect this input. Regenerate to update them before proceeding to Gate 3."*
3. **BA dismisses banner (no action)**: Engagement proceeds to Gate 3 on existing brief and solutions. The supplementary input is stored in `engagement_inputs` but not reflected in the current brief — this is a conscious BA decision.
4. **BA confirms regeneration**: `consolidationChain` runs → `structured_brief` is overwritten → solution chain runs → solutions are overwritten → Gate 2 approval is voided → BA reviews updated solutions → re-approves → Gate 3 unlocks.
5. **Chain failure during regeneration**: Standard error recovery applies — `status` is set to `failed`, `last_successful_gate` is preserved, BA is notified via Teams. The prior brief and solutions remain in place until regeneration succeeds.

## Impact

- **`src/pages/EngagementDetail.jsx`** — unlock input panel at `gate2_review`; add supplementary context banner component
- **`src/components/`** — new `SupplementaryContextBanner` component
- **`api/pipeline/consolidate.js`** — must accept re-run requests from `gate2_review` status (currently may guard against non-`captured` status)
- **`api/pipeline/solutions.js`** — same guard relaxation required
- **`gate_approvals` table** — voiding/resetting Gate 2 record on regeneration; schema must support this
- **No new chains** — re-uses `consolidationChain` and the existing solution chains
