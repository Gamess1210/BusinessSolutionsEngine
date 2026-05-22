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
    const stripped = stripJsonFences(text)
    const start = stripped.search(/[{[]/)
    if (start === -1) throw new Error('projectPlanChain: failed to parse Claude response as JSON')
    const closeChar = stripped[start] === '{' ? '}' : ']'
    const end = stripped.lastIndexOf(closeChar)
    if (end === -1) throw new Error('projectPlanChain: failed to parse Claude response as JSON')
    return JSON.parse(stripped.slice(start, end + 1))
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
  return `You are a senior business analyst planning the delivery of an AI solution engagement.

Engagement context:
${engagementContext}

Your goal: gather all information needed to produce a detailed project plan by asking targeted discovery questions.

You MUST address all of these dimensions before generating a plan. Ask follow-up questions on any dimension that needs more detail:
${dimensionList}

ALWAYS respond with valid JSON in one of these two formats:

If more information is needed:
{ "type": "question", "content": "<your question text>" }

If all dimensions are covered with sufficient detail:
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
}

Respond ONLY with valid JSON. No preamble, no explanation outside the JSON.`
}

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
  const claude = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 8192 })
  const engagementContext = buildEngagementContext(engagement)
  const systemMsg = new SystemMessage(discoverySystemPrompt(engagementContext))
  const history = conversationToMessages(conversation)
  const seed = message ? new HumanMessage(message) : new HumanMessage('Please start with your first planning question.')
  const response = await claude.invoke([systemMsg, ...history, seed])
  return parseJsonWithFallback(extractContent(response))
}

function updateSystemPrompt(engagementContext, currentPlan) {
  return `You are a senior business analyst updating a project plan based on a change request.

Engagement context:
${engagementContext}

Current plan:
${currentPlan}

Apply the BA's change instruction to the plan. Only modify sections referenced in the instruction.

Return the updated plan as JSON:
{
  "type": "plan",
  "content": {
    "markdown": "<updated markdown plan>",
    "openspec": "<updated OpenSpec WHEN/THEN/AND format>",
    "structured": { "epics": [...] }
  }
}

Respond ONLY with valid JSON. No preamble.`
}

export async function processPlanUpdate(conversation, engagement, instruction) {
  const claude = new ChatAnthropic({ model: 'claude-sonnet-4-20250514', maxTokens: 8192 })
  const engagementContext = buildEngagementContext(engagement)
  const planEntry = [...conversation].reverse().find(m => m.role === 'assistant' && m.type === 'plan')
  const currentPlan = planEntry ? JSON.stringify(planEntry.content) : 'No existing plan'
  const systemMsg = new SystemMessage(updateSystemPrompt(engagementContext, currentPlan))
  const response = await claude.invoke([systemMsg, new HumanMessage(instruction)])
  return parseJsonWithFallback(extractContent(response))
}
