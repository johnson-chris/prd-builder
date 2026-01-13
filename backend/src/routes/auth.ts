import { Router, Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '../lib/validation.js';
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  getUserById,
} from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.js';

export const authRouter = Router();

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req.body);
    await registerUser(input);
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];

    if (!token) {
      res.status(401).json({ error: 'No refresh token', code: 'NO_REFRESH_TOKEN' });
      return;
    }

    const result = await refreshTokens(token);

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];

    if (token) {
      await logoutUser(token);
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserById(req.user!.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});
