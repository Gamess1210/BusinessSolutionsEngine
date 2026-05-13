import { ChatPromptTemplate } from '@langchain/core/prompts'

const systemTemplate = `You are an expert Business Analyst at Comotion.
Given the problem brief below, generate exactly 5 solution options.
For each option provide: title, detailed description (3-4 paragraphs), feasibility assessment,
estimated complexity, ROI framing, up to 3 key risks, recommended sequencing position,
and whether AI/automation is central to this solution.
Return as valid JSON:
{{
  "solutions": [
    {{
      "title": "string",
      "description": "string",
      "feasibility": "string",
      "complexity": "Low | Medium | High | Very High",
      "roi_framing": "string",
      "risks": ["string"],
      "sequencing": "Quick Win | Medium Term | Strategic",
      "ai_central": true | false
    }}
  ]
}}
Industry context: {industry}`

const userTemplate = `Problem brief:

{brief}

Return only the JSON object.`

export const solutionsPrompt = ChatPromptTemplate.fromMessages([
  ['system', systemTemplate],
  ['human', userTemplate],
])
