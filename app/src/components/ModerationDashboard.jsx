import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Bot, Check, Clock3, LockKeyhole, RefreshCw, ShieldAlert } from "lucide-react";
import {
  adminLogin,
  adminLogout,
  adminSession,
  decideCase,
  loadAdminHealth,
  loadAdminHistory,
  loadAdminQueue,
  processAdminQueue,
  retryCase,
} from "../lib/apiClient";
import { normaliseAdminHealth, normaliseAdminQueue } from "../lib/adminViewModel";

const actions = {
  review: [["publish", "Publish"], ["hold", "Keep private"], ["reject", "Reject"]],
  report: [["no_action", "No action"], ["hold", "Keep held"], ["remove", "Remove"], ["dismiss", "Dismiss report"]],
  appeal: [["restore", "Restore"], ["dismiss", "Uphold decision"]],
  reply: [["publish", "Publish reply"], ["hold", "Keep reply private"], ["reject", "Reject reply"]],
};

const terminalStates = new Set(["published", "rejected", "removed", "resolved", "dismissed", "restored"]);

const age = (date) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date)) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

function Login({ onAuthenticated }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await adminLogin(secret);
      onAuthenticated();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="moderation-login">
      <form onSubmit={submit}>
        <LockKeyhole />
        <span className="eyebrow">Operator access</span>
        <h1>Moderation</h1>
        <p>Reports, appeals and review decisions.</p>
        <label>Operator key<input type="password" autoComplete="current-password" minLength={8} value={secret} onChange={(event) => setSecret(event.target.value)} /></label>
        {error && <p className="publish-error"><AlertTriangle /> {error}</p>}
        <button className="button primary" disabled={submitting || secret.length < 8}>{submitting ? "Checking…" : "Sign in"}</button>
        <a href="/"><ArrowLeft /> Public site</a>
      </form>
    </main>
  );
}

export default function ModerationDashboard() {
  const [authenticated, setAuthenticated] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [queueView, setQueueView] = useState("active");
  const [health, setHealth] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (live = false) => {
    setError("");
    try {
      const [queue, history, nextHealth] = await Promise.all([loadAdminQueue(), loadAdminHistory(), loadAdminHealth(live)]);
      const nextCases = [...normaliseAdminQueue(queue), ...normaliseAdminQueue(history)];
      setCases(nextCases);
      setHealth(normaliseAdminHealth(nextHealth));
    } catch (nextError) {
      if (nextError.status === 401) setAuthenticated(false);
      else setError(nextError.message);
    }
  }, []);

  useEffect(() => {
    adminSession()
      .then(() => { setAuthenticated(true); load(); })
      .catch(() => setAuthenticated(false));
  }, [load]);

  const activeCases = useMemo(() => cases.filter((item) => !terminalStates.has(item.state)), [cases]);
  const historyCases = useMemo(() => cases.filter((item) => terminalStates.has(item.state)), [cases]);
  const visibleCases = queueView === "history" ? historyCases : activeCases;
  const selected = useMemo(() => visibleCases.find((item) => item.targetId === selectedId), [selectedId, visibleCases]);

  useEffect(() => {
    setSelectedId((current) => visibleCases.some((item) => item.targetId === current) ? current : visibleCases[0]?.targetId ?? null);
    setReason("");
  }, [queueView, visibleCases]);

  const decide = async (action) => {
    if (!selected || reason.trim().length < 10) return;
    setBusy(true);
    setError("");
    try {
      await decideCase({ kind: selected.kind, targetId: selected.targetId, action, reason });
      setReason("");
      await load();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await retryCase({ kind: selected.kind, targetId: selected.targetId });
      await load();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  };

  const runQueue = async () => {
    setBusy(true);
    setError("");
    try {
      await processAdminQueue();
      await load();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  };

  if (authenticated === null) return <main className="moderation-loading"><ShieldAlert /> Checking session…</main>;
  if (!authenticated) return <Login onAuthenticated={() => { setAuthenticated(true); load(); }} />;

  const configReady = Boolean(health?.configuration && Object.values(health.configuration).every(Boolean));
  return (
    <main className="moderation-console">
      <header className="moderation-topbar">
        <div><span className="logo-mark">KK</span><strong>Moderation queue</strong><small>Private · Core 0.1</small></div>
        <nav>
          <a href="/"><ArrowLeft /> Public site</a>
          <button disabled={busy} onClick={runQueue}><Bot /> Run queue</button>
          <button onClick={() => load()}><RefreshCw /> Refresh</button>
          <button onClick={async () => { await adminLogout(); setAuthenticated(false); }}>Sign out</button>
        </nav>
      </header>

      <section className="moderation-status">
        <span className={health?.database?.ok ? "ready" : "blocked"}><Check /> Database</span>
        <span className={configReady ? "ready" : "blocked"}>{configReady ? <Check /> : <AlertTriangle />} Configuration</span>
        <span className={health?.aiGateway?.ok ? "ready" : "untested"}><Bot /> AI Gateway {health?.aiGateway?.tested ? health.aiGateway.ok ? "live" : "failed" : "untested"}</span>
        <button disabled={busy} onClick={() => load(true)}>Test AI</button>
      </section>

      {error && <p className="moderation-error"><AlertTriangle /> {error}</p>}
      <div className="moderation-workspace">
        <aside className="case-list">
          <header>
            <div><h1>{queueView === "history" ? "History" : "Queue"}</h1><span>{visibleCases.length} {queueView === "history" ? "archived" : "active"}</span></div>
            <nav className="queue-tabs" aria-label="Moderation queue view">
              <button className={queueView === "active" ? "selected" : ""} aria-pressed={queueView === "active"} onClick={() => setQueueView("active")}>Active <b>{activeCases.length}</b></button>
              <button className={queueView === "history" ? "selected" : ""} aria-pressed={queueView === "history"} onClick={() => setQueueView("history")}>History <b>{historyCases.length}</b></button>
            </nav>
          </header>
          {queueView === "active" && <p className="queue-note"><Clock3 /> Active cases still need a decision. Held reviews stay private and do not affect public ratings.</p>}
          {!visibleCases.length && <div className="queue-empty"><Check /><strong>{queueView === "history" ? "No decision history" : "No active cases"}</strong><small>{queueView === "history" ? "Published, rejected and removed cases will collect here." : "New submissions will appear here after they arrive."}</small></div>}
          {visibleCases.map((item) => (
            <button key={`${item.kind}-${item.targetId}`} className={`${selectedId === item.targetId ? "selected" : ""} ${item.urgent ? "urgent" : ""}`} onClick={() => { setSelectedId(item.targetId); setReason(""); }}>
              <span>{item.kind}</span><strong>{item.courseCode} · {item.lecturerName}</strong>
              <small>{queueView === "history" ? <><Check /> Archived · {item.state}</> : <><Clock3 /> Open for {age(item.createdAt)} · {item.state}</>}</small>
              {item.urgent && <em><ShieldAlert /> Urgent removal</em>}
            </button>
          ))}
        </aside>

        <article className="case-detail">
          {!selected ? <div className="queue-empty"><ShieldAlert /><strong>Select a case</strong></div> : <>
            <header>
              <div><span className="eyebrow">{selected.kind} · {selected.state}</span><h2>{selected.courseCode} · {selected.courseName}</h2><p>{selected.lecturerName} · received {new Date(selected.createdAt).toLocaleString("en-MY")}</p></div>
              {selected.urgent && <strong className="urgent-badge"><ShieldAlert /> Urgent · {age(selected.createdAt)}</strong>}
            </header>
            <section className="case-copy"><h3>Review text</h3><blockquote>{selected.body}</blockquote></section>
            {selected.details && <section className="case-copy"><h3>Case details</h3><p>{selected.details}</p></section>}
            {selected.contact && <section className="private-contact"><LockKeyhole /><div><strong>Private verification contact</strong><span>{selected.contact}</span></div></section>}
            <dl className="case-metadata">
              <div><dt>Agent action</dt><dd>{selected.lastAction?.replaceAll("_", " ") ?? "Waiting"}</dd></div>
              <div><dt>Job</dt><dd>{selected.jobState ?? "None"} · {selected.attempts} attempts</dd></div>
              <div><dt>Reason codes</dt><dd>{selected.reasonCodes?.join(", ") || "None yet"}</dd></div>
            </dl>
            {selected.lastError && <div className="job-error"><AlertTriangle /> Retry queue: {selected.lastError}</div>}
            {selected.agentFindings?.length > 0 && <section className="agent-findings"><h3>AI findings</h3>{selected.agentFindings.map((finding) => <div key={finding.agent}><strong>{finding.agent}</strong><span>{finding.severity}</span><p>{finding.rationale}</p></div>)}</section>}
            {queueView === "history" ? <section className="case-history-note"><Check /><div><strong>Decision recorded</strong><span>This case is archived. It is no longer waiting for an operator action.</span></div></section> : <section className="human-decision">
              <h3>Human verdict</h3>
              <label>Private receipts<input value={reason} maxLength={500} placeholder="Record the policy basis and evidence considered…" onChange={(event) => setReason(event.target.value)} /></label>
              <div>{(actions[selected.kind] ?? []).map(([action, label]) => <button key={action} className={action === "remove" || action === "reject" ? "danger" : ""} disabled={busy || reason.trim().length < 10} onClick={() => decide(action)}>{label}</button>)}</div>
              {["retry", "dead"].includes(selected.jobState) && <button className="retry-button" disabled={busy} onClick={retry}><RefreshCw /> Retry job</button>}
            </section>}
          </>}
        </article>
      </div>
    </main>
  );
}
