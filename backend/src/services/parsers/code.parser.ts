export interface CodeParseResult {
  filename: string;
  language: string;
  content: string;
  comments: string[];
  functions: string[];
  classes: string[];
  imports: string[];
  summary: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  '.js': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript React',
  '.jsx': 'JavaScript React',
  '.py': 'Python',
  '.vbs': 'VBScript',
  '.java': 'Java',
  '.cs': 'C#',
  '.go': 'Go',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.md': 'Markdown',
  '.txt': 'Text',
};

export function parseCodeFile(content: string, filename: string): CodeParseResult {
  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  const language = LANGUAGE_MAP[extension] || 'Unknown';

  const comments = extractComments(content, extension);
  const functions = extractFunctions(content, extension);
  const classes = extractClasses(content, extension);
  const imports = extractImports(content, extension);

  const summary = generateCodeSummary(filename, language, content, comments, functions, classes, imports);

  return {
    filename,
    language,
    content,
    comments,
    functions,
    classes,
    imports,
    summary,
  };
}

function extractComments(content: string, extension: string): string[] {
  const comments: string[] = [];

  // Single-line comments (// or #)
  const singleLineRegex = /(?:\/\/|#)\s*(.+)$/gm;
  let match;
  while ((match = singleLineRegex.exec(content)) !== null) {
    const comment = match[1].trim();
    if (comment.length > 5 && !comment.startsWith('eslint') && !comment.startsWith('prettier')) {
      comments.push(comment);
    }
  }

  // Multi-line comments (/* */ or """ """)
  const multiLineRegex = /\/\*\*?([\s\S]*?)\*\/|"""([\s\S]*?)"""|'''([\s\S]*?)'''/g;
  while ((match = multiLineRegex.exec(content)) !== null) {
    const comment = (match[1] || match[2] || match[3] || '').trim();
    if (comment.length > 10) {
      comments.push(comment.replace(/^\s*\*\s?/gm, '').trim());
    }
  }

  // JSDoc/docstring comments
  const jsdocRegex = /@(?:param|returns?|description|example|throws)\s+(.+)/g;
  while ((match = jsdocRegex.exec(content)) !== null) {
    comments.push(match[1].trim());
  }

  return comments.slice(0, 50); // Limit to 50 comments
}

function extractFunctions(content: string, extension: string): string[] {
  const functions: string[] = [];

  // JavaScript/TypeScript functions
  const jsRegex = /(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:async\s*)?\([^)]*\)\s*=>|\([^)]*\))/g;
  let match;
  while ((match = jsRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }

  // Python functions
  const pyRegex = /def\s+(\w+)\s*\(/g;
  while ((match = pyRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }

  // Java/C# methods
  const javaRegex = /(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+\s*)?{/g;
  while ((match = javaRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }

  // VBScript functions/subs
  const vbsRegex = /(?:Function|Sub)\s+(\w+)\s*\(/gi;
  while ((match = vbsRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }

  return [...new Set(functions)].slice(0, 30); // Unique, limit to 30
}

function extractClasses(content: string, extension: string): string[] {
  const classes: string[] = [];

  // JavaScript/TypeScript classes
  const jsRegex = /class\s+(\w+)/g;
  let match;
  while ((match = jsRegex.exec(content)) !== null) {
    classes.push(match[1]);
  }

  // Python classes
  const pyRegex = /class\s+(\w+)\s*(?:\([^)]*\))?:/g;
  while ((match = pyRegex.exec(content)) !== null) {
    classes.push(match[1]);
  }

  // TypeScript interfaces
  const tsInterfaceRegex = /interface\s+(\w+)/g;
  while ((match = tsInterfaceRegex.exec(content)) !== null) {
    classes.push(`interface ${match[1]}`);
  }

  // TypeScript types
  const tsTypeRegex = /type\s+(\w+)\s*=/g;
  while ((match = tsTypeRegex.exec(content)) !== null) {
    classes.push(`type ${match[1]}`);
  }

  return [...new Set(classes)].slice(0, 20);
}

function extractImports(content: string, extension: string): string[] {
  const imports: string[] = [];

  // JavaScript/TypeScript imports
  const jsRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = jsRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Python imports
  const pyRegex = /(?:from\s+(\S+)\s+)?import\s+(\S+)/g;
  while ((match = pyRegex.exec(content)) !== null) {
    imports.push(match[1] || match[2]);
  }

  // Java/C# imports
  const javaRegex = /(?:import|using)\s+([\w.]+);/g;
  while ((match = javaRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return [...new Set(imports)].slice(0, 20);
}

function generateCodeSummary(
  filename: string,
  language: string,
  content: string,
  comments: string[],
  functions: string[],
  classes: string[],
  imports: string[]
): string {
  let summary = `## Code File: ${filename} (${language})\n\n`;

  // Line count
  const lineCount = content.split('\n').length;
  summary += `**Lines:** ${lineCount}\n\n`;

  // Imports/dependencies
  if (imports.length > 0) {
    summary += `**Dependencies:**\n`;
    for (const imp of imports) {
      summary += `- ${imp}\n`;
    }
    summary += '\n';
  }

  // Classes and types
  if (classes.length > 0) {
    summary += `**Classes/Types:**\n`;
    for (const cls of classes) {
      summary += `- ${cls}\n`;
    }
    summary += '\n';
  }

  // Functions
  if (functions.length > 0) {
    summary += `**Functions:**\n`;
    for (const fn of functions) {
      summary += `- ${fn}()\n`;
    }
    summary += '\n';
  }

  // Key comments (business logic hints)
  if (comments.length > 0) {
    summary += `**Comments (potential requirements):**\n`;
    for (const comment of comments.slice(0, 15)) {
      summary += `- ${comment.substring(0, 200)}${comment.length > 200 ? '...' : ''}\n`;
    }
    summary += '\n';
  }

  // Truncated source code
  const maxCodeLength = 10000;
  let codeSnippet = content;
  if (content.length > maxCodeLength) {
    codeSnippet = content.substring(0, maxCodeLength) + '\n... [truncated]';
  }

  summary += `**Source Code:**\n\`\`\`${language.toLowerCase()}\n${codeSnippet}\n\`\`\`\n`;

  return summary;
}
