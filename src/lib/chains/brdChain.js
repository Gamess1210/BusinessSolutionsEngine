import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { ChatAnthropic } from '@langchain/anthropic'

const _jsonParser = new JsonOutputParser()

function stripJsonFences(text) {
  return text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()
}

async function parseJsonWithFallback(message) {
  try {
    return await _jsonParser.invoke(message)
  } catch {
    const text = typeof message.content === 'string' ? message.content : String(message)
    const stripped = stripJsonFences(text)
    const start = stripped.search(/[{[]/)
    if (start === -1) throw new Error('brdChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('brdChain: failed to parse Claude response as JSON')
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      throw new Error('brdChain: failed to parse Claude response as JSON')
    }
  }
}

function formatBriefText(b) {
  return {
    executive_summary: b.executive_summary ?? '',
    current_process: b.current_process_detail ?? '',
    root_cause: b.root_cause_analysis ?? '',
    business_impact: b.business_impact ?? '',
    compliance: b.compliance_and_regulatory ?? '',
    constraints: b.constraints_and_dependencies ?? '',
    recommended_focus: b.recommended_focus_areas ?? '',
  }
}

function formatBriefCollections(b) {
  return {
    pain_points: JSON.stringify(b.pain_points ?? [], null, 2),
    stakeholders: JSON.stringify(b.stakeholder_analysis ?? [], null, 2),
    success_criteria: JSON.stringify(b.success_criteria ?? [], null, 2),
  }
}

function formatInput({ engagement }) {
  const b = engagement.structured_brief ?? {}
  return {
    client_name: engagement.client_name ?? '',
    organisation: engagement.organisation ?? '',
    date: new Date().toISOString().slice(0, 10),
    ...formatBriefText(b),
    ...formatBriefCollections(b),
  }
}

const SYSTEM_PROMPT = `You are a senior business analyst producing a Business Requirements Document (BRD) for a financial services client engagement. Produce a comprehensive BRD in the following JSON format:

{
  "client_name": "string",
  "organisation": "string",
  "date": "string",
  "version": "1.0",
  "executive_summary": "string — 3-4 sentence executive summary",
  "business_context": "string — paragraph describing the business problem and its context",
  "scope_in": ["string — capability or area explicitly in scope"],
  "scope_out": ["string — capability or area explicitly out of scope"],
  "stakeholders": [
    { "name": "string", "role": "string", "interest": "string", "influence": "High|Medium|Low" }
  ],
  "requirements": [
    {
      "id": "BR-001",
      "description": "string — clear, testable requirement statement",
      "category": "string — e.g. Process, Data, Integration, Reporting, Security",
      "moscow": "Must|Should|Could|Won't",
      "notes": "string — acceptance criteria or clarifications"
    }
  ],
  "compliance": ["string — regulatory or compliance requirement"],
  "success_criteria": [
    { "criterion": "string", "measure": "string", "target": "string" }
  ],
  "assumptions": ["string — assumption the requirements depend on"],
  "glossary": [
    { "term": "string", "definition": "string" }
  ]
}

Rules:
- Generate 8–20 numbered business requirements (BR-001, BR-002, …)
- Assign MoSCoW priority thoughtfully — not everything is Must
- Scope out at least 2–3 items to show deliberate boundary-setting
- Include all domain-specific terms in the glossary
- Compliance section must reference specific regulations applicable to financial services where relevant
- Return only valid JSON — no markdown fences, no explanation`

const HUMAN_TEMPLATE = `Client: {client_name}
Organisation: {organisation}
Date: {date}

Executive Summary:
{executive_summary}

Current Process:
{current_process}

Root Cause Analysis:
{root_cause}

Business Impact:
{business_impact}

Pain Points:
{pain_points}

Stakeholder Analysis:
{stakeholders}

Compliance Requirements:
{compliance}

Constraints and Dependencies:
{constraints}

Success Criteria:
{success_criteria}

Recommended Focus Areas:
{recommended_focus}

Return only the JSON object. No markdown fences, no explanation.`

const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  ['human', HUMAN_TEMPLATE],
])

const formatStep = RunnableLambda.from(formatInput)
const outputParser = RunnableLambda.from(parseJsonWithFallback)

export async function brdChain(input) {
  const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 16000 })
  const chain = RunnableSequence.from([formatStep, prompt, claudeModel, outputParser])
  return chain.invoke(input)
}
