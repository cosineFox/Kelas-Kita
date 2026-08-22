import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CircleCheck,
  FileText,
  Flag,
  LockKeyhole,
  MessageSquareReply,
  RotateCcw,
  Scale,
  ShieldAlert,
  X,
} from "lucide-react";
import Turnstile from "./Turnstile";

const tabs = [
  ["experiment", "Bot lore"],
  ["rules", "Don't be weird"],
  ["privacy", "Privacy stuff"],
  ["terms", "Actual terms"],
];

const reviewLabel = (review, courses, lecturers) => {
  const course = courses.find((item) => item.id === review.courseId);
  const lecturer = lecturers.find((item) => item.id === review.lecturerId);
  return `${course?.code ?? "Course"} · ${lecturer?.name ?? "Lecturer"}`;
};

function Experiment() {
  return (
    <>
      <h2>How the robot cooks</h2>
      <p className="trust-lead">Qwen reads the yap once and tags four risks. The Core, a deterministic hall monitor, picks an outcome from fixed rules. We keep reviewer identities off public pages. Neither system can verify allegations.</p>
      <div className="core-map" aria-label="Moderation system architecture">
        <div className="agent-bank">
          <span><ShieldAlert /><strong>Danger check</strong><small>Threats and harassment</small></span>
          <span><LockKeyhole /><strong>Doxxing check</strong><small>Personal information</small></span>
          <span><Scale /><strong>Serious claim check</strong><small>Grave misconduct claims</small></span>
          <span><Bot /><strong>Yap check</strong><small>Spam and manipulation</small></span>
        </div>
        <ArrowRight className="core-arrow" aria-hidden="true" />
        <div className="policy-core"><strong>KelasKita Core</strong><span>The deterministic hall monitor</span></div>
        <ArrowRight className="core-arrow" aria-hidden="true" />
        <div className="decision-bank"><span>Publish</span><span>Hold</span><span>Remove</span><span>Escalate</span></div>
      </div>
      <div className="boundary-note">
        <AlertTriangle />
        <div><strong>The bot is not a court, bestie.</strong><p>Qwen and the Core cannot verify facts, rule on defamation or decide guilt. The Core holds serious claims. Send those claims to your university’s reporting office.</p></div>
      </div>
      <h3>The pipeline, no cap</h3>
      <ol className="policy-steps">
        <li><span>01</span><p>Every new yap starts pending. Its ratings have zero aura until publication.</p></li>
        <li><span>02</span><p>Qwen checks safety, privacy, allegations and spam in one call.</p></li>
        <li><span>03</span><p>The Core applies fixed rules and can hide urgent privacy or safety risks.</p></li>
        <li><span>04</span><p>We keep reason codes and a private audit log. Reviewers can appeal, and the operator can change a decision.</p></li>
      </ol>
    </>
  );
}

function Rules() {
  return (
    <>
      <h2>Don't be weird</h2>
      <p className="trust-lead">Yap about the class and lecturer from your own experience. Give the next student something useful.</p>
      <div className="rule-columns">
        <section><CircleCheck /><h3>Valid yapping</h3><ul><li>Teaching clarity and class format</li><li>Assessment design and feedback timing</li><li>Workload and prerequisites</li><li>Events you experienced yourself</li></ul></section>
        <section><X /><h3>Instant L</h3><ul><li>Threats, slurs and personal attacks</li><li>Phone numbers, addresses and identity numbers</li><li>Impersonation and coordinated ratings</li><li>Rumours presented as personal knowledge</li></ul></section>
      </div>
      <div className="formal-channel"><Scale /><div><strong>Serious misconduct is not campus lore.</strong><p>KelasKita cannot investigate crime, corruption, sexual misconduct or immediate danger. Contact your university’s integrity or security office.</p></div></div>
    </>
  );
}

function Privacy() {
  const operator = import.meta.env.VITE_OPERATOR_CONTACT_EMAIL;
  return (
    <>
      <h2>Privacy, or as close as infra allows</h2>
      <p className="trust-lead">You can post without an account. We omit reviewer identities from public pages. Cloudflare and Vercel keep technical records, and investigators may obtain them through legal process.</p>
      <dl className="policy-list">
        <div><dt>Robot food</dt><dd>We send review and case text through Vercel AI Gateway to Qwen. We exclude contact details from those requests.</dd></div>
        <div><dt>Infra receipts</dt><dd>Cloudflare and Vercel may keep network and security logs. KelasKita stores rotating abuse-signal hashes instead of raw IP addresses.</dd></div>
        <div><dt>30 days</dt><dd>We keep rotating abuse hashes and anti-spam signals.</dd></div>
        <div><dt>90 days</dt><dd>We keep rejected or withdrawn review text so reviewers have time to appeal.</dd></div>
        <div><dt>12 months</dt><dd>We keep closed report and appeal records with the moderation audit metadata. We delete private follow-up contacts when the case closes.</dd></div>
        <div><dt>Until removal</dt><dd>We keep published reviews and replies until we remove them under policy or close the service.</dd></div>
      </dl>
      <p className="small-print">A court or regulator may require the operator to disclose records that still exist. Cloudflare, Vercel and the selected model provider may process data outside Malaysia.</p>
      {operator && <p className="small-print"><strong>Operator contact:</strong> <a href={`mailto:${operator}`}>{operator}</a></p>}
    </>
  );
}

function Terms() {
  return (
    <>
      <h2>Terms, because consequences have aura</h2>
      <p className="trust-lead">You must be 18 or older and write from your own academic experience.</p>
      <ol className="terms-list">
        <li><strong>First-hand lore only.</strong><span>Do not submit rumours or claim to speak for another person.</span></li>
        <li><strong>Your words, your consequences.</strong><span>Submission does not make KelasKita an official complaint or whistleblowing channel.</span></li>
        <li><strong>You let us moderate it.</strong><span>We may screen, hold, redact, annotate or remove your submission under these rules.</span></li>
        <li><strong>The bot can fumble.</strong><span>Use reports and appeals to challenge a decision.</span></li>
        <li><strong>No university affiliation.</strong><span>No listed university operates or endorses KelasKita.</span></li>
      </ol>
    </>
  );
}

function Overview({ initialTab, onNavigate }) {
  const [tab, setTab] = useState(initialTab ?? "experiment");
  return (
    <div className="trust-overview">
      <nav className="trust-nav" aria-label="Trust centre sections">
        <div className="trust-tabs">
          {tabs.map(([id, label]) => <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{label}</button>)}
        </div>
        <div className="trust-actions">
          <button onClick={() => onNavigate({ mode: "report" })}><Flag /><span>Report a mess</span></button>
          <button onClick={() => onNavigate({ mode: "reply" })}><MessageSquareReply /><span>Lecturer reply</span></button>
          <button onClick={() => onNavigate({ mode: "appeal" })}><RotateCcw /><span>Appeal the bot</span></button>
        </div>
      </nav>
      <article className="trust-article">
        {tab === "experiment" && <Experiment />}
        {tab === "rules" && <Rules />}
        {tab === "privacy" && <Privacy />}
        {tab === "terms" && <Terms />}
      </article>
    </div>
  );
}

function CaseForm({ mode, context, courses, lecturers, reviews, onNavigate, onReport, onAppeal, onReply }) {
  const selectableReviews = useMemo(() => reviews.filter((review) => ["held", "published", "rejected"].includes(review.status)), [reviews]);
  const [reviewId, setReviewId] = useState(context.reviewId ?? selectableReviews[0]?.id ?? "");
  const [reason, setReason] = useState("Personal information or doxxing");
  const [receipt, setReceipt] = useState("");
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const review = reviews.find((item) => item.id === reviewId);
  const linkedReportAppeal = mode === "appeal" && Boolean(context.reportId && context.reviewId);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const response = mode === "report"
      ? await onReport({ reviewId, reason, details }, turnstileToken)
      : mode === "appeal"
        ? await onAppeal({
          reviewId: linkedReportAppeal ? context.reviewId : null,
          reportId: linkedReportAppeal ? context.reportId : null,
          receipt: linkedReportAppeal ? undefined : receipt,
          details,
          contact,
        }, turnstileToken)
        : await onReply({ reviewId, lecturerId: review?.lecturerId, email, body }, turnstileToken);
    setSubmitting(false);
    if (response.ok) setResult(response);
    else {
      setError(response.error);
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    }
  };

  if (result) {
    return (
      <div className="case-result">
        <CircleCheck />
        <h2>{mode === "report" ? "Report received. Snitching logged." : mode === "appeal" ? "Appeal received. Run it back." : "Reply received. Lecturer lore pending."}</h2>
        <p>{result.decision.summary}</p>
        <dl><div><dt>Initial action</dt><dd>{result.decision.action.replaceAll("_", " ")}</dd></div><div><dt>State</dt><dd>{result.decision.status}</dd></div><div><dt>Appealable</dt><dd>{result.decision.appealable ? "Yes" : "Not required"}</dd></div></dl>
        <div className="case-result-actions">
          {mode === "report" && <button className="button secondary" onClick={() => onNavigate({ mode: "appeal", reviewId, reportId: result.report.id })}>Appeal this verdict</button>}
          <button className="button primary" onClick={() => onNavigate({ mode: "overview" })}>Back to bot lore</button>
        </div>
      </div>
    );
  }

  const headings = {
    report: ["Snitch on a review", "Qwen checks the report. The Core records its action and reason codes."],
    appeal: ["Run the verdict back", "We queue the appeal for a separate decision. The current decision stays in place during that review."],
    reply: ["Lecturer counter-yap", "The operator verifies your university email and checks the reply before publication."],
  };

  return (
    <div className="case-page">
      <button className="back-link" onClick={() => onNavigate({ mode: "overview" })}>← Bot lore</button>
      <h2>{headings[mode][0]}</h2>
      <p className="trust-lead">{headings[mode][1]}</p>
      {mode !== "appeal" && !selectableReviews.length ? (
        <div className="no-cases"><FileText /><strong>Nothing to beef with.</strong><p>You can report or reply to a published, held or rejected review.</p></div>
      ) : (
        <form className="case-form" onSubmit={submit}>
          {mode !== "appeal" && <label>Review<select value={reviewId} onChange={(event) => setReviewId(event.target.value)}>{selectableReviews.map((item) => <option value={item.id} key={item.id}>{reviewLabel(item, courses, lecturers)}</option>)}</select></label>}
          {mode === "appeal" && !linkedReportAppeal && <label>Private moderation receipt<input required minLength={20} maxLength={128} value={receipt} onChange={(event) => setReceipt(event.target.value)} placeholder="Paste your receipt here" /></label>}
          {linkedReportAppeal && <div className="urgent-note"><FileText /><span>Receipt linked. The lore is connected.</span></div>}
          {mode === "report" && <label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option>Threat or immediate safety</option><option>Personal information or doxxing</option><option>Serious unverified allegation</option><option>Harassment or personal attack</option><option>Spam or manipulation</option><option>Other policy breach</option></select></label>}
          {mode === "reply" && <label>University email <span>kept private</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@university.edu.my" /></label>}
          {mode === "appeal" && <label>Contact email <span>optional and private</span><input type="email" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Use this address for appeal follow-up" /></label>}
          <label>{mode === "reply" ? "Proposed reply" : mode === "appeal" ? "Reason for changing the decision" : "Evidence and policy concern"}<textarea required minLength={mode === "report" ? 20 : 70} maxLength={1500} value={mode === "reply" ? body : details} onChange={(event) => mode === "reply" ? setBody(event.target.value) : setDetails(event.target.value)} /></label>
          {mode === "report" && <div className="urgent-note"><ShieldAlert /><span>The Core benches reviews with strong threat or personal-information flags. Other reports enter the queue without hiding the review.</span></div>}
          <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
          {error && <p className="publish-error"><AlertTriangle />{error}</p>}
          <button className="button primary" disabled={submitting || !turnstileToken || (mode !== "appeal" && !reviewId) || (mode === "appeal" && !linkedReportAppeal && !receipt)}>{submitting ? "Qwen is judging…" : !turnstileToken ? "Prove you are not a bot" : mode === "report" ? "Send the snitch report" : mode === "appeal" ? "Run it back" : "Send counter-yap"}<ArrowRight /></button>
        </form>
      )}
    </div>
  );
}

export default function TrustCentre({ context, courses, lecturers, reviews, onNavigate, onReport, onAppeal, onReply, onClose }) {
  const titleRef = useRef(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    titleRef.current?.focus();
    const escape = (event) => event.key === "Escape" && onClose();
    addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      removeEventListener("keydown", escape);
    };
  }, [onClose]);

  return (
    <div className="trust-layer" role="dialog" aria-modal="true" aria-labelledby="trust-title">
      <button className="trust-scrim" aria-label="Close trust centre" onClick={onClose} />
      <section className="trust-sheet">
        <header className="trust-header">
          <div><span ref={titleRef} id="trust-title" tabIndex="-1">KelasKita Bot Basement</span><small>Core 0.1 · supervised chaos</small></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </header>
        {context.mode === "overview" || !context.mode
          ? <Overview initialTab={context.tab} onNavigate={onNavigate} />
          : <CaseForm mode={context.mode} context={context} courses={courses} lecturers={lecturers} reviews={reviews} onNavigate={onNavigate} onReport={onReport} onAppeal={onAppeal} onReply={onReply} />}
        <footer className="trust-footer"><span>No account side quest. We hide reviewer identities from public pages.</span><strong>No listed university operates or endorses KelasKita.</strong></footer>
      </section>
    </div>
  );
}
