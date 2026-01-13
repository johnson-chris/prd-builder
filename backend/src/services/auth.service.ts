import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../lib/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import type { RegisterInput, LoginInput } from '../lib/validation.js';

const SALT_ROUNDS = 12;

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    preferences: unknown;
  };
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(input: RegisterInput): Promise<void> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
    },
  });
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const tokenPayload = { userId: user.id, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      preferences: user.preferences,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshTokens(token: string): Promise<AuthResult> {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!storedToken) {
    throw new AppError(401, 'Refresh token not found', 'TOKEN_NOT_FOUND');
  }

  if (storedToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    throw new AppError(401, 'Refresh token expired', 'TOKEN_EXPIRED');
  }

  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  const tokenPayload = { userId: payload.userId, email: payload.email };
  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      token: newRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  const user = storedToken.user;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      preferences: user.preferences,
    },
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logoutUser(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token },
  });
}

export async function getUserById(userId: string): Promise<AuthResult['user'] | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    preferences: user.preferences,
  };
}
