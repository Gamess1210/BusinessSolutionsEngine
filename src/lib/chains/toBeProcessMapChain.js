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
    if (start === -1) throw new Error('toBeProcessMapChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('toBeProcessMapChain: failed to parse Claude response as JSON')
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      throw new Error('toBeProcessMapChain: failed to parse Claude response as JSON')
    }
  }
}

function formatInput({ engagement, openspecContent }) {
  const b = engagement.structured_brief ?? {}
  return {
    client_name: engagement.client_name ?? '',
    date: new Date().toISOString().slice(0, 10),
    chosen_solution: JSON.stringify(engagement.chosen_solution ?? {}, null, 2),
    current_process: b.current_process_detail ?? 'Not provided',
    success_criteria: JSON.stringify(b.success_criteria ?? [], null, 2),
    openspec_content: openspecContent ?? 'Not available — derive future state from solution description',
  }
}

const SYSTEM_PROMPT = `You are a senior business analyst producing a To-Be Process Map for a financial services change programme. Using the approved solution and OpenSpec specification files, design the future-state process and produce it in the following JSON format:

{
  "client_name": "string",
  "date": "string",
  "process_name": "string — name of the future-state process",
  "process_overview": "string — 2-3 sentence overview of the future state",
  "steps": [
    {
      "step_number": 1,
      "title": "string — short step name",
      "description": "string — what happens in this step in the future state",
      "actor": "string — who performs this step",
      "system": "string — system or tool used",
      "improvements": "string — how this step improves on the as-is (or 'New step' if not present as-is)"
    }
  ],
  "comparison": [
    {
      "process_area": "string — area or step being compared",
      "as_is": "string — how it works today",
      "to_be": "string — how it will work in future",
      "improvement": "string — quantified or qualified benefit"
    }
  ],
  "kpi_improvements": [
    {
      "metric": "string",
      "current_value": "string — baseline (use 'Not measured' if unknown)",
      "target_value": "string",
      "improvement_pct": "string — e.g. '40% reduction' or 'To be measured'"
    }
  ]
}

Rules:
- Future-state steps should directly address the pain points identified in the as-is process
- Comparison table should cover at least 5 meaningful process areas
- KPI improvements must be grounded in the success criteria — do not invent metrics
- If OpenSpec content is not available, derive the future state from the solution description
- Return only valid JSON — no markdown fences, no explanation`

const HUMAN_TEMPLATE = `Client: {client_name}
Date: {date}

Chosen Solution:
{chosen_solution}

Current-State Process (As-Is):
{current_process}

Success Criteria:
{success_criteria}

OpenSpec Content (approved specification):
{openspec_content}`

const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  ['human', HUMAN_TEMPLATE],
])

const formatStep = RunnableLambda.from(formatInput)
const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })
const outputParser = RunnableLambda.from(parseJsonWithFallback)

export const toBeProcessMapChain = RunnableSequence.from([
  formatStep,
  prompt,
  claudeModel,
  outputParser,
])
