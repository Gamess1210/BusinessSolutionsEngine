import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { ChatAnthropic } from '@langchain/anthropic'
import { quickIdeasPrompt } from '../prompts/quickIdeasPrompt.js'

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
    try {
      return JSON.parse(stripped)
    } catch {
      throw new Error('quickIdeasChain: failed to parse Claude response as JSON')
    }
  }
}

const promptStep = RunnableLambda.from(({ structured_brief, industry }) => ({
  brief: JSON.stringify(structured_brief),
  industry,
}))

const claudeStep = RunnableLambda.from(async (input) => {
  const model = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })
  return model.invoke(input)
})

const outputParser = RunnableLambda.from(parseJsonWithFallback)

export const quickIdeasChain = RunnableSequence.from([
  promptStep,
  quickIdeasPrompt,
  claudeStep,
  outputParser,
])
