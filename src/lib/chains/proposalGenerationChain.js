import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { ChatAnthropic } from '@langchain/anthropic'
import { proposalGenerationPrompt, DOCUMENT_B_SCHEMA } from '../prompts/proposalGenerationPrompt.js'

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
    if (start === -1) throw new Error('proposalGenerationChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('proposalGenerationChain: failed to parse Claude response as JSON')
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      throw new Error('proposalGenerationChain: failed to parse Claude response as JSON')
    }
  }
}

function buildPromptInputs({ engagement, chosenSolution, context }) {
  return {
    client_name: engagement.client_name ?? '',
    organisation: engagement.organisation ?? '',
    date: new Date().toISOString().slice(0, 10),
    schema: DOCUMENT_B_SCHEMA,
    brief_json: JSON.stringify(engagement.structured_brief ?? {}, null, 2),
    chosen_solution_json: JSON.stringify(chosenSolution ?? {}, null, 2),
    context_text: context ? JSON.stringify(context) : 'None',
  }
}

const formatStep = RunnableLambda.from(buildPromptInputs)
const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })
const outputParser = RunnableLambda.from(parseJsonWithFallback)

export const proposalGenerationChain = RunnableSequence.from([
  formatStep,
  proposalGenerationPrompt,
  claudeModel,
  outputParser,
])
