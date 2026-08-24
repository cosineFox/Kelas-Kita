import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  ["experiment", "Moderation"],
  ["rules", "Rules"],
  ["privacy", "Privacy"],
  ["terms", "Terms"],
];

const reviewLabel = (review, courses, lecturers) => {
  const course = courses.find((item) => item.id === review.courseId);
  const lecturer = lecturers.find((item) => item.id === review.lecturerId);
  return `${course?.code ?? "Course"} · ${lecturer?.name ?? "Lecturer"}`;
};

function IllustratedIntro({ title, copy, image, tone }) {
  return (
    <header className="trust-section-intro">
      <div><h2>{title}</h2><p className="trust-lead">{copy}</p></div>
      <figure className={`trust-spot-art art-${tone}`} aria-hidden="true">
        <img src={image} alt="" width="640" height="426" loading="lazy" decoding="async" />
      </figure>
    </header>
  );
}

function Experiment() {
  return (
    <>
      <IllustratedIntro title="How moderation works" copy="Qwen checks the text for four risks. Fixed rules choose what happens next. Neither system can verify an allegation." image="/trust-art/moderation.png" tone="moderation" />
      <div className="core-map" aria-label="Moderation system architecture">
        <div className="agent-bank">
          <span><ShieldAlert /><strong>Threats</strong><small>Threats and harassment</small></span>
          <span><LockKeyhole /><strong>Personal data</strong><small>Doxxing and identifiers</small></span>
          <span><Scale /><strong>Serious claims</strong><small>Grave misconduct claims</small></span>
          <span><Bot /><strong>Spam</strong><small>Spam and manipulation</small></span>
        </div>
        <ArrowRight className="core-arrow" aria-hidden="true" />
        <div className="policy-core"><strong>Fixed rules</strong><span>Code chooses the action</span></div>
        <ArrowRight className="core-arrow" aria-hidden="true" />
        <div className="decision-bank"><span>Publish</span><span>Hold</span><span>Remove</span><span>Escalate</span></div>
      </div>
      <div className="boundary-note">
        <AlertTriangle />
        <div><strong>Qwen cannot fact-check claims.</strong><p>It cannot rule on defamation or decide guilt. We hold serious claims. Send them to your university’s reporting office.</p></div>
      </div>
      <h3>Review states</h3>
      <ol className="policy-steps">
        <li><span>01</span><p>A new review starts pending. Its ratings do not count.</p></li>
        <li><span>02</span><p>Qwen checks threats, personal data, serious claims and spam.</p></li>
        <li><span>03</span><p>Fixed rules publish, hold, remove or escalate the review.</p></li>
        <li><span>04</span><p>We record the reason. Reviewers can appeal.</p></li>
      </ol>
    </>
  );
}

function Rules() {
  return (
    <>
      <IllustratedIntro title="Rules" copy="Review the class and lecturer. Stick to what happened to you." image="/trust-art/rules.png" tone="rules" />
      <div className="rule-columns">
        <section><CircleCheck /><h3>Post this</h3><ul><li>Teaching clarity and class format</li><li>Assessment design and feedback timing</li><li>Workload and prerequisites</li><li>Events you experienced yourself</li></ul></section>
        <section><X /><h3>Do not post this</h3><ul><li>Threats, slurs and personal attacks</li><li>Phone numbers, addresses and identity numbers</li><li>Impersonation and coordinated ratings</li><li>Rumours presented as personal knowledge</li></ul></section>
      </div>
      <div className="formal-channel"><Scale /><div><strong>Report serious misconduct to your university.</strong><p>KelasKita cannot investigate crime, corruption, sexual misconduct or immediate danger.</p></div></div>
    </>
  );
}

function Privacy() {
  const operator = import.meta.env.VITE_OPERATOR_CONTACT_EMAIL;
  return (
    <>
      <IllustratedIntro title="Privacy" copy="You can post without an account. We omit reviewer identities from public pages. Cloudflare and Vercel keep technical records, and investigators may obtain them through legal process." image="/trust-art/privacy.png" tone="privacy" />
      <dl className="policy-list">
        <div><dt>AI processing</dt><dd>We send review and case text through Vercel AI Gateway to Qwen. We exclude contact details from those requests.</dd></div>
        <div><dt>Security logs</dt><dd>Cloudflare and Vercel may keep network and security logs. KelasKita stores rotating abuse-signal hashes instead of raw IP addresses.</dd></div>
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
      <IllustratedIntro title="Terms" copy="You must be 18 or older and write from your own academic experience." image="/trust-art/terms.png" tone="terms" />
      <ol className="terms-list">
        <li><strong>Write from experience.</strong><span>Do not submit rumours or claim to speak for another person.</span></li>
        <li><strong>This is not a complaint channel.</strong><span>Use your university’s formal process for serious misconduct.</span></li>
        <li><strong>We moderate submissions.</strong><span>We may screen, hold, redact, annotate or remove your submission under these rules.</span></li>
        <li><strong>You can appeal.</strong><span>Use reports and appeals to challenge a decision.</span></li>
        <li><strong>KelasKita is independent.</strong><span>No listed university operates or endorses KelasKita.</span></li>
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
          <button onClick={() => onNavigate({ mode: "report" })}><Flag /><span>Report</span></button>
          <button onClick={() => onNavigate({ mode: "reply" })}><MessageSquareReply /><span>Lecturer reply</span></button>
          <button onClick={() => onNavigate({ mode: "appeal" })}><RotateCcw /><span>Appeal</span></button>
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
        <h2>{mode === "report" ? "Report received." : mode === "appeal" ? "Appeal received." : "Reply received."}</h2>
        <p>{result.decision.summary}</p>
        <dl><div><dt>Initial action</dt><dd>{result.decision.action.replaceAll("_", " ")}</dd></div><div><dt>State</dt><dd>{result.decision.status}</dd></div><div><dt>Appealable</dt><dd>{result.decision.appealable ? "Yes" : "Not required"}</dd></div></dl>
        <div className="case-result-actions">
          {mode === "report" && <button className="button secondary" onClick={() => onNavigate({ mode: "appeal", reviewId, reportId: result.report.id })}>Appeal this decision</button>}
          <button className="button primary" onClick={() => onNavigate({ mode: "overview" })}>Back to moderation</button>
        </div>
      </div>
    );
  }

  const headings = {
    report: ["Report a review", "Qwen checks the report. We record the action and reason."],
    appeal: ["Appeal a decision", "The current decision stays in place while we review the appeal."],
    reply: ["Lecturer reply", "We verify your university email and check the reply before publication."],
  };

  return (
    <div className="case-page">
      <button className="back-link" onClick={() => onNavigate({ mode: "overview" })}>← Moderation</button>
      <h2>{headings[mode][0]}</h2>
      <p className="trust-lead">{headings[mode][1]}</p>
      {mode !== "appeal" && !selectableReviews.length ? (
        <div className="no-cases"><FileText /><strong>No reviews available.</strong><p>You can report or reply to a published, held or rejected review.</p></div>
      ) : (
        <form className="case-form" onSubmit={submit}>
          {mode !== "appeal" && <label>Review<select value={reviewId} onChange={(event) => setReviewId(event.target.value)}>{selectableReviews.map((item) => <option value={item.id} key={item.id}>{reviewLabel(item, courses, lecturers)}</option>)}</select></label>}
          {mode === "appeal" && !linkedReportAppeal && <label>Private moderation receipt<input required minLength={20} maxLength={128} value={receipt} onChange={(event) => setReceipt(event.target.value)} placeholder="Paste your receipt here" /></label>}
          {linkedReportAppeal && <div className="urgent-note"><FileText /><span>Report receipt linked.</span></div>}
          {mode === "report" && <label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option>Threat or immediate safety</option><option>Personal information or doxxing</option><option>Serious unverified allegation</option><option>Harassment or personal attack</option><option>Spam or manipulation</option><option>Other policy breach</option></select></label>}
          {mode === "reply" && <label>University email <span>kept private</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@university.edu.my" /></label>}
          {mode === "appeal" && <label>Contact email <span>optional and private</span><input type="email" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Use this address for appeal follow-up" /></label>}
          <label>{mode === "reply" ? "Proposed reply" : mode === "appeal" ? "Reason for changing the decision" : "Evidence and policy concern"}<textarea required minLength={mode === "report" ? 20 : 70} maxLength={1500} value={mode === "reply" ? body : details} onChange={(event) => mode === "reply" ? setBody(event.target.value) : setDetails(event.target.value)} /></label>
          {mode === "report" && <div className="urgent-note"><ShieldAlert /><span>The Core benches reviews with strong threat or personal-information flags. Other reports enter the queue without hiding the review.</span></div>}
          <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
          {error && <p className="publish-error"><AlertTriangle />{error}</p>}
          <button className="button primary" disabled={submitting || !turnstileToken || (mode !== "appeal" && !reviewId) || (mode === "appeal" && !linkedReportAppeal && !receipt)}>{submitting ? "Submitting…" : !turnstileToken ? "Complete anti-bot check" : mode === "report" ? "Submit report" : mode === "appeal" ? "Submit appeal" : "Submit reply"}<ArrowRight /></button>
        </form>
      )}
    </div>
  );
}

export default function TrustCentre({ context, courses, lecturers, reviews, onNavigate, onReport, onAppeal, onReply, onClose }) {
  const titleRef = useRef(null);
  const sheetRef = useRef(null);

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const origin = context.origin;
    if (!sheet || !origin) return;

    const rect = sheet.getBoundingClientRect();
    sheet.style.setProperty("--morph-x", `${origin.x - rect.left}px`);
    sheet.style.setProperty("--morph-y", `${origin.y - rect.top}px`);
    sheet.style.setProperty("--morph-scale-x", Math.max(origin.width / rect.width, 0.04));
    sheet.style.setProperty("--morph-scale-y", Math.max(origin.height / rect.height, 0.04));
  }, [context.origin]);

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
      <section ref={sheetRef} className={`trust-sheet${context.origin ? ` from-nav morph-${context.origin.tone}` : ""}`}>
        <header className="trust-header">
          <div><span ref={titleRef} id="trust-title" tabIndex="-1">KelasKita Bot Basement</span><small>Qwen + fixed rules</small></div>
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
