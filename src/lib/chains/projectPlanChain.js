import { ChatAnthropic } from '@langchain/anthropic'
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages'

const PLANNING_DIMENSIONS = [
  'timeline and budget constraints',
  'team size and available skills',
  'integration dependencies',
  'regulatory and compliance requirements',
  'phased vs big-bang delivery preference',
  'MVP scope vs full scope',
  'technical constraints and stack preferences',
  'success metrics per epic',
]

function stripJsonFences(text) {
  return text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()
}

function parseJsonWithFallback(text) {
  try {
    return JSON.parse(text)
  } catch {
    console.log('[BSE DEBUG] projectPlan raw response (first 500 chars):', text.slice(0, 500))
    const stripped = stripJsonFences(text)
    const start = stripped.search(/[{[]/)
    if (start === -1) {
      console.log('[BSE DEBUG] projectPlan fallback: no opening bracket found')
      throw new Error('projectPlanChain: failed to parse Claude response as JSON')
    }
    console.log('[BSE DEBUG] projectPlan fallback: bracket extraction triggered, bracket at index', start)
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) {
      console.log('[BSE DEBUG] projectPlan fallback: no closing bracket found — response likely truncated (length', text.length, ')')
      throw new Error('projectPlanChain: failed to parse Claude response as JSON')
    }
    const slice = stripped.slice(start, end + 1)
    console.log('[BSE DEBUG] projectPlan slice end:', slice.slice(-200))
    try {
      return JSON.parse(slice)
    } catch {
      console.log('[BSE DEBUG] projectPlan fallback: JSON.parse failed on extracted slice (length', end - start + 1, ')')
      throw new Error('projectPlanChain: failed to parse Claude response as JSON')
    }
  }
}

function buildEngagementContext(engagement) {
  return [
    `Client: ${engagement.client_name ?? 'Unknown'}`,
    `Organisation: ${engagement.organisation ?? 'Unknown'}`,
    `Industry: ${engagement.industry ?? 'Unknown'}`,
    `Chosen solution: ${JSON.stringify(engagement.chosen_solution ?? {})}`,
    `Structured brief: ${JSON.stringify(engagement.structured_brief ?? {})}`,
  ].join('\n')
}

function discoverySystemPrompt(engagementContext) {
  const dimensionList = PLANNING_DIMENSIONS.map((d, i) => `${i + 1}. ${d}`).join('\n')
  return `YOU MUST RESPOND WITH VALID JSON ONLY. THIS IS MANDATORY. NO EXCEPTIONS.

Your response must be exactly one of these two formats and nothing else:
{"type": "question", "content": "your single question here"}
{"type": "plan", "content": {"markdown": "...", "openspec": "...", "structured": {...}}}

ANY response that is not valid JSON starting with { will be treated as a system failure.
DO NOT write questions as plain text. DO NOT include any text before or after the JSON.
DO NOT use markdown. DO NOT use code fences.

You are a senior business analyst planning the delivery of an AI solution engagement.

Engagement context:
${engagementContext}

Your goal: gather all information needed to produce a detailed project plan by asking targeted discovery questions.

You MUST address all of these dimensions before generating a plan. Ask follow-up questions on any dimension that needs more detail:
${dimensionList}

If more information is needed, respond with:
{ "type": "question", "content": "<your question text>" }

If all dimensions are covered with sufficient detail, respond with:
{
  "type": "plan",
  "content": {
    "markdown": "<full plan in markdown — headers for each epic, bullet stories and tasks>",
    "openspec": "<plan in OpenSpec WHEN/THEN/AND format — one scenario per epic>",
    "structured": {
      "epics": [
        {
          "name": "<epic name>",
          "description": "<epic description>",
          "stories": [
            {
              "name": "<story name>",
              "description": "<story description>",
              "tasks": ["<task 1>", "<task 2>"]
            }
          ]
        }
      ]
    }
  }
}`
}

const JSON_REMINDER = '\n\nREMINDER: Respond only with valid JSON: {"type": "question", "content": "..."} or {"type": "plan", "content": {...}}. No other text.'

function conversationToMessages(conversation) {
  return conversation.map(msg => {
    if (msg.role === 'user') return new HumanMessage(msg.content)
    const text = typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content
    return new AIMessage(text)
  })
}

function extractContent(response) {
  return typeof response.content === 'string' ? response.content : String(response.content)
}

export async function processMessage(conversation, engagement, message) {
  const claude = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 16000 })
  const engagementContext = buildEngagementContext(engagement)
  const systemMsg = new SystemMessage(discoverySystemPrompt(engagementContext))
  const history = conversationToMessages(conversation)
  const seedText = (message ?? 'Please start with your first planning question.') + JSON_REMINDER
  const seed = new HumanMessage(seedText)
  const response = await claude.invoke([systemMsg, ...history, seed])
  return parseJsonWithFallback(extractContent(response))
}

function updateSystemPrompt(engagementContext, currentPlan) {
  return `YOU MUST RESPOND WITH VALID JSON ONLY. THIS IS MANDATORY. NO EXCEPTIONS.

Your response must be exactly one of these two formats and nothing else:
{"type": "question", "content": "your single question here"}
{"type": "plan", "content": {"markdown": "...", "openspec": "...", "structured": {...}}}

ANY response that is not valid JSON starting with { will be treated as a system failure.
DO NOT write questions as plain text. DO NOT include any text before or after the JSON.
DO NOT use markdown. DO NOT use code fences.

You are a senior business analyst updating a project plan based on a change request.

Engagement context:
${engagementContext}

Current plan:
${currentPlan}

Apply the BA's change instruction to the plan. Only modify sections referenced in the instruction.

Respond with:
{
  "type": "plan",
  "content": {
    "markdown": "<updated markdown plan>",
    "openspec": "<updated OpenSpec WHEN/THEN/AND format>",
    "structured": { "epics": [...] }
  }
}`
}

export async function processPlanUpdate(conversation, engagement, instruction) {
  const claude = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 16000 })
  const engagementContext = buildEngagementContext(engagement)
  const planEntry = [...conversation].reverse().find(m => m.role === 'assistant' && m.type === 'plan')
  const currentPlan = planEntry ? JSON.stringify(planEntry.content) : 'No existing plan'
  const systemMsg = new SystemMessage(updateSystemPrompt(engagementContext, currentPlan))
  const response = await claude.invoke([systemMsg, new HumanMessage(instruction + JSON_REMINDER)])
  return parseJsonWithFallback(extractContent(response))
}
