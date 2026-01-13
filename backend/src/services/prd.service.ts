import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreatePrdInput, UpdatePrdInput } from '../lib/validation.js';
import { createDefaultSections, Section } from '../types/index.js';

export interface PrdResult {
  id: string;
  userId: string;
  title: string;
  status: string;
  version: string;
  sections: Section[];
  planningConversations: Record<string, unknown>;
  markdownContent: string | null;
  completenessScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrdListResult {
  prds: {
    id: string;
    title: string;
    status: string;
    completenessScore: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
  total: number;
  page: number;
  limit: number;
}

function calculateCompleteness(sections: Section[]): number {
  const requiredSections = sections.filter((s) => s.required);
  if (requiredSections.length === 0) return 100;

  const completedCount = requiredSections.filter(
    (s) => s.content && s.content.trim().length > 0
  ).length;

  return Math.round((completedCount / requiredSections.length) * 100);
}

export async function listPrds(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<PrdListResult> {
  const skip = (page - 1) * limit;

  const [prds, total] = await Promise.all([
    prisma.prd.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        status: true,
        completenessScore: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.prd.count({ where: { userId } }),
  ]);

  return { prds, total, page, limit };
}

export async function getPrd(id: string, userId: string): Promise<PrdResult> {
  const prd = await prisma.prd.findUnique({ where: { id } });

  if (!prd) {
    throw new AppError(404, 'PRD not found', 'NOT_FOUND');
  }

  if (prd.userId !== userId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }

  return {
    id: prd.id,
    userId: prd.userId,
    title: prd.title,
    status: prd.status,
    version: prd.version,
    sections: prd.sections as Section[],
    planningConversations: prd.planningConversations as Record<string, unknown>,
    markdownContent: prd.markdownContent,
    completenessScore: prd.completenessScore,
    createdAt: prd.createdAt,
    updatedAt: prd.updatedAt,
  };
}

export async function createPrd(input: CreatePrdInput, userId: string): Promise<PrdResult> {
  const defaultSections = createDefaultSections();

  const prd = await prisma.prd.create({
    data: {
      userId,
      title: input.title,
      sections: defaultSections as unknown as Record<string, unknown>[],
      completenessScore: 0,
    },
  });

  return {
    id: prd.id,
    userId: prd.userId,
    title: prd.title,
    status: prd.status,
    version: prd.version,
    sections: prd.sections as Section[],
    planningConversations: prd.planningConversations as Record<string, unknown>,
    markdownContent: prd.markdownContent,
    completenessScore: prd.completenessScore,
    createdAt: prd.createdAt,
    updatedAt: prd.updatedAt,
  };
}

export async function updatePrd(id: string, input: UpdatePrdInput, userId: string): Promise<PrdResult> {
  const existing = await prisma.prd.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, 'PRD not found', 'NOT_FOUND');
  }

  if (existing.userId !== userId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }

  let completenessScore = existing.completenessScore;
  if (input.sections) {
    completenessScore = calculateCompleteness(input.sections);
  }

  const prd = await prisma.prd.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.version !== undefined && { version: input.version }),
      ...(input.sections !== undefined && {
        sections: input.sections as unknown as Record<string, unknown>[],
      }),
      completenessScore,
    },
  });

  return {
    id: prd.id,
    userId: prd.userId,
    title: prd.title,
    status: prd.status,
    version: prd.version,
    sections: prd.sections as Section[],
    planningConversations: prd.planningConversations as Record<string, unknown>,
    markdownContent: prd.markdownContent,
    completenessScore: prd.completenessScore,
    createdAt: prd.createdAt,
    updatedAt: prd.updatedAt,
  };
}

export async function deletePrd(id: string, userId: string): Promise<void> {
  const existing = await prisma.prd.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, 'PRD not found', 'NOT_FOUND');
  }

  if (existing.userId !== userId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }

  await prisma.prd.delete({ where: { id } });
}

export async function updatePlanningConversation(
  prdId: string,
  sectionId: string,
  conversation: unknown,
  userId: string
): Promise<void> {
  const existing = await prisma.prd.findUnique({ where: { id: prdId } });

  if (!existing) {
    throw new AppError(404, 'PRD not found', 'NOT_FOUND');
  }

  if (existing.userId !== userId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }

  const conversations = (existing.planningConversations as Record<string, unknown>) || {};
  conversations[sectionId] = conversation;

  await prisma.prd.update({
    where: { id: prdId },
    data: { planningConversations: conversations },
  });
}
