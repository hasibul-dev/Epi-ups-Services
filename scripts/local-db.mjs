import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, '.pgdata');

async function start() {
  console.log('[EPI Local DB] Initializing persistent PostgreSQL database in', dataDir);
  const db = new PGlite(dataDir);
  await db.waitReady;

  const res = await db.query("SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public';");
  const count = parseInt(res.rows[0]?.count || '0', 10);
  
  if (count < 30) {
    console.log('[EPI Local DB] Applying schema migrations from drizzle/*.sql...');
    const drizzleDir = path.join(rootDir, 'drizzle');
    const sqlFiles = fs.readdirSync(drizzleDir).filter(f => f.endsWith('.sql')).sort();
    for (const sqlFile of sqlFiles) {
      console.log(`[EPI Local DB] Executing ${sqlFile}...`);
      const initSql = fs.readFileSync(path.join(drizzleDir, sqlFile), 'utf8');
      const stmts = initSql.split('--> statement-breakpoint');
      for (const s of stmts) {
        const trimmed = s.trim();
        if (trimmed) {
          try {
            await db.exec(trimmed);
          } catch (e) {
            // Ignore if table/column already exists
          }
        }
      }
    }
    console.log('[EPI Local DB] Schema migrations completed.');
  } else {
    console.log(`[EPI Local DB] Existing database detected (${count} tables).`);
  }

  const server = new PGLiteSocketServer({
    db,
    port: 5432,
    host: '127.0.0.1',
    maxConnections: 50,
  });

  await server.start();
  console.log('\n============================================================');
  console.log('  EPI ENTERPRISE SYSTEM — LOCAL POSTGRESQL SERVER ONLINE   ');
  console.log('============================================================');
  console.log('  Connection: postgresql://postgres:postgres@127.0.0.1:5432/app_db');
  console.log('  Port: 5432');
  console.log('  Status: Ready for Next.js & Drizzle ORM');
  console.log('============================================================\n');

  const cleanup = async () => {
    console.log('[EPI Local DB] Stopping database server...');
    try { await server.stop(); } catch {}
    try { await db.close(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start().catch((err) => {
  console.error('[EPI Local DB Error]', err);
  process.exit(1);
});
