// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const dbFile = envUrl.replace(/^file:/, '');

const adapter = new PrismaBetterSqlite3({
    url: `file:${path.resolve(__dirname, '../../prisma', dbFile)}`,
});

export const prisma = new PrismaClient({ adapter });