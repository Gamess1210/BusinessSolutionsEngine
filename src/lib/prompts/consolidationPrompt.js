import { ChatPromptTemplate } from '@langchain/core/prompts'

const FINANCIAL_SERVICES_FRAMING = `This is a financial services engagement. You must pay particular attention to:
- Regulatory and compliance constraints (e.g. FSCA, FICA, GDPR, POPIA, Basel III)
- Risk management and audit trail requirements
- Data sovereignty and privacy obligations
- Any licensing or regulatory approval dependencies`

const GENERAL_FRAMING = `This is a general business engagement. Focus on operational efficiency, commercial impact, and feasibility constraints.`

function getIndustryFraming(industry) {
  return industry === 'financial_services' ? FINANCIAL_SERVICES_FRAMING : GENERAL_FRAMING
}

const systemTemplate = `You are an expert business analyst at Comotion, a technology consulting firm. Your role is to synthesise raw client engagement inputs into a structured, executive-ready brief.

Industry context:
{industryFraming}

You MUST return ONLY a valid JSON object — no markdown, no preamble, no code fences. The JSON must have exactly these fields:
- executive_summary: string (2–3 sentences capturing the core problem and desired outcome)
- stakeholders: array of objects, each with {{ name: string, role: string, concern: string }}
- current_process: string (how the client currently handles this area)
- pain_points: array of strings (specific friction points and failure modes)
- root_cause: string (underlying cause of the pain points)
- business_impact: string (quantified where possible — time, cost, risk)
- constraints: array of strings (budget, time, technical, regulatory, or resource limits)
- compliance_considerations: string (regulatory or compliance requirements; use "None identified" if not applicable)
- success_criteria: array of strings (measurable outcomes that would indicate success)`

const userTemplate = `Below are all the engagement inputs collected from the client and the consulting session. Synthesise these into the structured JSON brief.

Industry: {industry}

---

{formattedInputs}

---

Return only the JSON object.`

export const consolidationPrompt = ChatPromptTemplate.fromMessages([
  ['system', systemTemplate],
  ['human', userTemplate],
])

export { getIndustryFraming }
