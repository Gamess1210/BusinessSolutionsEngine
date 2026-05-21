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
    if (start === -1) throw new Error('rtmChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('rtmChain: failed to parse Claude response as JSON')
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      throw new Error('rtmChain: failed to parse Claude response as JSON')
    }
  }
}

function buildPhaseInstruction(phase) {
  if (phase === 'spec-update') {
    return 'Enrich the existing RTM rows with OpenSpec scenario mappings. For each requirement row, add the matching OpenSpec scenario ID and user story reference. Do not remove or overwrite existing rows — only add to them. Leave test_case and test_status fields as-is.'
  }
  if (phase === 'final') {
    return 'Finalise the RTM using code review data. For each requirement row, update test_case with the relevant test identifier and set test_status to "Pass", "Fail", or "Not Tested" based on the code review outcomes. Do not remove or overwrite requirement, openspec_scenario, or user_story fields.'
  }
  return 'Generate the initial RTM from the BRD requirements. For each business requirement, create a row. Leave openspec_scenario, user_story, test_case blank — these will be populated in later passes. Set test_status to "Not Tested".'
}

function buildVersion(phase) {
  if (phase === 'spec-update') return 'v2'
  if (phase === 'final') return 'final'
  return 'v1'
}

function formatInput({ engagement, priorRtmData, phase }) {
  const resolvedPhase = phase ?? 'initial'
  const b = engagement.structured_brief ?? {}
  return {
    client_name: engagement.client_name ?? '',
    date: new Date().toISOString().slice(0, 10),
    phase: resolvedPhase,
    version: buildVersion(resolvedPhase),
    phase_instruction: buildPhaseInstruction(resolvedPhase),
    requirements_source: JSON.stringify(b, null, 2),
    prior_rtm_data: JSON.stringify(priorRtmData ?? [], null, 2),
    code_reviews: JSON.stringify(engagement.code_reviews ?? [], null, 2),
  }
}

const SYSTEM_PROMPT = `You are a senior business analyst maintaining a Requirements Traceability Matrix (RTM) for a financial services engagement. The RTM traces each business requirement through OpenSpec scenarios, user stories, test cases, and test status. It is generated progressively across three passes.

Produce the RTM in the following JSON format:

{
  "client_name": "string",
  "date": "string",
  "version": "string — v1, v2, or final",
  "phase": "string — initial, spec-update, or final",
  "entries": [
    {
      "requirement_id": "string — e.g. BR-001",
      "requirement": "string — the business requirement statement",
      "category": "string — e.g. Process, Data, Integration, Reporting, Security",
      "openspec_scenario": "string — OpenSpec scenario identifier or blank",
      "user_story": "string — user story reference or blank",
      "test_case": "string — test case identifier or blank",
      "test_status": "Not Tested|Pass|Fail|N/A"
    }
  ]
}

Follow the phase instruction exactly. Do not add or remove columns. Return only valid JSON — no markdown fences, no explanation.`

const HUMAN_TEMPLATE = `Client: {client_name}
Date: {date}
Version: {version}
Phase: {phase}

Phase Instruction:
{phase_instruction}

Source Requirements (structured brief):
{requirements_source}

Prior RTM Data (existing rows to enrich — empty array for initial pass):
{prior_rtm_data}

Code Review Data (for final pass — empty if not yet available):
{code_reviews}`

const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  ['human', HUMAN_TEMPLATE],
])

const formatStep = RunnableLambda.from(formatInput)
const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })
const outputParser = RunnableLambda.from(parseJsonWithFallback)

export const rtmChain = RunnableSequence.from([
  formatStep,
  prompt,
  claudeModel,
  outputParser,
])
