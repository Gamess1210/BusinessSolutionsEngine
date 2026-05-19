import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables'
import { ChatAnthropic } from '@langchain/anthropic'
import { proposalEditPrompt } from '../prompts/proposalEditPrompt.js'

function stripJsonFences(text) {
  return text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()
}

async function parseJson(message) {
  const text = typeof message.content === 'string' ? message.content : String(message.content)
  try {
    return JSON.parse(text)
  } catch {
    try {
      return JSON.parse(stripJsonFences(text))
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

const formatStep = RunnableLambda.from(buildPromptInputs)
const claudeModel = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' })
const outputParser = RunnableLambda.from(parseJson)

export const proposalEditChain = RunnableSequence.from([
  formatStep,
  proposalEditPrompt,
  claudeModel,
  outputParser,
])
