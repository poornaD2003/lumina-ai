/**
 * Shared PrismaClient singleton for the backend services.
 *
 * Prisma 7 requires a driver adapter for direct database connections (there is
 * no `url` in schema.prisma anymore). The adapter resolves DATABASE_URL - a
 * relative SQLite path - against backend/prisma/, so the client works no
 * matter which directory the server is started from.
 *
 * Usage:
 *   import { prisma } from './services/prisma';
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the project root (same convention as src/index.ts)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const dbFile = envUrl.replace(/^file:/, '');

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.resolve(__dirname, '../../prisma', dbFile)}`,
});

export const prisma = new PrismaClient({ adapter });
