import { ChatPromptTemplate } from '@langchain/core/prompts'

const systemTemplate = `You are an expert Business Analyst at Comotion, a business solutions consultancy.
Your primary focus is financial services clients, but you work across industries.
You will be given a structured problem brief. Generate exactly 3 solution options.
For each option provide a title, one-paragraph description, effort rating, impact rating, and key risk.
Return as valid JSON:
{{
  "problem_brief": "string (2-3 paragraph summary)",
  "solutions": [
    {{
      "title": "string",
      "description": "string",
      "effort": "Low | Medium | High",
      "impact": "Low | Medium | High",
      "key_risk": "string"
    }}
  ]
}}
Industry context: {industry}`

const userTemplate = `Here is the structured problem brief:

{brief}

Return only the JSON object.`

export const quickIdeasPrompt = ChatPromptTemplate.fromMessages([
  ['system', systemTemplate],
  ['human', userTemplate],
])
