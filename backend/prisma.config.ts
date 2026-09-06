import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

const configDir = path.dirname(fileURLToPath(import.meta.url));

// The shared .env lives at the workspace root, one level above backend/
dotenv.config({ path: path.resolve(configDir, '../.env') });

// DATABASE_URL can be:
// - A relative SQLite path like "file:./dev.db" (resolved against prisma/)
// - An absolute path like "file:/data/dev.db" (used as-is, for production volumes)
const envUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const sqlitePath = envUrl.replace(/^file:/, '');
const datasourceUrl = path.isAbsolute(sqlitePath)
  ? `file:${sqlitePath}`
  : `file:${path.resolve(configDir, 'prisma', sqlitePath)}`;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: datasourceUrl,
  },
});
