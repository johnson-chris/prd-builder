import type { Section } from '../types/index.js';

interface PrdData {
  title: string;
  status: string;
  version: string;
  sections: Section[];
  createdAt: Date;
  updatedAt: Date;
  authorName: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<h3[^>]*>/gi, '### ')
    .replace(/<h4[^>]*>/gi, '#### ')
    .replace(/<\/h[34]>/gi, '\n\n')
    .replace(/<strong[^>]*>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<em[^>]*>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<code[^>]*>/gi, '`')
    .replace(/<\/code>/gi, '`')
    .replace(/<pre[^>]*><code[^>]*>/gi, '```\n')
    .replace(/<\/code><\/pre>/gi, '\n```')
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<blockquote[^>]*>/gi, '> ')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>/gi, '[')
    .replace(/<\/a>/gi, ']($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function generateMarkdown(prd: PrdData): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push(`title: "${prd.title.replace(/"/g, '\\"')}"`);
  lines.push(`author: "${prd.authorName.replace(/"/g, '\\"')}"`);
  lines.push(`created: ${prd.createdAt.toISOString().split('T')[0]}`);
  lines.push(`updated: ${prd.updatedAt.toISOString().split('T')[0]}`);
  lines.push(`status: ${prd.status}`);
  lines.push(`version: ${prd.version}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${prd.title}`);
  lines.push('');

  for (const section of prd.sections.sort((a, b) => a.order - b.order)) {
    lines.push(`## ${section.title}`);
    lines.push('');

    if (section.content) {
      const content = stripHtml(section.content);
      lines.push(content);
    } else {
      lines.push('*No content provided.*');
    }

    lines.push('');
  }

  return lines.join('\n');
}
