import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { ChatAnthropic } from '@langchain/anthropic'
import { proposalEditPrompt } from '../prompts/proposalEditPrompt.js'

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
    if (start === -1) throw new Error('proposalEditChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('proposalEditChain: failed to parse Claude response as JSON')
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {
      throw new Error('proposalEditChain: failed to parse Claude response as JSON')
    }
  }
}

function buildPromptInputs({ proposalJson, instruction }) {
  return {
    proposal_json: JSON.stringify(proposalJson ?? {}, null, 2),
    instruction: instruction ?? '',
  }
}

export async function proposalEditChain(input) {
  const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 16000 })
  const chain = RunnableSequence.from([
    RunnableLambda.from(buildPromptInputs),
    proposalEditPrompt,
    claudeModel,
    RunnableLambda.from(parseJsonWithFallback),
  ])
  return chain.invoke(input)
}
