import fs from "fs";
import path from "path";
import { pool } from "./index";

let migrationDone = false;

export async function ensureDatabaseSchema(): Promise<void> {
  if (migrationDone) return;

  try {
    const res = await pool.query(
      "SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments';"
    );
    const count = parseInt(res.rows[0]?.count || "0", 10);

    if (count === 0) {
      console.log("[AutoMigrate] Fresh database detected. Applying Drizzle migrations...");
      const drizzleDir = path.join(process.cwd(), "drizzle");
      if (fs.existsSync(drizzleDir)) {
        const sqlFiles = fs.readdirSync(drizzleDir).filter((f) => f.endsWith(".sql")).sort();
        for (const file of sqlFiles) {
          const content = fs.readFileSync(path.join(drizzleDir, file), "utf8");
          const stmts = content.split("--> statement-breakpoint");
          for (const stmt of stmts) {
            const trimmed = stmt.trim();
            if (trimmed) {
              try {
                await pool.query(trimmed);
              } catch (e: unknown) {
                const msg = (e as Error).message || "";
                if (!msg.includes("already exists") && !msg.includes("duplicate")) {
                  console.warn(`[AutoMigrate] Notice in ${file}:`, msg);
                }
              }
            }
          }
        }
        console.log("[AutoMigrate] Database schema applied successfully.");
      }
    }
    migrationDone = true;
  } catch (err) {
    console.warn("[AutoMigrate] Notice checking schema:", (err as Error).message);
  }
}
