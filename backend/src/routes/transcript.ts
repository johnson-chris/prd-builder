import { Router, Request, Response, NextFunction } from 'express';
import { analyzeTranscriptSchema, preprocessTranscriptSchema } from '../lib/validation.js';
import { streamTranscriptAnalysis } from '../services/transcript.service.js';
import { cleanTranscript, detectFileType } from '../services/transcript-cleaner.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { planningRateLimiter } from '../middleware/rateLimiter.js';
import type { TranscriptPreprocessResponse } from '../types/index.js';

export const transcriptRouter = Router();

transcriptRouter.use(authMiddleware);

/**
 * POST /api/transcript/preprocess
 * Preprocess a transcript to reduce its size by removing timestamps, filler words,
 * backchannels, and merging consecutive speaker utterances.
 */
transcriptRouter.post(
  '/preprocess',
  async (req: Request, res: Response, next: NextFunction) => {
    console.log('Transcript preprocess endpoint hit');
    try {
      const input = preprocessTranscriptSchema.parse(req.body);

      const fileType = input.fileType || detectFileType(input.content);

      const result = cleanTranscript(input.content, fileType, {
        targetChars: input.targetChars,
        preserveTimestamps: input.preserveTimestamps,
        aggressive: input.aggressive,
      });

      const response: TranscriptPreprocessResponse = {
        originalChars: result.originalChars,
        cleanedChars: result.finalChars,
        reductionPercent: result.reductionPercent,
        content: result.content,
        speakerMap: result.speakerMap,
        wasProcessed: result.wasProcessed,
        minUtteranceLength: result.minUtteranceLength,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/transcript/analyze
 * Analyze a transcript and extract PRD content using Claude.
 * Automatically preprocesses transcripts over 50,000 characters.
 */
transcriptRouter.post(
  '/analyze',
  planningRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    console.log('Transcript analyze endpoint hit');
    try {
      // Parse with relaxed validation for preprocessing
      const rawInput = req.body;
      const transcript = rawInput.transcript || '';
      const context = rawInput.context || '';
      const fileType = rawInput.fileType || detectFileType(transcript);

      // Validate minimum length
      if (transcript.length < 100) {
        res.status(400).json({ error: 'Transcript must be at least 100 characters' });
        return;
      }

      let processedTranscript = transcript;
      let preprocessInfo: TranscriptPreprocessResponse | null = null;

      // Automatically preprocess if over the limit
      if (transcript.length > 50000) {
        console.log(`Transcript exceeds 50k chars (${transcript.length}), preprocessing...`);

        // First try standard cleaning
        let result = cleanTranscript(transcript, fileType, {
          targetChars: 50000,
          preserveTimestamps: false,
          aggressive: false,
        });

        // If still over limit, try aggressive mode
        if (result.finalChars > 50000) {
          console.log(`Standard cleaning insufficient (${result.finalChars} chars), trying aggressive mode...`);
          result = cleanTranscript(transcript, fileType, {
            targetChars: 50000,
            preserveTimestamps: false,
            aggressive: true,
          });
        }

        // If still over limit after aggressive cleaning, return error
        if (result.finalChars > 50000) {
          console.log(`Aggressive cleaning still insufficient (${result.finalChars} chars)`);
          res.status(400).json({
            error: 'Transcript too large',
            code: 'TRANSCRIPT_TOO_LARGE',
            details: {
              originalChars: result.originalChars,
              cleanedChars: result.finalChars,
              reductionPercent: result.reductionPercent,
              message: `Could not reduce transcript below 50,000 characters. Original: ${result.originalChars.toLocaleString()}, After cleaning: ${result.finalChars.toLocaleString()}. Please manually trim the transcript or split into multiple parts.`,
            },
          });
          return;
        }

        processedTranscript = result.content;
        preprocessInfo = {
          originalChars: result.originalChars,
          cleanedChars: result.finalChars,
          reductionPercent: result.reductionPercent,
          content: result.content,
          speakerMap: result.speakerMap,
          wasProcessed: result.wasProcessed,
          minUtteranceLength: result.minUtteranceLength,
        };

        console.log(`Preprocessed: ${result.originalChars} -> ${result.finalChars} chars (${result.reductionPercent}% reduction)`);
      }

      // Validate the processed transcript
      const validatedInput = analyzeTranscriptSchema.parse({
        transcript: processedTranscript,
        context: context || undefined,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Send preprocessing info if applicable
      if (preprocessInfo) {
        res.write(`data: ${JSON.stringify({
          type: 'preprocessed',
          originalChars: preprocessInfo.originalChars,
          cleanedChars: preprocessInfo.cleanedChars,
          reductionPercent: preprocessInfo.reductionPercent,
          speakerMap: preprocessInfo.speakerMap,
        })}\n\n`);
      }

      await streamTranscriptAnalysis(
        validatedInput.transcript,
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
                confidenceReason: section.confidenceReason,
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
        validatedInput.context
      );
    } catch (error) {
      next(error);
    }
  }
);
