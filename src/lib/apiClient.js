const request = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: options.body ? { "content-type": "application/json", ...options.headers } : options.headers,
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};
  if (!isJson) throw new Error("The server API is not connected.");
  if (!response.ok) {
    const error = new Error(payload.error ?? "The service could not complete that request.");
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return payload;
};

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });

export const loadPublicState = () => request("/api/state");
export const submitReview = (body) => post("/api/reviews", body);
export const submitReport = (body) => post("/api/reports", body);
export const submitAppeal = (body) => post("/api/appeals", body);
export const submitReply = (body) => post("/api/replies", body);

export const adminSession = () => request("/api/admin/session");
export const adminLogin = (secret) => post("/api/admin/session", { secret });
export const adminLogout = () => request("/api/admin/session", { method: "DELETE" });
export const loadAdminQueue = () => request("/api/admin/queue");
export const loadAdminHealth = (live = false) => request(`/api/admin/health${live ? "?live=1" : ""}`);
export const decideCase = (body) => post("/api/admin/decide", body);
export const retryCase = (body) => post("/api/admin/retry", body);
export const processAdminQueue = () => post("/api/admin/process", {});
