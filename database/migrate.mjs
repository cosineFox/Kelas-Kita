import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const migrationId = "001_initial";
const source = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
const checksum = createHash("sha256").update(source).digest("hex");
const client = new Client({ connectionString });

await client.connect();
try {
  await client.query(`
    create table if not exists schema_migrations (
      id text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
  const applied = await client.query("select checksum from schema_migrations where id = $1", [migrationId]);
  if (applied.rows[0]?.checksum === checksum) {
    console.log(`${migrationId} is already applied`);
  } else if (applied.rows[0]) {
    throw new Error(`${migrationId} changed after it was applied; create a new migration instead`);
  } else {
    await client.query("begin");
    await client.query(source);
    await client.query("insert into schema_migrations (id, checksum) values ($1, $2)", [migrationId, checksum]);
    await client.query("commit");
    console.log(`applied ${migrationId}`);
  }
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
