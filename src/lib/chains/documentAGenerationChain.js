import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { ChatAnthropic } from '@langchain/anthropic'
import { documentAPrompt, getDocumentASchema } from '../prompts/documentAPrompt.js'

function getSolutionsArray(engagement) {
  return engagement.solutions?.solutions ?? []
}

function buildPromptInputs(engagement) {
  return {
    client_name: engagement.client_name ?? '',
    organisation: engagement.organisation ?? '',
    analysis_mode: engagement.analysis_mode ?? 'quick',
    generated_date: new Date().toISOString().slice(0, 10),
    schema: getDocumentASchema(engagement.analysis_mode),
    solutions_json: JSON.stringify(getSolutionsArray(engagement), null, 2),
  }
}

const _jsonParser = new JsonOutputParser()

function stripJsonFences(text) {
  return text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()
}

async function parseJsonWithFallback(message) {
  try {
    return await _jsonParser.invoke(message)
  } catch {
    const text = typeof message.content === 'string' ? message.content : String(message)
    try {
      return JSON.parse(stripJsonFences(text))
    } catch {
      throw new Error('documentAGenerationChain: failed to parse Claude response as JSON')
    }
  }
}

const formatStep = RunnableLambda.from(({ engagement }) => buildPromptInputs(engagement))

const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })

const outputParser = RunnableLambda.from(parseJsonWithFallback)

export const documentAGenerationChain = RunnableSequence.from([
  formatStep,
  documentAPrompt,
  claudeModel,
  outputParser,
])
