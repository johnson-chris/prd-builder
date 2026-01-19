import Anthropic from '@anthropic-ai/sdk';
import type { Section } from '../types/index.js';
import { getTeamContext } from './skills.service.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096');

const SECTION_PROMPTS: Record<string, string> = {
  'executive-summary':
    "Let's create a compelling executive summary. Can you tell me: (1) What is the core problem your product solves? (2) Who is experiencing this problem? (3) What makes your solution unique?",
  'problem-statement':
    'To write a strong problem statement, I need to understand: (1) What pain points do users currently experience? (2) How are they solving this today? (3) What\'s the business impact?',
  'goals-metrics':
    "Let's define measurable goals. What would success look like 3 months after launch? What specific metrics would prove your product is working?",
  'target-users':
    "I'll help you define your target users. Can you describe who will use this product? What are their roles, backgrounds, and technical proficiency levels?",
  'user-stories':
    "Let's develop user stories. Can you describe the main user workflows and what users need to accomplish?",
  'functional-requirements':
    "Let's break down the features. What are the core capabilities users need? We can prioritize them as must-have (P0), should-have (P1), or nice-to-have (P2).",
  'non-functional-requirements':
    "Let's think through non-functional requirements. What are your expectations for performance, reliability, scalability, and security?",
  'technical-architecture':
    "Let's think through the technical implementation. (1) What technologies are you building on? (2) What are your key constraints? (3) Are there existing systems to integrate with?",
  'security-compliance':
    'What security and compliance requirements does your product need to meet? Consider authentication, data protection, and any industry-specific regulations.',
  'timeline-milestones':
    "Let's plan the project timeline. What are the key phases and milestones? What needs to be delivered at each stage?",
  'dependencies-risks':
    "Let's identify potential risks and dependencies. What external factors could impact the project? What could go wrong and how might we mitigate those risks?",
  'success-criteria':
    "Let's define what success looks like. What must be true before launch? What metrics will indicate the product is successful after launch?",
  appendices:
    'Is there any additional information, references, or supporting materials that should be included in the appendices?',
};

function formatSectionContent(section: Section): string {
  const content = section.content?.replace(/<[^>]*>/g, '').trim();
  if (!content) return '(empty)';
  // Truncate very long content to avoid token limits
  return content.length > 500 ? content.substring(0, 500) + '...' : content;
}

function buildPrdContext(allSections: Section[], currentSectionId: string): string {
  const otherSections = allSections.filter(s => s.id !== currentSectionId && s.content?.replace(/<[^>]*>/g, '').trim());

  if (otherSections.length === 0) return '';

  let context = '\n\n## Other PRD Sections (for reference)\n';
  context += 'Use this context to ensure consistency and avoid redundancy across sections:\n\n';

  for (const s of otherSections) {
    context += `### ${s.title}\n${formatSectionContent(s)}\n\n`;
  }

  return context;
}

function getSystemPrompt(section: Section, prdTitle: string, allSections?: Section[], skillContext?: string): string {
  const currentContent = section.content?.replace(/<[^>]*>/g, '').trim();
  const hasContent = currentContent && currentContent.length > 0;

  let prompt = `You are an expert product manager helping a business analyst create a comprehensive Product Requirements Document (PRD). Your role is to ask clarifying questions, suggest content, and help think through requirements systematically.

Context: The user is working on the "${section.title}" section of their PRD for a project titled "${prdTitle}".

Section description: ${section.description}

${hasContent ? `Current content in this section:
"""
${currentContent}
"""` : 'This section is currently empty.'}

Guidelines:
1. Ask one or two focused questions at a time
2. Build on previous responses in the conversation
3. Suggest concrete, specific content rather than generic advice
4. Think about edge cases and considerations the user might miss
5. Structure your suggestions in markdown format ready to paste
6. If the user seems stuck, offer examples or templates
7. Keep responses concise and actionable
8. Reference and build upon the current content if it exists
9. Consider how this section relates to other sections in the PRD`;

  // Add context from other sections
  if (allSections && allSections.length > 0) {
    prompt += buildPrdContext(allSections, section.id);
  }

  if (skillContext) {
    prompt += `\n\n## Team Reference Information\nThe following is reference information about the development team, technology stack, and project ownership. Use this to provide context-aware suggestions about technologies, team contacts, and existing systems.\n\n${skillContext}`;
  }

  return prompt;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export interface StreamOptions {
  includeTeamContext?: boolean;
  allSections?: Section[];
}

export async function streamPlanningResponse(
  section: Section,
  prdTitle: string,
  userMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  callbacks: StreamCallbacks,
  options?: StreamOptions
): Promise<void> {
  console.log('streamPlanningResponse called:', { sectionId: section.id, prdTitle, userMessage, includeTeamContext: options?.includeTeamContext });
  console.log('Using model:', MODEL, 'API key length:', process.env.ANTHROPIC_API_KEY?.length || 0);

  let skillContext: string | undefined;
  if (options?.includeTeamContext) {
    skillContext = getTeamContext() || undefined;
    console.log('Team context loaded:', skillContext ? 'yes' : 'no');
  }

  const systemPrompt = getSystemPrompt(section, prdTitle, options?.allSections, skillContext);

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];

  if (conversationHistory.length === 0) {
    const sectionPrompt = SECTION_PROMPTS[section.id] || "How can I help you with this section?";
    messages.push({ role: 'assistant', content: sectionPrompt });
  }

  messages.push(...conversationHistory);
  messages.push({ role: 'user', content: userMessage });

  console.log('Sending to Claude with', messages.length, 'messages');

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          callbacks.onChunk(delta.text);
        }
      }
    }

    console.log('Stream completed successfully');
    callbacks.onDone();
  } catch (error) {
    console.error('Claude API error:', error);
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}

export interface FormatOptions {
  mode: 'replace' | 'merge';
  existingContent?: string;
}

export async function formatForSection(
  section: Section,
  conversationMessages: { role: 'user' | 'assistant'; content: string }[],
  callbacks: StreamCallbacks,
  options?: FormatOptions
): Promise<void> {
  console.log('formatForSection called:', { sectionId: section.id, mode: options?.mode });

  const conversationText = conversationMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const mode = options?.mode || 'replace';
  const existingContent = options?.existingContent?.replace(/<[^>]*>/g, '').trim();

  let systemPrompt = `You are an expert technical writer formatting content for a PRD (Product Requirements Document) section.

Your task is to extract and format the valuable information from a planning conversation into clean, professional PRD content.

Section: "${section.title}"
Section description: ${section.description}

${mode === 'merge' && existingContent ? `Existing section content to merge with:
"""
${existingContent}
"""

Merge the new information with the existing content, avoiding duplication and maintaining consistency.` : ''}

IMPORTANT FORMATTING RULES:
1. Remove ALL conversational elements (questions, "I think", "Let me", "Sure", etc.)
2. Remove meta-commentary about the document itself
3. Extract only the substantive content and decisions
4. Format as professional PRD content using markdown:
   - Use headers (##, ###) to organize subsections
   - Use bullet points for lists
   - Use bold for emphasis on key terms
   - Use tables where appropriate for structured data
5. Be concise but comprehensive
6. Use third person, professional tone
7. Include specific details, metrics, and requirements mentioned
8. Structure logically for the "${section.title}" section

Output ONLY the formatted section content, ready to paste into the PRD. Do not include any preamble or explanation.`;

  const userPrompt = `Format the following planning conversation into clean PRD content for the "${section.title}" section:\n\n${conversationText}`;

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          callbacks.onChunk(delta.text);
        }
      }
    }

    console.log('Format stream completed successfully');
    callbacks.onDone();
  } catch (error) {
    console.error('Claude API error in formatForSection:', error);
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}
