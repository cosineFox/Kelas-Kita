import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { isProduction, requireEnv } from "./config.js";
import { HttpError } from "./http.js";

const cookieName = "kk_admin_session";
const sessionSeconds = 8 * 60 * 60;

const digest = (value) => createHash("sha256").update(value).digest();
const sameSecret = (supplied, expected) => timingSafeEqual(digest(supplied), digest(expected));
const sign = (value) => createHmac("sha256", requireEnv("ADMIN_SESSION_SECRET")).update(value).digest("base64url");

const cookies = (request) => Object.fromEntries(
  (request.headers.cookie ?? "").split(";").map((part) => part.trim().split(/=(.*)/s)).filter(([key]) => key),
);

export const verifyAdminSecret = (secret) => {
  const expected = requireEnv("ADMIN_SECRET");
  if (expected.length < 20 || !sameSecret(secret ?? "", expected)) {
    throw new HttpError(401, "invalid_admin_secret", "Enter a valid operator secret.");
  }
};

export const createAdminCookie = () => {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1_000) + sessionSeconds })).toString("base64url");
  const secure = isProduction() ? "; Secure" : "";
  return `${cookieName}=${payload}.${sign(payload)}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${sessionSeconds}${secure}`;
};

export const clearAdminCookie = () =>
  `${cookieName}=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0${isProduction() ? "; Secure" : ""}`;

export const requireAdmin = (request) => {
  const token = cookies(request)[cookieName] ?? "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !sameSecret(signature, sign(payload))) {
    throw new HttpError(401, "admin_required", "Sign in as the operator.");
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isInteger(session.exp) || session.exp <= Date.now() / 1_000) throw new Error();
  } catch {
    throw new HttpError(401, "admin_session_expired", "The operator session has expired.");
  }
};
