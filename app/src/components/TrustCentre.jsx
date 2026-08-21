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
  ["experiment", "The experiment"],
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
      <h2>An autonomous moderation experiment</h2>
      <p className="trust-lead">KelasKita runs four AI risk checks, then applies a fixed rule set. Public pages hide reviewer identities. The system cannot verify allegations.</p>
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
        <div><strong>Agents classify risk signals.</strong><p>The system cannot verify facts, decide whether a statement is defamatory or find anyone guilty. The Core holds serious claims and directs reviewers to university reporting channels.</p></div>
      </div>
      <h3>Decision process</h3>
      <ol className="policy-steps">
        <li><span>01</span><p>We store each submission as pending. Pending and held ratings do not affect public scores.</p></li>
        <li><span>02</span><p>Four AI roles inspect safety, privacy, allegations and spam in one pass.</p></li>
        <li><span>03</span><p>The Core applies fixed policy rules to the results. It can hide urgent privacy and safety risks.</p></li>
        <li><span>04</span><p>We record reason codes and a private audit trail. Reviewers can appeal; the operator can override the Core.</p></li>
      </ol>
    </>
  );
}

function Rules() {
  return (
    <>
      <h2>Community rules</h2>
      <p className="trust-lead">Criticise the course and lecturer. Use first-hand details that help the next student.</p>
      <div className="rule-columns">
        <section><CircleCheck /><h3>Useful here</h3><ul><li>Teaching clarity and class format</li><li>Assessment design and feedback timing</li><li>Workload, prerequisites and learning value</li><li>Specific experiences stated as your perspective</li></ul></section>
        <section><X /><h3>We block</h3><ul><li>Threats, slurs or personal attacks</li><li>Phone numbers, addresses, identity numbers or private accounts</li><li>Impersonation, spam or coordinated ratings</li><li>Rumours presented as personal knowledge</li></ul></section>
      </div>
      <div className="formal-channel"><Scale /><div><strong>Serious misconduct needs a formal channel.</strong><p>Crime, corruption, sexual misconduct and immediate safety concerns require investigators who can receive evidence and protect the people involved. Report them to your university’s integrity, student-support or security office as appropriate.</p></div></div>
    </>
  );
}

function Privacy() {
  const operator = import.meta.env.VITE_OPERATOR_CONTACT_EMAIL;
  return (
    <>
      <h2>Privacy & retention</h2>
      <p className="trust-lead">You do not need an account. Public pages hide reviewer identities. Cloudflare, Vercel or a lawful investigation may still reveal technical records.</p>
      <dl className="policy-list">
        <div><dt>Moderation processing</dt><dd>KelasKita sends review and moderation-case text through Vercel AI Gateway to the configured model. The model receives no contact details from appeals or replies.</dd></div>
        <div><dt>Infrastructure records</dt><dd>Cloudflare and Vercel may keep network and security logs. KelasKita stores rotating abuse-signal hashes instead of raw IP addresses.</dd></div>
        <div><dt>30 days</dt><dd>Rotating abuse hashes and short-lived anti-spam signals.</dd></div>
        <div><dt>90 days</dt><dd>We keep rejected or withdrawn review text so reviewers have time to appeal.</dd></div>
        <div><dt>12 months</dt><dd>We keep closed report and appeal records with the moderation audit metadata. We delete private follow-up contacts when the case closes.</dd></div>
        <div><dt>Until removal</dt><dd>We keep published reviews and replies until policy requires removal or the service closes.</dd></div>
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
      <p className="trust-lead">This experimental service is for first-hand academic feedback from people aged 18 or over.</p>
      <ol className="terms-list">
        <li><strong>Use your own experience.</strong><span>Do not submit rumours or claim to speak for another person.</span></li>
        <li><strong>You remain responsible for your words.</strong><span>Submission does not make KelasKita an official complaint or whistleblowing channel.</span></li>
        <li><strong>You permit publication and moderation.</strong><span>KelasKita may screen, hold, redact, annotate or remove your submission under these rules.</span></li>
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
        {tabs.map(([id, label]) => <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{label}</button>)}
        <div className="trust-actions">
          <button onClick={() => onNavigate({ mode: "report" })}><Flag /> Report content</button>
          <button onClick={() => onNavigate({ mode: "reply" })}><MessageSquareReply /> Right of reply</button>
          <button onClick={() => onNavigate({ mode: "appeal" })}><RotateCcw /> Appeal a decision</button>
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
        <h2>{mode === "report" ? "The Core evaluated the report." : mode === "appeal" ? "Appeal recorded." : "Reply received."}</h2>
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
    report: ["Report or request a takedown", "AI agents check the report. The Core records the first action and its reasons."],
    appeal: ["Appeal a decision", "We queue a separate review and keep the first action in place until it finishes."],
    reply: ["Lecturer right of reply", "We publish replies after we verify the university connection and screen the text."],
  };

  return (
    <div className="case-page">
      <button className="back-link" onClick={() => onNavigate({ mode: "overview" })}>← Trust centre</button>
      <h2>{headings[mode][0]}</h2>
      <p className="trust-lead">{headings[mode][1]}</p>
      {mode !== "appeal" && !selectableReviews.length ? (
        <div className="no-cases"><FileText /><strong>There are no eligible reviews.</strong><p>You can act on published, held or rejected reviews.</p></div>
      ) : (
        <form className="case-form" onSubmit={submit}>
          {mode !== "appeal" && <label>Review<select value={reviewId} onChange={(event) => setReviewId(event.target.value)}>{selectableReviews.map((item) => <option value={item.id} key={item.id}>{reviewLabel(item, courses, lecturers)}</option>)}</select></label>}
          {mode === "appeal" && !linkedReportAppeal && <label>Private moderation receipt<input required minLength={20} maxLength={128} value={receipt} onChange={(event) => setReceipt(event.target.value)} placeholder="Paste the receipt shown after submission" /></label>}
          {linkedReportAppeal && <div className="urgent-note"><FileText /><span>We linked this appeal to the report you submitted.</span></div>}
          {mode === "report" && <label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option>Threat or immediate safety</option><option>Personal information or doxxing</option><option>Serious unverified allegation</option><option>Harassment or personal attack</option><option>Spam or manipulation</option><option>Other policy breach</option></select></label>}
          {mode === "reply" && <label>University email <span>kept private</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@university.edu.my" /></label>}
          {mode === "appeal" && <label>Contact email <span>optional and private</span><input type="email" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Use this address for appeal follow-up" /></label>}
          <label>{mode === "reply" ? "Proposed reply" : mode === "appeal" ? "Reason for changing the decision" : "Evidence and policy concern"}<textarea required minLength={mode === "report" ? 20 : 70} maxLength={1500} value={mode === "reply" ? body : details} onChange={(event) => mode === "reply" ? setBody(event.target.value) : setDetails(event.target.value)} /></label>
          {mode === "report" && <div className="urgent-note"><ShieldAlert /><span>The Core can hide a review when it detects a strong threat or personal-information signal. Other reports enter the queue without removing the review.</span></div>}
          <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
          {error && <p className="publish-error"><AlertTriangle />{error}</p>}
          <button className="button primary" disabled={submitting || !turnstileToken || (mode !== "appeal" && !reviewId) || (mode === "appeal" && !linkedReportAppeal && !receipt)}>{submitting ? "Evaluating…" : !turnstileToken ? "Complete anti-bot check" : mode === "report" ? "Send to the Core" : mode === "appeal" ? "Submit appeal" : "Submit reply"}<ArrowRight /></button>
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
        <footer className="trust-footer"><span>No account required. Public pages hide reviewer identities.</span><strong>No listed university operates or endorses KelasKita.</strong></footer>
      </section>
    </div>
  );
}
