import { ChatPromptTemplate } from '@langchain/core/prompts'

const SYSTEM = `You are an expert Business Analyst at Comotion, a business solutions consultancy.
You are writing Document B — a client-facing business proposal for ONE chosen solution.
The document will be sent to a business decision-maker at the client organisation.

Your output must:
- Use client language throughout — not technical jargon, not internal Comotion terminology
- Draw explicitly from the brief fields provided: pain points, root cause analysis, business impact, compliance and regulatory, constraints, and success criteria
- Be specific — use numbers, timeframes, and named roles where the brief provides them
- Write for a business decision-maker audience, not a technical one
- Give each pain point a clear business_impact statement; quantify where the brief provides data
- Frame ROI using the brief's quantified_estimate if available, with payback period and efficiency gains
- Do not reference AI, LangChain, Claude, or any internal tooling
- This proposal is for ONE chosen solution — not multiple options
- Return valid JSON only. No explanation. No markdown fences.`

export const DOCUMENT_B_SCHEMA = `Return JSON matching this exact schema:
{
  "document_title": "string",
  "client_name": "string",
  "date": "string",
  "executive_summary": "string (3-4 paragraphs — compelling, business-focused, references quantified impact if available)",
  "current_state": "string (2-3 paragraphs — describe the current process and its problems in client language, drawn from current_process_detail and pain_points)",
  "pain_points": [{ "title": "string", "description": "string", "business_impact": "string" }],
  "stakeholder_impact": [{ "role": "string", "current_situation": "string", "impact_of_change": "string", "severity": "High | Medium | Low" }],
  "compliance_considerations": ["string"],
  "solution": {
    "title": "string",
    "description": "string (3-4 paragraphs — benefit-focused, non-technical, explains what changes and why it matters)",
    "effort": "Low | Medium | High",
    "impact": "Low | Medium | High",
    "roi_framing": "string (2 paragraphs — quantified where possible, payback period, efficiency gains)",
    "key_risks": [{ "risk": "string", "mitigation": "string" }],
    "sequencing": "Quick Win | Medium Term | Strategic"
  },
  "success_criteria": [{ "criterion": "string", "measure": "string", "target": "string" }],
  "assumptions": ["string"],
  "recommended_path": "string (2-3 paragraphs — clear next steps, what happens after this proposal is approved)",
  "footer_note": "string"
}`

const HUMAN = `Client: {client_name}
Organisation: {organisation}
Date: {date}

{schema}

Rules:
- Write for a business audience, not a technical one
- Use client language from the brief wherever possible
- Be specific — use numbers, timeframes, and named roles where provided
- Pain points must each have a clear business_impact statement; quantify where possible
- ROI framing must reference the brief's quantified_estimate if available
- Do not include internal Comotion pipeline details or technical spec content
- Do not reference AI, LangChain, or any internal tooling
- Tone: professional, clear, collaborative
- Write substantial content — do not use one-liners for any field that specifies paragraphs

Brief — Executive Summary:
{brief_executive_summary}

Brief — Current Process:
{brief_current_process}

Brief — Pain Points:
{brief_pain_points}

Brief — Root Cause Analysis:
{brief_root_cause_analysis}

Brief — Business Impact:
{brief_business_impact}

Brief — Stakeholder Analysis:
{brief_stakeholder_analysis}

Brief — Compliance & Regulatory:
{brief_compliance}

Brief — Constraints & Dependencies:
{brief_constraints}

Brief — Recommended Focus Areas:
{brief_recommended_focus}

Brief — Success Criteria:
{brief_success_criteria}

Chosen Solution:
{chosen_solution_json}

Supplementary Context from BA:
{context_text}

Generate a professional Comotion business proposal for Document B. Focus on the chosen solution only. Use client-facing language.

Return only the JSON object. No markdown fences, no explanation.`

export const proposalGenerationPrompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM],
  ['human', HUMAN],
])
