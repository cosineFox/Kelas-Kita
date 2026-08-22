import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { ConfigurationError } from "./config.js";

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const readJson = (request) => {
  const length = Number(request.headers["content-length"] ?? 0);
  if (length > 24_000) throw new HttpError(413, "payload_too_large", "That yap is doing too much. Shorten it.");

  try {
    return typeof request.body === "string" ? JSON.parse(request.body) : request.body ?? {};
  } catch {
    throw new HttpError(400, "invalid_json", "That request arrived mangled.");
  }
};

export const sendJson = (response, status, body) => response.status(status).json(body);

const setHeaders = (response, requestId) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-Request-Id", requestId);
};

const publicError = (error) => {
  if (error instanceof HttpError) return error;
  if (error instanceof ConfigurationError) {
    return new HttpError(503, error.code, "The operator has not finished setting up submissions.");
  }
  if (error instanceof ZodError) {
    return new HttpError(400, "invalid_request", "Some fields failed the vibe check. Fix them and try again.");
  }
  if (error?.code === "23505") {
    return new HttpError(409, "duplicate_submission", "Duplicate jumpscare: we already received this submission.");
  }
  if (error?.code === "23503") {
    return new HttpError(400, "invalid_reference", "We cannot find the selected record.");
  }
  return new HttpError(500, "internal_error", "The server fumbled that request.");
};

const diagnostic = (error) => ({
  cause: typeof error?.code === "string" ? error.code : undefined,
  name: typeof error?.name === "string" ? error.name : undefined,
  routine: typeof error?.routine === "string" ? error.routine : undefined,
  severity: typeof error?.severity === "string" ? error.severity : undefined,
});

export const endpoint = (methods, handler) => async (request, response) => {
  const requestId = randomUUID();
  setHeaders(response, requestId);

  if (!methods.includes(request.method)) {
    response.setHeader("Allow", methods.join(", "));
    return sendJson(response, 405, { error: "Method not allowed", code: "method_not_allowed", requestId });
  }

  try {
    return await handler(request, response, requestId);
  } catch (error) {
    const safe = publicError(error);
    if (safe.retryAfter) response.setHeader("Retry-After", safe.retryAfter);
    const details = safe.code === "internal_error" ? diagnostic(error) : {};
    console.error(JSON.stringify({ event: "api_error", requestId, code: safe.code, ...details }));
    return sendJson(response, safe.status, { error: safe.message, code: safe.code, requestId });
  }
};
