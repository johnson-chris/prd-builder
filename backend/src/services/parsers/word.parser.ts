import mammoth from 'mammoth';

export interface WordParseResult {
  filename: string;
  content: string;
  summary: string;
}

export async function parseWordFile(buffer: Buffer, filename: string): Promise<WordParseResult> {
  // Convert .docx to markdown-like text
  const result = await mammoth.extractRawText({ buffer });
  const content = result.value;

  // Generate summary for Claude
  const summary = generateWordSummary(filename, content);

  return { filename, content, summary };
}

function generateWordSummary(filename: string, content: string): string {
  // Truncate very long documents
  const maxLength = 30000;
  let truncatedContent = content;
  let truncationNote = '';

  if (content.length > maxLength) {
    truncatedContent = content.substring(0, maxLength);
    truncationNote = `\n\n*[Document truncated - showing first ${maxLength} characters of ${content.length} total]*`;
  }

  return `## Word Document: ${filename}\n\n${truncatedContent}${truncationNote}`;
}
