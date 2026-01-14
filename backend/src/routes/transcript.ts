import { Router, Request, Response, NextFunction } from 'express';
import { analyzeTranscriptSchema } from '../lib/validation.js';
import { streamTranscriptAnalysis } from '../services/transcript.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { planningRateLimiter } from '../middleware/rateLimiter.js';

export const transcriptRouter = Router();

transcriptRouter.use(authMiddleware);

transcriptRouter.post(
  '/analyze',
  planningRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    console.log('Transcript analyze endpoint hit');
    try {
      const input = analyzeTranscriptSchema.parse(req.body);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      await streamTranscriptAnalysis(
        input.transcript,
        {
          onProgress: (stage, progress) => {
            res.write(`data: ${JSON.stringify({ type: 'progress', stage, progress })}\n\n`);
          },
          onSection: (section) => {
            res.write(
              `data: ${JSON.stringify({
                type: 'section',
                sectionId: section.sectionId,
                sectionTitle: section.sectionTitle,
                content: section.content,
                confidence: section.confidence,
                sourceQuotes: section.sourceQuotes,
              })}\n\n`
            );
          },
          onComplete: (suggestedTitle, analysisNotes) => {
            res.write(
              `data: ${JSON.stringify({ type: 'complete', suggestedTitle, analysisNotes })}\n\n`
            );
            res.write('data: [DONE]\n\n');
            res.end();
          },
          onError: (error) => {
            console.error('Transcript analysis error:', error);
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
            res.end();
          },
        },
        input.context
      );
    } catch (error) {
      next(error);
    }
  }
);
