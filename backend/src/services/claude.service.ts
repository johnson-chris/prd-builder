import Anthropic from '@anthropic-ai/sdk';
import type { Section } from '../types/index.js';

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

function getSystemPrompt(section: Section, prdTitle: string): string {
  const currentContent = section.content?.replace(/<[^>]*>/g, '').trim();
  const hasContent = currentContent && currentContent.length > 0;

  return `You are an expert product manager helping a business analyst create a comprehensive Product Requirements Document (PRD). Your role is to ask clarifying questions, suggest content, and help think through requirements systematically.

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
8. Reference and build upon the current content if it exists`;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export async function streamPlanningResponse(
  section: Section,
  prdTitle: string,
  userMessage: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  callbacks: StreamCallbacks
): Promise<void> {
  console.log('streamPlanningResponse called:', { sectionId: section.id, prdTitle, userMessage });
  console.log('Using model:', MODEL, 'API key length:', process.env.ANTHROPIC_API_KEY?.length || 0);

  const systemPrompt = getSystemPrompt(section, prdTitle);

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
