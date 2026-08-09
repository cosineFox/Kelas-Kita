import { createHash, timingSafeEqual } from "node:crypto";
import { isProduction, requireEnv } from "./config.js";
import { HttpError } from "./http.js";

const digest = (value) => createHash("sha256").update(value).digest();

const assertTrustedEdge = (request) => {
  if (!isProduction()) return;
  const supplied = request.headers["x-kelaskita-edge-key"] ?? "";
  if (!timingSafeEqual(digest(supplied), digest(requireEnv("EDGE_PROXY_SECRET")))) {
    throw new HttpError(403, "untrusted_edge", "The request did not arrive through the trusted edge.");
  }
};

export const assertSameOrigin = (request) => {
  const configured = new URL(requireEnv("PUBLIC_ORIGIN"));
  const expected = configured.origin;
  const supplied = request.headers.origin;
  const host = (request.headers.host ?? "").toLowerCase();
  if (!supplied || supplied !== expected || host !== configured.host.toLowerCase()) {
    throw new HttpError(403, "invalid_origin", "The request origin could not be verified.");
  }
  assertTrustedEdge(request);
};
