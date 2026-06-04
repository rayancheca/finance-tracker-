import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Add it to .env.local — see .env.example for the format.',
  );
}

// LOCAL_DEV runs against a plain local Postgres via node-postgres. Production
// uses Neon's HTTP driver. The query-builder surface this app uses (select /
// insert / update / delete) is identical across both adapters, so the local
// client is cast to the Neon type to keep every caller's types unchanged.
const isLocalDev = process.env.NEXT_PUBLIC_LOCAL_DEV === '1';

export const db: NeonHttpDatabase<typeof schema> = isLocalDev
  ? (drizzlePg(new Pool({ connectionString }), { schema }) as unknown as NeonHttpDatabase<
      typeof schema
    >)
  : drizzle(neon(connectionString), { schema });

export { schema };
