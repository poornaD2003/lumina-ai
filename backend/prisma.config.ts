import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

const configDir = path.dirname(fileURLToPath(import.meta.url));

// The shared .env lives at the workspace root, one level above backend/
dotenv.config({ path: path.resolve(configDir, '../.env') });

// DATABASE_URL is a relative SQLite path ("file:./dev.db"). Resolve it against
// the prisma/ directory (next to schema.prisma) so the database location is
// independent of the current working directory — same semantics as classic
// Prisma, i.e. backend/prisma/dev.db.
const envUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const sqlitePath = envUrl.replace(/^file:/, '');
const datasourceUrl = `file:${path.resolve(configDir, 'prisma', sqlitePath)}`;

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
