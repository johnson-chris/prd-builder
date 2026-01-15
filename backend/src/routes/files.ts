import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { analyzeFilesSchema } from '../lib/validation.js';
import { parseUploadedFile, parseGitUrl, streamFileAnalysis } from '../services/files.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { planningRateLimiter } from '../middleware/rateLimiter.js';

export const filesRouter = Router();

// Multer configuration for file uploads
const ALLOWED_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx', '.py', '.vbs', '.java', '.cs', '.go', '.rb', '.php', '.sql', '.sh', '.md', '.txt', '.xlsx', '.xls', '.docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 20;

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not supported`));
    }
  },
});

filesRouter.use(authMiddleware);

filesRouter.post(
  '/analyze',
  planningRateLimiter,
  upload.array('files', MAX_FILES),
  async (req: Request, res: Response, next: NextFunction) => {
    console.log('Files analyze endpoint hit');

    try {
      // Parse and validate form fields
      const input = analyzeFilesSchema.parse({
        context: req.body.context,
        gitUrl: req.body.gitUrl,
      });

      const files = req.files as Express.Multer.File[] | undefined;

      // Must have either files or gitUrl
      if ((!files || files.length === 0) && !input.gitUrl) {
        res.status(400).json({ error: 'No files or Git URL provided', code: 'NO_INPUT' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Parse all uploaded files
      const parsedFiles: { filename: string; type: string; summary: string }[] = [];

      if (files && files.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'parsing', progress: 2 })}\n\n`);

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const parsed = await parseUploadedFile(file.buffer, file.originalname);
            parsedFiles.push(parsed);

            const parseProgress = 2 + Math.round(((i + 1) / files.length) * 5);
            res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'parsing', progress: parseProgress })}\n\n`);
          } catch (parseError) {
            console.error(`Error parsing file ${file.originalname}:`, parseError);
            // Continue with other files
          }
        }
      }

      // Parse Git repository if URL provided
      if (input.gitUrl) {
        res.write(`data: ${JSON.stringify({ type: 'progress', stage: 'cloning', progress: 5 })}\n\n`);

        try {
          const parsed = await parseGitUrl(input.gitUrl);
          parsedFiles.push(parsed);
        } catch (gitError) {
          console.error('Error parsing Git repo:', gitError);
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to clone Git repository' })}\n\n`);
          res.end();
          return;
        }
      }

      if (parsedFiles.length === 0) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'No files could be parsed' })}\n\n`);
        res.end();
        return;
      }

      // Stream the analysis
      await streamFileAnalysis(
        parsedFiles,
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
                sourceFiles: section.sourceFiles,
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
            console.error('File analysis error:', error);
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
            res.end();
          },
        },
        input.context
      );
    } catch (error) {
      console.error('Files endpoint error:', error);

      // Handle multer errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File too large. Maximum size is 10MB.', code: 'FILE_TOO_LARGE' });
          return;
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          res.status(400).json({ error: `Too many files. Maximum is ${MAX_FILES}.`, code: 'TOO_MANY_FILES' });
          return;
        }
      }

      next(error);
    }
  }
);
