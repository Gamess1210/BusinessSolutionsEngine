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
    if (start === -1) throw new Error('changeManagementChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('changeManagementChain: failed to parse Claude response as JSON')
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      throw new Error('changeManagementChain: failed to parse Claude response as JSON')
    }
  }
}

function formatInput({ engagement }) {
  const b = engagement.structured_brief ?? {}
  return {
    client_name: engagement.client_name ?? '',
    organisation: engagement.organisation ?? '',
    date: new Date().toISOString().slice(0, 10),
    chosen_solution: JSON.stringify(engagement.chosen_solution ?? {}, null, 2),
    executive_summary: b.executive_summary ?? '',
    stakeholders: JSON.stringify(b.stakeholder_analysis ?? [], null, 2),
    success_criteria: JSON.stringify(b.success_criteria ?? [], null, 2),
    compliance: b.compliance_and_regulatory ?? '',
  }
}

const SYSTEM_PROMPT = `You are a senior business analyst producing a Business Readiness and Change Management Plan for a financial services client engagement. Produce a comprehensive plan in the following JSON format:

{
  "client_name": "string",
  "date": "string",
  "change_overview": {
    "summary": "string — 2-3 sentence plain-language description of the change",
    "scope": "string — what is changing and what is not",
    "timeline": "string — estimated delivery timeline",
    "approach": "string — phased, big-bang, pilot, etc."
  },
  "comms_plan": [
    {
      "audience": "string",
      "message": "string — key message for this audience",
      "channel": "string — e.g. Email, Town Hall, Team Brief, Intranet",
      "timing": "string — e.g. Week -4, Go-live day, Week +2",
      "owner": "string — role responsible"
    }
  ],
  "training_plan": [
    {
      "group": "string — who needs training",
      "content": "string — what they need to learn",
      "format": "string — e.g. Instructor-led, eLearning, Job aids, Shadowing",
      "duration": "string — e.g. 2 hours, 1 day",
      "timing": "string — relative to go-live, e.g. 2 weeks before"
    }
  ],
  "process_docs": ["string — document that needs to be created or updated"],
  "go_live_checklist": [
    {
      "item": "string — checklist item",
      "owner": "string — role responsible",
      "due_date": "string — e.g. T-5 days, Go-live day",
      "status": "Not Started"
    }
  ],
  "rollback_plan": [
    {
      "trigger": "string — condition that would trigger rollback",
      "step": "string — action to take",
      "owner": "string — role responsible"
    }
  ],
  "post_golive_support": [
    {
      "activity": "string — e.g. Hypercare support, Issue triage, Lessons learned",
      "duration": "string — e.g. 2 weeks, 30 days",
      "owner": "string"
    }
  ]
}

Rules:
- Communications plan must address all distinct stakeholder groups
- Training plan must address each group that will use the new solution
- Go-live checklist should have 8–15 items covering technical, business, and people readiness
- Rollback plan must have clear, specific triggers — not generic statements
- All status fields in go_live_checklist must be "Not Started"
- Return only valid JSON — no markdown fences, no explanation`

const HUMAN_TEMPLATE = `Client: {client_name}
Organisation: {organisation}
Date: {date}

Chosen Solution:
{chosen_solution}

Executive Summary:
{executive_summary}

Stakeholder Analysis:
{stakeholders}

Success Criteria:
{success_criteria}

Compliance and Regulatory Requirements:
{compliance}`

const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  ['human', HUMAN_TEMPLATE],
])

const formatStep = RunnableLambda.from(formatInput)
const outputParser = RunnableLambda.from(parseJsonWithFallback)

export async function changeManagementChain(input) {
  const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 8192 })
  const chain = RunnableSequence.from([formatStep, prompt, claudeModel, outputParser])
  return chain.invoke(input)
}
