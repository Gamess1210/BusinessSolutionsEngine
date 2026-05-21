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
    if (start === -1) throw new Error('stakeholderImpactChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('stakeholderImpactChain: failed to parse Claude response as JSON')
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      throw new Error('stakeholderImpactChain: failed to parse Claude response as JSON')
    }
  }
}

function formatInput({ engagement }) {
  const b = engagement.structured_brief ?? {}
  return {
    client_name: engagement.client_name ?? '',
    date: new Date().toISOString().slice(0, 10),
    structured_brief: JSON.stringify(b, null, 2),
    chosen_solution: JSON.stringify(engagement.chosen_solution ?? {}, null, 2),
    solutions: JSON.stringify(engagement.solutions ?? [], null, 2),
  }
}

const SYSTEM_PROMPT = `You are a senior business analyst producing a Stakeholder Impact Assessment (SIA) for a financial services change programme. Analyse the chosen solution against the current-state brief and produce an SIA in the following JSON format:

{
  "client_name": "string",
  "date": "string",
  "impact_summary": [
    {
      "stakeholder_group": "string",
      "count": "string — estimated number affected, e.g. '12 staff' or 'Unknown'",
      "impact_level": "High|Medium|Low",
      "key_changes": "string — 1-2 sentence description of the primary changes for this group"
    }
  ],
  "people_impact": "string — paragraph on how people (roles, skills, headcount) are affected",
  "process_impact": "string — paragraph on how business processes change",
  "technology_impact": "string — paragraph on technology and system changes",
  "regulatory_impact": "string — paragraph on regulatory and compliance implications",
  "risks": [
    {
      "risk": "string — risk description",
      "impact": "High|Medium|Low",
      "mitigation": "string — recommended mitigation action"
    }
  ],
  "readiness": [
    {
      "area": "string — e.g. Leadership, Staff Skills, Technology, Process Documentation",
      "current_state": "string",
      "target_state": "string",
      "gap": "string — what needs to close the gap"
    }
  ]
}

Rules:
- Cover all distinct stakeholder groups mentioned in the brief
- Produce 4–8 risk entries covering people, process, technology, and regulatory dimensions
- Produce a readiness assessment for at least 4 areas
- Be specific — generic statements like "some staff may need training" are not acceptable
- Return only valid JSON — no markdown fences, no explanation`

const HUMAN_TEMPLATE = `Client: {client_name}
Date: {date}

Structured Brief:
{structured_brief}

Chosen Solution:
{chosen_solution}

All Solution Options (for context):
{solutions}`

const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  ['human', HUMAN_TEMPLATE],
])

const formatStep = RunnableLambda.from(formatInput)
const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })
const outputParser = RunnableLambda.from(parseJsonWithFallback)

export const stakeholderImpactChain = RunnableSequence.from([
  formatStep,
  prompt,
  claudeModel,
  outputParser,
])
