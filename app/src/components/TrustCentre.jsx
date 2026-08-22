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
  ["experiment", "How it works"],
  ["rules", "Community rules"],
  ["privacy", "Privacy & retention"],
  ["terms", "Terms"],
];

const reviewLabel = (review, courses, lecturers) => {
  const course = courses.find((item) => item.id === review.courseId);
  const lecturer = lecturers.find((item) => item.id === review.lecturerId);
  return `${course?.code ?? "Course"} · ${lecturer?.name ?? "Lecturer"}`;
};

function Experiment() {
  return (
    <>
      <h2>How moderation works</h2>
      <p className="trust-lead">Qwen returns four risk labels in one call. The Core applies fixed rules to those labels. We hide reviewer identities from public pages. Neither Qwen nor the Core can verify allegations.</p>
      <div className="core-map" aria-label="Moderation system architecture">
        <div className="agent-bank">
          <span><ShieldAlert /><strong>Safety</strong><small>Threats and harassment</small></span>
          <span><LockKeyhole /><strong>Privacy</strong><small>Personal information</small></span>
          <span><Scale /><strong>Allegation</strong><small>Grave misconduct claims</small></span>
          <span><Bot /><strong>Integrity</strong><small>Spam and manipulation</small></span>
        </div>
        <ArrowRight className="core-arrow" aria-hidden="true" />
        <div className="policy-core"><strong>KelasKita Core</strong><span>Applies published policy rules</span></div>
        <ArrowRight className="core-arrow" aria-hidden="true" />
        <div className="decision-bank"><span>Publish</span><span>Hold</span><span>Remove</span><span>Escalate</span></div>
      </div>
      <div className="boundary-note">
        <AlertTriangle />
        <div><strong>Qwen flags risks in the text.</strong><p>Qwen and the Core cannot verify facts, rule on defamation or decide guilt. The Core holds serious claims. You should send those claims to your university’s reporting office.</p></div>
      </div>
      <h3>Decision process</h3>
      <ol className="policy-steps">
        <li><span>01</span><p>We mark new submissions pending and exclude their ratings from public scores.</p></li>
        <li><span>02</span><p>Qwen checks safety, privacy, allegations and spam in one call.</p></li>
        <li><span>03</span><p>The Core applies fixed rules. It can hide urgent privacy and safety risks.</p></li>
        <li><span>04</span><p>We store reason codes and a private audit log. Reviewers can appeal, and the operator can change a decision.</p></li>
      </ol>
    </>
  );
}

function Rules() {
  return (
    <>
      <h2>Community rules</h2>
      <p className="trust-lead">Describe the course and lecturer from your own experience. Include details that another student can use.</p>
      <div className="rule-columns">
        <section><CircleCheck /><h3>Write about</h3><ul><li>Teaching clarity and class format</li><li>Assessment design and feedback timing</li><li>Workload and prerequisites</li><li>Events you experienced yourself</li></ul></section>
        <section><X /><h3>Leave out</h3><ul><li>Threats, slurs and personal attacks</li><li>Phone numbers, addresses and identity numbers</li><li>Impersonation and coordinated ratings</li><li>Rumours presented as personal knowledge</li></ul></section>
      </div>
      <div className="formal-channel"><Scale /><div><strong>Report serious misconduct to your university.</strong><p>KelasKita cannot investigate crime, corruption, sexual misconduct or immediate danger. Contact your university’s integrity or security office.</p></div></div>
    </>
  );
}

function Privacy() {
  const operator = import.meta.env.VITE_OPERATOR_CONTACT_EMAIL;
  return (
    <>
      <h2>Privacy & retention</h2>
      <p className="trust-lead">You can post without an account. We omit reviewer identities from public pages. Cloudflare and Vercel keep technical records, and investigators may obtain them through legal process.</p>
      <dl className="policy-list">
        <div><dt>Moderation processing</dt><dd>We send review and case text through Vercel AI Gateway to Qwen. We exclude contact details from those requests.</dd></div>
        <div><dt>Infrastructure records</dt><dd>Cloudflare and Vercel may keep network and security logs. KelasKita stores rotating abuse-signal hashes instead of raw IP addresses.</dd></div>
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
      <h2>Terms of participation</h2>
      <p className="trust-lead">You must be 18 or older and write from your own academic experience.</p>
      <ol className="terms-list">
        <li><strong>Use your own experience.</strong><span>Do not submit rumours or claim to speak for another person.</span></li>
        <li><strong>You remain responsible for your words.</strong><span>Submission does not make KelasKita an official complaint or whistleblowing channel.</span></li>
        <li><strong>You permit publication and moderation.</strong><span>We may screen, hold, redact, annotate or remove your submission under these rules.</span></li>
        <li><strong>AI can make mistakes.</strong><span>Use reports and appeals to challenge a decision.</span></li>
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
          <button onClick={() => onNavigate({ mode: "report" })}><Flag /><span>Report content</span></button>
          <button onClick={() => onNavigate({ mode: "reply" })}><MessageSquareReply /><span>Right of reply</span></button>
          <button onClick={() => onNavigate({ mode: "appeal" })}><RotateCcw /><span>Appeal a decision</span></button>
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
        <h2>{mode === "report" ? "We processed your report." : mode === "appeal" ? "We received your appeal." : "We received your reply."}</h2>
        <p>{result.decision.summary}</p>
        <dl><div><dt>Initial action</dt><dd>{result.decision.action.replaceAll("_", " ")}</dd></div><div><dt>State</dt><dd>{result.decision.status}</dd></div><div><dt>Appealable</dt><dd>{result.decision.appealable ? "Yes" : "Not required"}</dd></div></dl>
        <div className="case-result-actions">
          {mode === "report" && <button className="button secondary" onClick={() => onNavigate({ mode: "appeal", reviewId, reportId: result.report.id })}>Appeal this decision</button>}
          <button className="button primary" onClick={() => onNavigate({ mode: "overview" })}>Return to trust centre</button>
        </div>
      </div>
    );
  }

  const headings = {
    report: ["Report a review", "Qwen checks the report. The Core records its action and reason codes."],
    appeal: ["Appeal a decision", "We queue the appeal for a separate decision. We leave the current decision in place during that review."],
    reply: ["Lecturer right of reply", "The operator verifies your university email and checks the reply before publication."],
  };

  return (
    <div className="case-page">
      <button className="back-link" onClick={() => onNavigate({ mode: "overview" })}>← Trust centre</button>
      <h2>{headings[mode][0]}</h2>
      <p className="trust-lead">{headings[mode][1]}</p>
      {mode !== "appeal" && !selectableReviews.length ? (
        <div className="no-cases"><FileText /><strong>No reviews available.</strong><p>You can report or reply to a published, held or rejected review.</p></div>
      ) : (
        <form className="case-form" onSubmit={submit}>
          {mode !== "appeal" && <label>Review<select value={reviewId} onChange={(event) => setReviewId(event.target.value)}>{selectableReviews.map((item) => <option value={item.id} key={item.id}>{reviewLabel(item, courses, lecturers)}</option>)}</select></label>}
          {mode === "appeal" && !linkedReportAppeal && <label>Private moderation receipt<input required minLength={20} maxLength={128} value={receipt} onChange={(event) => setReceipt(event.target.value)} placeholder="Paste the receipt shown after submission" /></label>}
          {linkedReportAppeal && <div className="urgent-note"><FileText /><span>This appeal uses your report receipt.</span></div>}
          {mode === "report" && <label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option>Threat or immediate safety</option><option>Personal information or doxxing</option><option>Serious unverified allegation</option><option>Harassment or personal attack</option><option>Spam or manipulation</option><option>Other policy breach</option></select></label>}
          {mode === "reply" && <label>University email <span>kept private</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@university.edu.my" /></label>}
          {mode === "appeal" && <label>Contact email <span>optional and private</span><input type="email" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Use this address for appeal follow-up" /></label>}
          <label>{mode === "reply" ? "Proposed reply" : mode === "appeal" ? "Reason for changing the decision" : "Evidence and policy concern"}<textarea required minLength={mode === "report" ? 20 : 70} maxLength={1500} value={mode === "reply" ? body : details} onChange={(event) => mode === "reply" ? setBody(event.target.value) : setDetails(event.target.value)} /></label>
          {mode === "report" && <div className="urgent-note"><ShieldAlert /><span>The Core hides reviews with strong threat or personal-information flags. It queues other reports without hiding the review.</span></div>}
          <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
          {error && <p className="publish-error"><AlertTriangle />{error}</p>}
          <button className="button primary" disabled={submitting || !turnstileToken || (mode !== "appeal" && !reviewId) || (mode === "appeal" && !linkedReportAppeal && !receipt)}>{submitting ? "Qwen is checking…" : !turnstileToken ? "Complete anti-bot check" : mode === "report" ? "Submit report" : mode === "appeal" ? "Submit appeal" : "Submit reply"}<ArrowRight /></button>
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
          <div><span ref={titleRef} id="trust-title" tabIndex="-1">KelasKita Trust Centre</span><small>Policy version Core 0.1 · experimental</small></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </header>
        {context.mode === "overview" || !context.mode
          ? <Overview initialTab={context.tab} onNavigate={onNavigate} />
          : <CaseForm mode={context.mode} context={context} courses={courses} lecturers={lecturers} reviews={reviews} onNavigate={onNavigate} onReport={onReport} onAppeal={onAppeal} onReply={onReply} />}
        <footer className="trust-footer"><span>Post without an account. We hide reviewer identities from public pages.</span><strong>No listed university operates or endorses KelasKita.</strong></footer>
      </section>
    </div>
  );
}
