import postgres from "postgres";
import { requireEnv } from "./config.js";

let sql;

const transactionMode = ({ isolationLevel, readOnly } = {}) => {
  const clauses = [];
  if (isolationLevel === "RepeatableRead") clauses.push("isolation level repeatable read");
  if (readOnly) clauses.push("read only");
  return clauses.join(" ");
};

const connect = () => {
  const client = postgres(requireEnv("POSTGRES_URL"), {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
  });
  const database = (strings, ...values) => client(strings, ...values);
  database.transaction = (factory, options) => client.begin(async (transaction) => {
    const mode = transactionMode(options);
    if (mode) await transaction.unsafe(`set transaction ${mode}`);
    return Promise.all(factory(transaction));
  });
  return database;
};

export const getSql = () => {
  if (!sql) sql = connect();
  return sql;
};

export const setSqlForTests = (database) => {
  sql = database;
};
