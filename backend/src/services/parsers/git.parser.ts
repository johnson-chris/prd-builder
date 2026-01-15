import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface GitParseResult {
  repoUrl: string;
  repoName: string;
  readme: string;
  packageInfo: PackageInfo | null;
  structure: string[];
  recentCommits: string[];
  summary: string;
}

interface PackageInfo {
  name: string;
  description: string;
  dependencies: string[];
}

export async function parseGitRepo(gitUrl: string): Promise<GitParseResult> {
  const tempDir = path.join(os.tmpdir(), `prd-git-${Date.now()}`);

  try {
    // Clone the repository (shallow clone for speed)
    const git: SimpleGit = simpleGit();
    await git.clone(gitUrl, tempDir, ['--depth', '1']);

    // Extract repo name from URL
    const repoName = extractRepoName(gitUrl);

    // Read README
    const readme = await readReadme(tempDir);

    // Read package.json if exists
    const packageInfo = await readPackageJson(tempDir);

    // Get directory structure
    const structure = await getDirectoryStructure(tempDir);

    // Get recent commits (from shallow clone)
    const recentCommits = await getRecentCommits(tempDir);

    // Generate summary
    const summary = generateGitSummary(repoName, readme, packageInfo, structure, recentCommits);

    return {
      repoUrl: gitUrl,
      repoName,
      readme,
      packageInfo,
      structure,
      recentCommits,
      summary,
    };
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

function extractRepoName(url: string): string {
  // Handle various git URL formats
  const match = url.match(/\/([^/]+?)(\.git)?$/);
  return match ? match[1] : 'unknown-repo';
}

async function readReadme(dir: string): Promise<string> {
  const readmeNames = ['README.md', 'README.MD', 'readme.md', 'README', 'README.txt'];

  for (const name of readmeNames) {
    const readmePath = path.join(dir, name);
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, 'utf-8');
      // Truncate if too long
      if (content.length > 20000) {
        return content.substring(0, 20000) + '\n\n*[README truncated]*';
      }
      return content;
    }
  }

  return '*No README found*';
}

async function readPackageJson(dir: string): Promise<PackageInfo | null> {
  const packagePath = path.join(dir, 'package.json');

  if (!fs.existsSync(packagePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(content);

    return {
      name: pkg.name || 'unknown',
      description: pkg.description || '',
      dependencies: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}).map((d) => `${d} (dev)`),
      ].slice(0, 30),
    };
  } catch {
    return null;
  }
}

async function getDirectoryStructure(dir: string, maxDepth = 3): Promise<string[]> {
  const structure: string[] = [];

  function walk(currentDir: string, prefix: string, depth: number): void {
    if (depth > maxDepth) return;

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      // Filter out common non-essential directories
      const filtered = entries.filter((e) => {
        const name = e.name;
        return !name.startsWith('.') && !['node_modules', 'dist', 'build', '__pycache__', 'venv', '.git'].includes(name);
      });

      for (const entry of filtered.slice(0, 20)) {
        const relativePath = prefix + entry.name;
        structure.push(relativePath + (entry.isDirectory() ? '/' : ''));

        if (entry.isDirectory()) {
          walk(path.join(currentDir, entry.name), relativePath + '/', depth + 1);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  walk(dir, '', 0);
  return structure.slice(0, 100);
}

async function getRecentCommits(dir: string): Promise<string[]> {
  try {
    const git = simpleGit(dir);
    const log = await git.log({ maxCount: 10 });
    return log.all.map((commit) => `${commit.date.substring(0, 10)}: ${commit.message.substring(0, 100)}`);
  } catch {
    return [];
  }
}

function generateGitSummary(
  repoName: string,
  readme: string,
  packageInfo: PackageInfo | null,
  structure: string[],
  commits: string[]
): string {
  let summary = `## Git Repository: ${repoName}\n\n`;

  // Package info
  if (packageInfo) {
    summary += `### Package Info\n`;
    summary += `- **Name:** ${packageInfo.name}\n`;
    if (packageInfo.description) {
      summary += `- **Description:** ${packageInfo.description}\n`;
    }
    if (packageInfo.dependencies.length > 0) {
      summary += `- **Dependencies:** ${packageInfo.dependencies.slice(0, 15).join(', ')}${packageInfo.dependencies.length > 15 ? '...' : ''}\n`;
    }
    summary += '\n';
  }

  // Directory structure
  if (structure.length > 0) {
    summary += `### Project Structure\n\`\`\`\n`;
    for (const item of structure.slice(0, 30)) {
      summary += `${item}\n`;
    }
    if (structure.length > 30) {
      summary += `... and ${structure.length - 30} more files\n`;
    }
    summary += `\`\`\`\n\n`;
  }

  // Recent commits
  if (commits.length > 0) {
    summary += `### Recent Commits\n`;
    for (const commit of commits.slice(0, 5)) {
      summary += `- ${commit}\n`;
    }
    summary += '\n';
  }

  // README content
  summary += `### README\n\n${readme}\n`;

  return summary;
}
