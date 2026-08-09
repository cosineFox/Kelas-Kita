import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL_NON_POOLING;
if (!connectionString) throw new Error("POSTGRES_URL_NON_POOLING is required");

const migrationId = "001_initial";
const source = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
const checksum = createHash("sha256").update(source).digest("hex");
const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: "require",
});

try {
  await sql.unsafe(`
    create table if not exists schema_migrations (
      id text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    );
    alter table schema_migrations enable row level security
  `);
  const [applied] = await sql`select checksum from schema_migrations where id = ${migrationId}`;
  if (applied?.checksum === checksum) {
    console.log(`${migrationId} is already applied`);
  } else if (applied) {
    throw new Error(`${migrationId} changed after it was applied; create a new migration instead`);
  } else {
    await sql.begin(async (transaction) => {
      await transaction.unsafe(source);
      await transaction`insert into schema_migrations (id, checksum) values (${migrationId}, ${checksum})`;
    });
    console.log(`applied ${migrationId}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
