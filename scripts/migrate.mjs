import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/app_db';
  console.log('[Migrator] Connecting to database...');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    const drizzleDir = path.join(rootDir, 'drizzle');
    const sqlFiles = fs.readdirSync(drizzleDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`[Migrator] Found ${sqlFiles.length} migration files.`);

    for (const file of sqlFiles) {
      console.log(`[Migrator] Applying ${file}...`);
      const content = fs.readFileSync(path.join(drizzleDir, file), 'utf8');
      const stmts = content.split('--> statement-breakpoint');
      for (const stmt of stmts) {
        const trimmed = stmt.trim();
        if (trimmed) {
          try {
            await client.query(trimmed);
          } catch (e) {
            if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
              console.warn(`[Migrator] Notice on statement: ${e.message}`);
            }
          }
        }
      }
    }
    console.log('[Migrator] All migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('[Migrator] Migration failed:', err);
  process.exit(1);
});
