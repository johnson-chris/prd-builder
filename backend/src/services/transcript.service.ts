import Anthropic from '@anthropic-ai/sdk';
import { PRD_SECTION_TEMPLATES } from '../types/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '8192');

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ExtractedSection {
  sectionId: string;
  sectionTitle: string;
  content: string;
  confidence: ConfidenceLevel;
  sourceQuotes: string[];
}

export interface TranscriptStreamCallbacks {
  onProgress: (stage: string, progress: number) => void;
  onSection: (section: ExtractedSection) => void;
  onComplete: (suggestedTitle: string, analysisNotes: string) => void;
  onError: (error: Error) => void;
}

function getTranscriptSystemPrompt(): string {
  const sectionDescriptions = PRD_SECTION_TEMPLATES.map(
    (t) => `${t.order}. **${t.title}** (ID: "${t.id}", ${t.required ? 'Required' : 'Optional'}): ${t.description}`
  ).join('\n');

  return `You are an expert product manager specializing in extracting Product Requirements Document (PRD) content from meeting transcripts, stakeholder interviews, and discovery sessions.

Your task is to analyze the provided transcript and extract relevant information for each PRD section. You must be thorough, accurate, and honest about your confidence levels.

## PRD Sections to Extract

${sectionDescriptions}

## Output Format

You MUST output valid JSON objects, one per line, for each section you process. Do not include any other text, markdown formatting, or code blocks around the JSON.

For each section, output a JSON object on its own line:

{"type":"section","sectionId":"executive-summary","content":"Extracted content in markdown format","confidence":"high","sourceQuotes":["Direct quote from transcript"]}

## Confidence Levels

- **high**: Multiple clear, explicit mentions in transcript that directly address this section. The information is unambiguous.
- **medium**: Some relevant information found, but may need user refinement or interpretation. Partial information available.
- **low**: Limited or indirect information; content is largely inferred from context or templated. User should review and expand.

## Guidelines

1. **Extract, don't invent**: Only include information explicitly stated or strongly implied in the transcript
2. **Preserve context**: Include 1-3 relevant quotes that support the extracted content
3. **Mark gaps**: If a section has no relevant content, set confidence to "low" and provide a placeholder noting what's missing
4. **Use markdown**: Format content with headers, bullets, and emphasis for readability
5. **Be specific**: Convert vague statements into concrete requirements where transcript supports it
6. **Process in order**: Output sections in order from 1 to 13

After processing all 13 sections, output a final summary line:

{"type":"complete","suggestedTitle":"Suggested PRD Title Based on Product","analysisNotes":"Brief notes about transcript quality and any major gaps"}

Begin analyzing now. Output only JSON lines, no other text.`;
}

export async function streamTranscriptAnalysis(
  transcript: string,
  callbacks: TranscriptStreamCallbacks,
  context?: string
): Promise<void> {
  console.log('streamTranscriptAnalysis called, transcript length:', transcript.length, 'context:', context ? 'provided' : 'none');

  const systemPrompt = getTranscriptSystemPrompt();

  let userMessage = '';

  // Add context if provided
  if (context && context.trim()) {
    userMessage += `## Project Context

The following context was provided to help you better understand the meeting and project:

${context.trim()}

---

`;
  }

  userMessage += `## Transcript to Analyze

${transcript}

---

Analyze this transcript and extract content for each of the 13 PRD sections. Output one JSON object per line for each section, then a final completion JSON.`;

  callbacks.onProgress('analyzing', 5);

  try {
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    let buffer = '';
    let sectionsProcessed = 0;
    const totalSections = 13;
    let completionSent = false;

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          buffer += delta.text;

          // Process complete JSON lines from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('{')) continue;

            try {
              const parsed = JSON.parse(trimmedLine);

              if (parsed.type === 'section') {
                sectionsProcessed++;
                const progress = Math.min(10 + Math.round((sectionsProcessed / totalSections) * 80), 90);

                // Determine stage based on progress
                let stage = 'extracting';
                if (sectionsProcessed <= 4) stage = 'analyzing';
                else if (sectionsProcessed <= 9) stage = 'extracting';
                else stage = 'mapping';

                callbacks.onProgress(stage, progress);

                // Find section title from templates
                const template = PRD_SECTION_TEMPLATES.find((t) => t.id === parsed.sectionId);
                const sectionTitle = template?.title || parsed.sectionId;

                callbacks.onSection({
                  sectionId: parsed.sectionId,
                  sectionTitle,
                  content: parsed.content || '',
                  confidence: parsed.confidence || 'low',
                  sourceQuotes: parsed.sourceQuotes || [],
                });
              } else if (parsed.type === 'complete') {
                completionSent = true;
                callbacks.onProgress('complete', 100);
                callbacks.onComplete(
                  parsed.suggestedTitle || 'Untitled PRD',
                  parsed.analysisNotes || ''
                );
              }
            } catch {
              // Skip malformed JSON lines
              console.log('Skipping malformed JSON line:', trimmedLine.substring(0, 100));
            }
          }
        }
      }
    }

    // Process any remaining buffer content
    if (buffer.trim() && buffer.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (parsed.type === 'complete') {
          completionSent = true;
          callbacks.onProgress('complete', 100);
          callbacks.onComplete(
            parsed.suggestedTitle || 'Untitled PRD',
            parsed.analysisNotes || ''
          );
        }
      } catch {
        console.log('Final buffer not valid JSON:', buffer.substring(0, 100));
      }
    }

    // Fallback: if stream ended without completion event, send one anyway
    if (!completionSent) {
      console.log('Stream ended without completion event, sending fallback completion');
      callbacks.onProgress('complete', 100);
      callbacks.onComplete(
        'Untitled PRD',
        `Analysis extracted ${sectionsProcessed} sections. Some content may need manual review.`
      );
    }

    console.log('Transcript analysis completed, sections processed:', sectionsProcessed);
  } catch (error) {
    console.error('Transcript analysis error:', error);
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}
