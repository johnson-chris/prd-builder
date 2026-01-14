// User types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultTemplate?: string;
  autoSaveInterval: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// PRD types
export type PrdStatus = 'draft' | 'in-review' | 'approved';

export interface Section {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  required: boolean;
  completed: boolean;
  planningEnabled: boolean;
  guidance?: string;
}

// Alias for backwards compatibility
export type PrdSection = Section;

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  sectionId: string;
  messages: Message[];
}

export interface Prd {
  id: string;
  userId: string;
  title: string;
  status: PrdStatus;
  version: string;
  sections: Section[];
  planningConversations: Record<string, Conversation>;
  markdownContent?: string;
  completenessScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrdInput {
  title: string;
}

export interface UpdatePrdInput {
  title?: string;
  status?: PrdStatus;
  sections?: Section[];
  version?: string;
}

export interface PrdListItem {
  id: string;
  title: string;
  status: PrdStatus;
  completenessScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrdListResponse {
  prds: PrdListItem[];
  total: number;
  page: number;
  limit: number;
}

// Section templates
export interface SectionTemplate {
  id: string;
  title: string;
  description: string;
  order: number;
  required: boolean;
  placeholder: string;
}

export const PRD_SECTION_TEMPLATES: SectionTemplate[] = [
  { id: 'executive-summary', title: 'Executive Summary', description: 'High-level overview of the product, problem, and solution.', order: 1, required: true, placeholder: 'Provide a brief overview...' },
  { id: 'problem-statement', title: 'Problem Statement', description: 'Detailed description of the problem being solved.', order: 2, required: true, placeholder: 'Describe the specific pain points...' },
  { id: 'goals-metrics', title: 'Goals and Success Metrics', description: 'Primary goals and measurable success criteria.', order: 3, required: true, placeholder: 'List your primary goals...' },
  { id: 'target-users', title: 'Target Users/Personas', description: 'Description of user personas and their characteristics.', order: 4, required: true, placeholder: 'Describe your target user personas...' },
  { id: 'user-stories', title: 'User Stories and Use Cases', description: 'User stories with acceptance criteria and detailed use cases.', order: 5, required: true, placeholder: 'Write user stories...' },
  { id: 'functional-requirements', title: 'Functional Requirements', description: 'Detailed functional requirements with priorities.', order: 6, required: true, placeholder: 'List functional requirements...' },
  { id: 'non-functional-requirements', title: 'Non-Functional Requirements', description: 'Performance, reliability, scalability, and other NFRs.', order: 7, required: true, placeholder: 'Define non-functional requirements...' },
  { id: 'technical-architecture', title: 'Technical Architecture/Constraints', description: 'Architecture overview, technology choices, and constraints.', order: 8, required: true, placeholder: 'Describe the technical architecture...' },
  { id: 'security-compliance', title: 'Security and Compliance', description: 'Security considerations and compliance requirements.', order: 9, required: true, placeholder: 'Outline security requirements...' },
  { id: 'timeline-milestones', title: 'Timeline and Milestones', description: 'Project phases, key dates, and deliverables.', order: 10, required: true, placeholder: 'Define project phases...' },
  { id: 'dependencies-risks', title: 'Dependencies and Risks', description: 'External dependencies, risks, and mitigation strategies.', order: 11, required: true, placeholder: 'Identify dependencies...' },
  { id: 'success-criteria', title: 'Success Criteria', description: 'Launch criteria and post-launch success indicators.', order: 12, required: true, placeholder: 'Define success criteria...' },
  { id: 'appendices', title: 'Appendices', description: 'Additional supporting materials and references.', order: 13, required: false, placeholder: 'Add supporting materials...' },
];

export function createDefaultSections(): Section[] {
  return PRD_SECTION_TEMPLATES.map((template) => ({
    id: template.id,
    title: template.title,
    description: template.description,
    content: '',
    order: template.order,
    required: template.required,
    completed: false,
    planningEnabled: true,
    guidance: template.description,
  }));
}

export const PRD_STATUS_OPTIONS = [
  { value: 'draft' as PrdStatus, label: 'Draft' },
  { value: 'in-review' as PrdStatus, label: 'In Review' },
  { value: 'approved' as PrdStatus, label: 'Approved' },
];

export const REQUIRED_SECTION_COUNT = PRD_SECTION_TEMPLATES.filter((s) => s.required).length;

// Re-export transcript types
export * from './transcript';
