import { ChatPromptTemplate } from '@langchain/core/prompts'

const SYSTEM = `You are a senior Business Analyst at Comotion, a business solutions consultancy.
Generate a formal Comotion-branded business proposal (Document B) in JSON format.
This is a client-facing document — use a professional, polished tone.
Return valid JSON only. No explanation. No markdown fences.`

export const DOCUMENT_B_SCHEMA = `Return JSON matching this exact schema:
{
  "document_title": "string",
  "client_name": "string",
  "date": "YYYY-MM-DD",
  "executive_summary": "string (2-3 paragraphs)",
  "problem_statement": "string (1-2 paragraphs)",
  "stakeholder_impact": [{ "role": "string", "impact": "string" }],
  "solution": {
    "title": "string",
    "description": "string",
    "effort": "Low | Medium | High",
    "impact": "Low | Medium | High",
    "key_risk": "string",
    "sequencing": "Quick Win | Medium Term | Strategic"
  },
  "recommended_path": "string (1 paragraph)",
  "footer_note": "string"
}`

const HUMAN = `Client: {client_name}
Organisation: {organisation}
Date: {date}

{schema}

Consolidated Brief (internal reference):
{brief_json}

Chosen Solution:
{chosen_solution_json}

Supplementary Context from BA:
{context_text}

Generate a professional Comotion business proposal for Document B. Focus on the chosen solution only. Use client-facing language.`

export const proposalGenerationPrompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM],
  ['human', HUMAN],
])
