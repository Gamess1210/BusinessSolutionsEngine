import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { ChatAnthropic } from '@langchain/anthropic'
import { consolidationPrompt, getIndustryFraming } from '../prompts/consolidationPrompt.js'

// --- Input formatters (one per input_type) ---

function formatGuided(input) {
  const answers = input.content?.answers ?? []
  return answers
    .map((a, i) => `${i + 1}. ${a.section} — Q: ${a.question} / A: ${a.answer}`)
    .join('\n')
}

function formatBraindump(input) {
  return `Brain Dump:\n${input.content?.text ?? ''}`
}

function formatTranscript(input) {
  return `Meeting Transcript:\n${input.content?.text ?? ''}`
}

function formatClientIntake(input) {
  const c = input.content ?? {}
  return [
    `Contact: ${c.contact_name ?? ''} <${c.contact_email ?? ''}>`,
    `Organisation: ${c.organisation ?? ''}`,
    `Department: ${c.department ?? ''}`,
    `Problem: ${c.problem_description ?? ''}`,
    `Impact: ${c.impact_description ?? ''}`,
    `Constraints: ${c.constraints ?? ''}`,
  ].join('\n')
}

// --- Public formatter ---

export function formatEngagementInputs(inputs) {
  const sections = []
  for (const input of inputs) {
    switch (input.input_type) {
      case 'guided':
        sections.push(formatGuided(input))
        break
      case 'braindump':
        sections.push(formatBraindump(input))
        break
      case 'transcript':
        sections.push(formatTranscript(input))
        break
      case 'client_intake':
        sections.push(formatClientIntake(input))
        break
      default:
        console.warn(`formatEngagementInputs: unknown input_type "${input.input_type}", skipping`)
    }
  }
  return sections.join('\n\n---\n\n')
}

// --- JSON output parser with code-fence fallback ---

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
    if (start === -1) throw new Error('consolidationChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('consolidationChain: failed to parse Claude response as JSON')
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      throw new Error('consolidationChain: failed to parse Claude response as JSON')
    }
  }
}

export async function consolidationChain(input) {
  const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 8192 })
  const chain = RunnableSequence.from([
    RunnableLambda.from(({ inputs, industry }) => ({
      formattedInputs: formatEngagementInputs(inputs),
      industry,
      industryFraming: getIndustryFraming(industry),
    })),
    consolidationPrompt,
    claudeModel,
    RunnableLambda.from(parseJsonWithFallback),
  ])
  return chain.invoke(input)
}
