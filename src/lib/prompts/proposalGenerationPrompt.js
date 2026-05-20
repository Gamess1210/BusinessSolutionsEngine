import { ChatPromptTemplate } from '@langchain/core/prompts'

const SYSTEM = `You are an expert Business Analyst at Comotion, a business solutions consultancy.
Given the chosen solution, any additional context from the BA, and the original structured brief below,
produce content for a Comotion-branded A4 business proposal document.
This document will be sent to the client.
This proposal is for ONE chosen solution — not multiple options.
Return valid JSON only. No explanation. No markdown fences.`

export const DOCUMENT_B_SCHEMA = `Return JSON matching this exact schema:
{
  "document_title": "string",
  "client_name": "string",
  "date": "YYYY-MM-DD",
  "executive_summary": "string (3-4 substantial paragraphs — clear, non-technical, client-appropriate; cover the engagement context, the problem, the proposed solution, and the expected outcome)",
  "problem_statement": "string (2-3 paragraphs describing the problem in client language — include current-state description, where it breaks down, and business impact)",
  "stakeholder_impact": [{ "role": "string", "impact": "string (2-3 sentences — describe specifically how this role is affected, what changes for them, and what benefit they will experience)" }],
  "solution": {
    "title": "string",
    "description": "string (2-3 paragraphs — non-technical, benefit-focused; cover what the solution does, how it addresses the problem, and what the client can expect to achieve)",
    "effort": "Low | Medium | High",
    "impact": "Low | Medium | High",
    "key_risk": "string",
    "sequencing": "Quick Win | Medium Term | Strategic"
  },
  "recommended_path": "string (2 paragraphs — describe recommended next steps and what the engagement will deliver)",
  "footer_note": "string (brief confidentiality or engagement context note)"
}`

const HUMAN = `Client: {client_name}
Organisation: {organisation}
Date: {date}

{schema}

Rules:
- Write for a business audience, not a technical one
- Use client language from the brief wherever possible
- Do not include internal Comotion pipeline details, scores, or technical spec content
- Do not reference AI, LangChain, or any internal tooling
- Tone: professional, clear, collaborative
- Write substantial content — do not use one-liners for any field that specifies paragraphs

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
