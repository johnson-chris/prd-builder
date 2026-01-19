import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILLS_DIR = path.join(__dirname, '../data/skills');

export function getSkillContext(skillName: string): string | null {
  const skillPath = path.join(SKILLS_DIR, `${skillName}.md`);
  if (fs.existsSync(skillPath)) {
    return fs.readFileSync(skillPath, 'utf-8');
  }
  return null;
}

export function getTeamContext(): string | null {
  return getSkillContext('fullsail-dev-team');
}
