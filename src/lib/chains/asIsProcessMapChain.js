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
    if (start === -1) throw new Error('asIsProcessMapChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('asIsProcessMapChain: failed to parse Claude response as JSON')
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      throw new Error('asIsProcessMapChain: failed to parse Claude response as JSON')
    }
  }
}

function formatInput({ engagement }) {
  const b = engagement.structured_brief ?? {}
  return {
    client_name: engagement.client_name ?? '',
    date: new Date().toISOString().slice(0, 10),
    current_process: b.current_process_detail ?? 'Not provided',
    pain_points: JSON.stringify(b.pain_points ?? [], null, 2),
    stakeholders: JSON.stringify(b.stakeholder_analysis ?? [], null, 2),
    constraints: b.constraints_and_dependencies ?? 'None',
  }
}

const SYSTEM_PROMPT = `You are a senior business analyst producing an As-Is Process Map for a financial services client engagement. Analyse the provided current-state information and produce a detailed process map in the following JSON format:

{
  "client_name": "string",
  "date": "string",
  "process_name": "string — name of the primary business process being mapped",
  "process_overview": "string — 2-3 sentence overview of the current-state process",
  "steps": [
    {
      "step_number": 1,
      "title": "string — short step name",
      "description": "string — what happens in this step",
      "actor": "string — who performs this step (role, not person)",
      "system": "string — system or tool used (or 'Manual' if none)",
      "pain_points": ["string — specific pain points that occur at this step"]
    }
  ],
  "kpis": [
    {
      "metric": "string — KPI name",
      "current_value": "string — current baseline if known, otherwise 'Not measured'",
      "measurement_method": "string — how this is measured"
    }
  ]
}

Rules:
- Produce 4–10 process steps in logical sequence
- Map each pain point to the step where it occurs — do not list pain points that have no clear step association
- Include 3–6 KPIs relevant to the process
- If a field is unknown, use a reasonable placeholder rather than null
- Return only valid JSON — no markdown fences, no explanation`

const HUMAN_TEMPLATE = `Client: {client_name}
Date: {date}

Current Process Description:
{current_process}

Pain Points:
{pain_points}

Stakeholders:
{stakeholders}

Constraints and Dependencies:
{constraints}

Return only the JSON object. No markdown fences, no explanation.`

const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  ['human', HUMAN_TEMPLATE],
])

const formatStep = RunnableLambda.from(formatInput)
const outputParser = RunnableLambda.from(parseJsonWithFallback)

export async function asIsProcessMapChain(input) {
  const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 16000 })
  const chain = RunnableSequence.from([formatStep, prompt, claudeModel, outputParser])
  return chain.invoke(input)
}
