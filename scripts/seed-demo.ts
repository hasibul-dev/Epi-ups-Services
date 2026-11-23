import "dotenv/config";
import { seedDemo } from "../src/server/demo-seed";
import { pool } from "../src/db";

seedDemo()
  .then((r) => console.log(r.message))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
