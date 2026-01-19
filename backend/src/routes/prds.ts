import { Router, Request, Response, NextFunction } from 'express';
import { createPrdSchema, updatePrdSchema, planningMessageSchema } from '../lib/validation.js';
import {
  listPrds,
  getPrd,
  createPrd,
  updatePrd,
  deletePrd,
  updatePlanningConversation,
} from '../services/prd.service.js';
import { generateMarkdown } from '../services/markdown.service.js';
import { streamPlanningResponse } from '../services/claude.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { planningRateLimiter } from '../middleware/rateLimiter.js';
import { getUserById } from '../services/auth.service.js';
import type { Section } from '../types/index.js';

export const prdsRouter = Router();

prdsRouter.use(authMiddleware);

prdsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await listPrds(req.user!.userId, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

prdsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createPrdSchema.parse(req.body);
    const prd = await createPrd(input, req.user!.userId);
    res.status(201).json(prd);
  } catch (error) {
    next(error);
  }
});

prdsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prd = await getPrd(req.params.id, req.user!.userId);
    res.json(prd);
  } catch (error) {
    next(error);
  }
});

prdsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updatePrdSchema.parse(req.body);
    const prd = await updatePrd(req.params.id, input, req.user!.userId);
    res.json(prd);
  } catch (error) {
    next(error);
  }
});

prdsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deletePrd(req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

prdsRouter.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prd = await getPrd(req.params.id, req.user!.userId);
    const user = await getUserById(req.user!.userId);

    const markdown = generateMarkdown({
      title: prd.title,
      status: prd.status,
      version: prd.version,
      sections: prd.sections,
      createdAt: prd.createdAt,
      updatedAt: prd.updatedAt,
      authorName: user?.name || 'Unknown',
    });

    const filename = `${prd.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-prd-${
      new Date().toISOString().split('T')[0]
    }.md`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(markdown);
  } catch (error) {
    next(error);
  }
});

prdsRouter.post(
  '/:id/sections/:sectionId/plan/message',
  planningRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    console.log('Planning endpoint hit:', req.params.id, req.params.sectionId);
    console.log('Request body:', req.body);
    try {
      const input = planningMessageSchema.parse(req.body);
      const prd = await getPrd(req.params.id, req.user!.userId);

      const section = prd.sections.find((s: Section) => s.id === req.params.sectionId);
      if (!section) {
        res.status(404).json({ error: 'Section not found', code: 'SECTION_NOT_FOUND' });
        return;
      }

      const conversations = prd.planningConversations || {};
      const existingConversation = (conversations[req.params.sectionId] as {
        messages?: { role: 'user' | 'assistant'; content: string }[];
      }) || { messages: [] };

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      let fullResponse = '';

      await streamPlanningResponse(
        section,
        prd.title,
        input.message,
        existingConversation.messages || [],
        {
          onChunk: (chunk) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onDone: async () => {
            const newMessages = [
              ...(existingConversation.messages || []),
              { role: 'user' as const, content: input.message },
              { role: 'assistant' as const, content: fullResponse },
            ];

            await updatePlanningConversation(
              req.params.id,
              req.params.sectionId,
              { messages: newMessages },
              req.user!.userId
            );

            res.write('data: [DONE]\n\n');
            res.end();
          },
          onError: (error) => {
            console.error('Planning stream error:', error);
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
          },
        },
        { includeTeamContext: input.includeTeamContext }
      );
    } catch (error) {
      next(error);
    }
  }
);
