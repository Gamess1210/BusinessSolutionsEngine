import { ChatPromptTemplate } from '@langchain/core/prompts'

const SYSTEM = `You are a senior Business Analyst at Comotion.
Apply targeted edits to an existing business proposal JSON based on the BA's instruction.
Modify only the sections that are relevant to the instruction.
Preserve all unchanged sections exactly as they are.
Return the complete updated JSON. No explanation. No markdown fences.`

const HUMAN = `Existing proposal JSON:
{proposal_json}

Edit instruction from BA:
{instruction}

Apply the instruction to the relevant sections only. Return the complete updated proposal JSON.`

export const proposalEditPrompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM],
  ['human', HUMAN],
])
