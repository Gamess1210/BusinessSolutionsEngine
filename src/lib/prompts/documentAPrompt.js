import { ChatPromptTemplate } from '@langchain/core/prompts'

const SYSTEM = `You are an expert Business Analyst at Comotion, a business solutions consultancy.
Given a set of approved solution options, produce a Solution Options Summary JSON document.
This is a clean internal summary — not a formal client proposal.
Return valid JSON only. No explanation. No markdown fences.`

const QUICK_SCHEMA = `Return JSON matching this exact schema:
{
  "engagement_title": "string",
  "client_name": "string",
  "generated_date": "YYYY-MM-DD",
  "options": [
    {
      "title": "string",
      "description": "string",
      "effort": "Low | Medium | High",
      "impact": "Low | Medium | High",
      "key_risk": "string"
    }
  ]
}`

const DEEP_SCHEMA = `Return JSON matching this exact schema:
{
  "engagement_title": "string",
  "client_name": "string",
  "generated_date": "YYYY-MM-DD",
  "options": [
    {
      "title": "string",
      "description": "string",
      "feasibility": "string",
      "complexity": "Low | Medium | High | Very High",
      "roi_framing": "string",
      "risks": ["string"],
      "sequencing": "Quick Win | Medium Term | Strategic",
      "ai_central": true
    }
  ]
}`

const HUMAN = `Client: {client_name}
Organisation: {organisation}
Analysis mode: {analysis_mode}
Generated date: {generated_date}

{schema}

Approved solutions to summarise:
{solutions_json}

Produce a Solution Options Summary JSON. Keep descriptions clear and professional.`

export function getDocumentASchema(analysisMode) {
  return analysisMode === 'deep' ? DEEP_SCHEMA : QUICK_SCHEMA
}

export const documentAPrompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM],
  ['human', HUMAN],
])
