import { neon } from "@neondatabase/serverless";
import { requireEnv } from "./config.js";

let client;

export const getSql = () => {
  if (!client) client = neon(requireEnv("DATABASE_URL"));
  return client;
};

export const setSqlForTests = (sql) => {
  client = sql;
};
