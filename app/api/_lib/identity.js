import { createHmac } from "node:crypto";
import { isProduction, requireEnv } from "./config.js";

const firstHeader = (value = "") => value.split(",")[0].trim();

export const requestIp = (request) => {
  if (isProduction()) return firstHeader(request.headers["cf-connecting-ip"]) || "unknown";
  return firstHeader(request.headers["x-vercel-forwarded-for"])
    || firstHeader(request.headers["x-forwarded-for"])
    || request.socket?.remoteAddress
    || "unknown";
};

export const requestHash = (request, purpose, now = new Date()) => {
  const period = now.toISOString().slice(0, 7);
  const material = [period, purpose, requestIp(request), request.headers["user-agent"] ?? "unknown"].join("\n");
  return createHmac("sha256", requireEnv("ABUSE_HASH_SECRET")).update(material).digest("hex");
};

export const receiptHash = (receipt) =>
  createHmac("sha256", requireEnv("ABUSE_HASH_SECRET")).update(`receipt\n${receipt}`).digest("hex");
