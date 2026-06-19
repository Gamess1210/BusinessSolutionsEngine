import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { ChatAnthropic } from '@langchain/anthropic'
import { deepAnalysisPrompt } from '../prompts/deepAnalysisPrompt.js'
import { solutionsPrompt } from '../prompts/solutionsPrompt.js'

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
    if (start === -1) throw new Error('deepAnalysisChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('deepAnalysisChain: failed to parse Claude response as JSON')
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      throw new Error('deepAnalysisChain: failed to parse Claude response as JSON')
    }
  }
}

const prepareCall1 = RunnableLambda.from(({ structured_brief, industry }) => ({
  brief: JSON.stringify(structured_brief),
  industry,
}))

const call1 = RunnableLambda.from(async ({ brief, industry }) => {
  const messages = await deepAnalysisPrompt.invoke({ brief, industry })
  const model = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 16000 })
  const response = await model.invoke(messages)
  const deepBrief = await parseJsonWithFallback(response)
  return { deep_brief: deepBrief, industry }
})

const prepareCall2 = RunnableLambda.from(({ deep_brief, industry }) => ({
  brief: JSON.stringify(deep_brief),
  industry,
}))

const call2 = RunnableLambda.from(async ({ brief, industry }) => {
  const messages = await solutionsPrompt.invoke({ brief, industry })
  const model = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 16000 })
  const response = await model.invoke(messages)
  return parseJsonWithFallback(response)
})

export async function deepAnalysisChain(input) {
  const chain = RunnableSequence.from([prepareCall1, call1, prepareCall2, call2])
  return chain.invoke(input)
}