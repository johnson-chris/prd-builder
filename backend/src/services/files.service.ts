import Anthropic from '@anthropic-ai/sdk';
import { PRD_SECTION_TEMPLATES } from '../types/index.js';
import { parseExcelFile } from './parsers/excel.parser.js';
import { parseWordFile } from './parsers/word.parser.js';
import { parseCodeFile } from './parsers/code.parser.js';
import { parseGitRepo } from './parsers/git.parser.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '8192');

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface FileSource {
  filename: string;
  excerpt?: string;
}

export interface ExtractedSection {
  sectionId: string;
  sectionTitle: string;
  content: string;
  confidence: ConfidenceLevel;
  sourceFiles: FileSource[];
}

export interface FileStreamCallbacks {
  onProgress: (stage: string, progress: number) => void;
  onSection: (section: ExtractedSection) => void;
  onComplete: (suggestedTitle: string, analysisNotes: string) => void;
  onError: (error: Error) => void;
}

interface ParsedFile {
  filename: string;
  type: 'excel' | 'word' | 'code' | 'git';
  summary: string;
}

const CODE_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx', '.py', '.vbs', '.java', '.cs', '.go', '.rb', '.php', '.sql', '.sh', '.md', '.txt'];
const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
const WORD_EXTENSIONS = ['.docx', '.doc'];

export async function parseUploadedFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedFile> {
  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));

  if (EXCEL_EXTENSIONS.includes(extension)) {
    const result = parseExcelFile(buffer, filename);
    return { filename, type: 'excel', summary: result.summary };
  }

  if (WORD_EXTENSIONS.includes(extension)) {
    const result = await parseWordFile(buffer, filename);
    return { filename, type: 'word', summary: result.summary };
  }

  if (CODE_EXTENSIONS.includes(extension)) {
    const content = buffer.toString('utf-8');
    const result = parseCodeFile(content, filename);
    return { filename, type: 'code', summary: result.summary };
  }

  throw new Error(`Unsupported file type: ${extension}`);
}

export async function parseGitUrl(gitUrl: string): Promise<ParsedFile> {
  const result = await parseGitRepo(gitUrl);
  return {
    filename: result.repoName,
    type: 'git',
    summary: result.summary,
  };
}

function getFilesSystemPrompt(): string {
  const sectionDescriptions = PRD_SECTION_TEMPLATES.map(
    (t) => `${t.order}. **${t.title}** (ID: "${t.id}", ${t.required ? 'Required' : 'Optional'}): ${t.description}`
  ).join('\n');

  return `You are an expert product manager and software architect extracting PRD (Product Requirements Document) content from source files, documentation, spreadsheets, and code.

Your task is to analyze the provided files and extract relevant information for each PRD section. You must be thorough, accurate, and honest about your confidence levels.

## PRD Sections to Extract

${sectionDescriptions}

## Output Format

You MUST output valid JSON objects, one per line, for each section you process. Do not include any other text, markdown formatting, or code blocks around the JSON.

For each section, output a JSON object on its own line:

{"type":"section","sectionId":"executive-summary","content":"Extracted content in markdown format","confidence":"high","sourceFiles":[{"filename":"app.js","excerpt":"relevant code snippet"}]}

## Confidence Levels

- **high**: Explicit documentation, clear code comments, or formal requirements found. The information is unambiguous.
- **medium**: Inferred from code logic, structure, or naming conventions. May need user refinement.
- **low**: Limited information; content is largely inferred or templated based on common patterns.

## What to Extract from Each File Type

### Code Files
- Business logic and validation rules from function implementations
- Data structures from type definitions and interfaces
- API endpoints and their purposes
- Comments and docstrings describing requirements
- TODO/FIXME comments indicating planned features
- Error handling patterns (edge cases and constraints)

### Excel Files
- Business rules from formulas
- Data validation rules (constraints)
- Column headers (data model)
- Calculated fields (derived requirements)

### Word Documents
- Explicit requirements and specifications
- Process descriptions
- Feature lists
- Acceptance criteria

### Git Repositories
- Project overview from README
- Architecture from directory structure
- Features from commit messages
- Dependencies and integrations

## Guidelines

1. **Extract, don't invent**: Only include information explicitly stated or strongly implied in the files
2. **Cite sources**: Include the filename and relevant excerpt for each piece of extracted content
3. **Mark gaps**: If a section has no relevant content, set confidence to "low" and note what's missing
4. **Use markdown**: Format content with headers, bullets, and emphasis for readability
5. **Be specific**: Convert code patterns into concrete requirements
6. **Process in order**: Output sections in order from 1 to 13

After processing all 13 sections, output a final summary line:

{"type":"complete","suggestedTitle":"Suggested PRD Title Based on Project","analysisNotes":"Brief notes about file quality and any major gaps"}

Begin analyzing now. Output only JSON lines, no other text.`;
}

export async function streamFileAnalysis(
  parsedFiles: ParsedFile[],
  callbacks: FileStreamCallbacks,
  context?: string
): Promise<void> {
  console.log('streamFileAnalysis called, files:', parsedFiles.map((f) => f.filename));

  const systemPrompt = getFilesSystemPrompt();

  let userMessage = '';

  // Add context if provided
  if (context && context.trim()) {
    userMessage += `## Project Context

The following context was provided to help you better understand the project:

${context.trim()}

---

`;
  }

  // Add all parsed file summaries
  userMessage += `## Files to Analyze

`;

  for (const file of parsedFiles) {
    userMessage += file.summary + '\n\n---\n\n';
  }

  userMessage += `Analyze these files and extract content for each of the 13 PRD sections. Output one JSON object per line for each section, then a final completion JSON.`;

  callbacks.onProgress('parsing', 5);

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

    callbacks.onProgress('analyzing', 10);

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
                  sourceFiles: parsed.sourceFiles || [],
                });
              } else if (parsed.type === 'complete') {
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

    console.log('File analysis completed, sections processed:', sectionsProcessed);
  } catch (error) {
    console.error('File analysis error:', error);
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}
