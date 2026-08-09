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
      <p className="trust-lead">KelasKita tests whether a small council of specialist AI roles and a fixed policy core can keep student feedback useful without publicly identifying reviewers or pretending to establish the truth.</p>
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
        <div><strong>The boundary matters.</strong><p>The agents classify observable risk. They never decide that an allegation is true, fraudulent, defamatory, or that a person is guilty. Serious claims are held and directed towards formal university reporting channels.</p></div>
      </div>
      <h3>How decisions work</h3>
      <ol className="policy-steps">
        <li><span>01</span><p>Every submission is stored as pending. Pending and held ratings do not affect public scores.</p></li>
        <li><span>02</span><p>Four specialist roles run in one moderation pass to keep cost and data sharing contained.</p></li>
        <li><span>03</span><p>Fixed rules—not free-form model prose—choose the initial action. Urgent privacy and safety risks can be hidden automatically.</p></li>
        <li><span>04</span><p>Every action receives reason codes, a private audit record, an appeal route and a human override.</p></li>
      </ol>
    </>
  );
}

function Rules() {
  return (
    <>
      <h2>Community rules</h2>
      <p className="trust-lead">Criticise the class and teaching plainly. Keep the account first-hand, specific and useful to the next student.</p>
      <div className="rule-columns">
        <section><CircleCheck /><h3>Useful here</h3><ul><li>Teaching clarity and class format</li><li>Assessment design and feedback timing</li><li>Workload, prerequisites and learning value</li><li>Specific experiences stated as your perspective</li></ul></section>
        <section><X /><h3>Not published</h3><ul><li>Threats, slurs or personal attacks</li><li>Phone numbers, addresses, identity numbers or private accounts</li><li>Impersonation, spam or coordinated ratings</li><li>Rumours presented as personal knowledge</li></ul></section>
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
      <p className="trust-lead">No account is required and reviewers are not publicly identified. That is not a promise of absolute anonymity.</p>
      <dl className="policy-list">
        <div><dt>Moderation processing</dt><dd>Review and moderation-case text is sent through Vercel AI Gateway to the configured model for risk classification. Contact details entered for appeals or replies are not included in that model request.</dd></div>
        <div><dt>Infrastructure records</dt><dd>Cloudflare and Vercel may process network and security logs. KelasKita’s application database should retain only rotating abuse-signal hashes, not raw IP addresses.</dd></div>
        <div><dt>30 days</dt><dd>Rotating abuse hashes and short-lived anti-spam signals.</dd></div>
        <div><dt>90 days</dt><dd>Rejected or withdrawn review text, allowing time for an appeal.</dd></div>
        <div><dt>12 months</dt><dd>Closed report and appeal records, plus minimal moderation audit metadata. Private follow-up contacts are cleared when the case closes.</dd></div>
        <div><dt>Until removal</dt><dd>Published reviews and replies remain available until removed under policy or the service closes.</dd></div>
      </dl>
      <p className="small-print">A valid court or regulatory request may require disclosure of records that still exist. The operator will publish final provider, cross-border transfer and contact details before public launch.</p>
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
        <li><strong>You permit publication and moderation.</strong><span>Submitted content may be screened, held, edited only for redaction, contextualised through notes or removed under these rules.</span></li>
        <li><strong>Decisions are experimental.</strong><span>Automated decisions may be wrong. Reports and appeals exist so they can be challenged.</span></li>
        <li><strong>No university affiliation.</strong><span>KelasKita is independent and is not endorsed by, operated by or officially connected with any listed university.</span></li>
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
    report: ["Report or request a takedown", "The agent council evaluates the content and the policy core makes an initial, logged decision."],
    appeal: ["Appeal a decision", "A separate review is queued. The original action stays in place until that review finishes."],
    reply: ["Lecturer right of reply", "Replies are not published until the university connection is verified and the text passes an independent check."],
  };

  return (
    <div className="case-page">
      <button className="back-link" onClick={() => onNavigate({ mode: "overview" })}>← Trust centre</button>
      <h2>{headings[mode][0]}</h2>
      <p className="trust-lead">{headings[mode][1]}</p>
      {mode !== "appeal" && !selectableReviews.length ? (
        <div className="no-cases"><FileText /><strong>No review is available for this action yet.</strong><p>Only published, held or rejected reviews can be reported, appealed or answered.</p></div>
      ) : (
        <form className="case-form" onSubmit={submit}>
          {mode !== "appeal" && <label>Review<select value={reviewId} onChange={(event) => setReviewId(event.target.value)}>{selectableReviews.map((item) => <option value={item.id} key={item.id}>{reviewLabel(item, courses, lecturers)}</option>)}</select></label>}
          {mode === "appeal" && !linkedReportAppeal && <label>Private moderation receipt<input required minLength={20} maxLength={128} value={receipt} onChange={(event) => setReceipt(event.target.value)} placeholder="Paste the receipt shown after submission" /></label>}
          {linkedReportAppeal && <div className="urgent-note"><FileText /><span>This appeal is privately linked to the report you just submitted.</span></div>}
          {mode === "report" && <label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option>Threat or immediate safety</option><option>Personal information or doxxing</option><option>Serious unverified allegation</option><option>Harassment or personal attack</option><option>Spam or manipulation</option><option>Other policy breach</option></select></label>}
          {mode === "reply" && <label>University email <span>kept private</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@university.edu.my" /></label>}
          {mode === "appeal" && <label>Contact email <span>optional and private</span><input type="email" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Only for follow-up on this appeal" /></label>}
          <label>{mode === "reply" ? "Proposed reply" : mode === "appeal" ? "Why should the decision change?" : "What should the Core consider?"}<textarea required minLength={mode === "report" ? 20 : 70} maxLength={1500} value={mode === "reply" ? body : details} onChange={(event) => mode === "reply" ? setBody(event.target.value) : setDetails(event.target.value)} /></label>
          {mode === "report" && <div className="urgent-note"><ShieldAlert /><span>Strong threat or personal-information signals can temporarily hide a review immediately. Other reports do not automatically remove criticism.</span></div>}
          <Turnstile action={`${mode}_submit`} onToken={setTurnstileToken} resetKey={turnstileReset} />
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
        <footer className="trust-footer"><span>No account required. Reviewers are not publicly identified.</span><strong>Independent and not affiliated with any listed university.</strong></footer>
      </section>
    </div>
  );
}
