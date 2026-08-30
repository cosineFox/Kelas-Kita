const request = async (path, options = {}) => {
  const { timeoutMs = 8_000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      credentials: "same-origin",
      ...fetchOptions,
      signal: fetchOptions.signal ?? controller.signal,
      headers: fetchOptions.body ? { "content-type": "application/json", ...fetchOptions.headers } : fetchOptions.headers,
    });
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await response.json().catch(() => ({})) : {};
    if (!isJson) throw new Error("The backend is not connected.");
    if (!response.ok) {
      const error = new Error(payload.error ?? "The server fumbled that request.");
      error.status = response.status;
      error.code = payload.code;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The server took too long to answer.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const post = (path, body, options = {}) => request(path, { ...options, method: "POST", body: JSON.stringify(body) });

export const loadPublicState = () => request("/api/state");
export const submitReview = (body) => post("/api/reviews", body);
export const submitReport = (body) => post("/api/reports", body);
export const submitAppeal = (body) => post("/api/appeals", body);
export const submitReply = (body) => post("/api/replies", body);

export const adminSession = () => request("/api/admin/session");
export const adminLogin = (secret) => post("/api/admin/session", { secret });
export const adminLogout = () => request("/api/admin/session", { method: "DELETE" });
export const loadAdminQueue = () => request("/api/admin/queue");
export const loadAdminHistory = () => request("/api/admin/history");
export const loadAdminHealth = (live = false) => request(
  `/api/admin/health${live ? "?live=1" : ""}`,
  { timeoutMs: live ? 25_000 : 8_000 },
);
export const decideCase = (body) => post("/api/admin/decide", body);
export const retryCase = (body) => post("/api/admin/retry", body);
export const processAdminQueue = () => post("/api/admin/process", {}, { timeoutMs: 55_000 });
