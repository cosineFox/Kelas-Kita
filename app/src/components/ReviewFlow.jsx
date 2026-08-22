import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BookOpen,
  Check,
  ChevronDown,
  CircleCheck,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { courseDuplicates, lecturerDuplicates } from "../lib/catalog";
import { analyseFeedback } from "../lib/moderation";
import Turnstile from "./Turnstile";

const steps = ["Class", "Ratings", "Feedback", "Check"];
const blankCourse = { code: "", name: "", university: "", faculty: "" };

const Stars = ({ label, value, onChange }) => (
  <fieldset className="star-field">
    <legend>{label}</legend>
    <div className="stars" aria-label={`${label}: ${value || "not rated"}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          className={value >= star ? "selected" : ""}
          aria-label={`${star} out of 5`}
          onClick={() => onChange(star)}
        >{star}<span aria-hidden="true">★</span></button>
      ))}
    </div>
  </fieldset>
);

export default function ReviewFlow({
  courses,
  lecturers,
  assignments,
  reviews,
  onAddCourse,
  onAddLecturer,
  onPublish,
  onClose,
}) {
  const titleRef = useRef(null);
  const initialCourse = courses[0];
  const initialLecturer = lecturers.find((lecturer) =>
    assignments.some((link) => link.courseId === initialCourse?.id && link.lecturerId === lecturer.id),
  );
  const [step, setStep] = useState(0);
  const [courseQuery, setCourseQuery] = useState(initialCourse ? `${initialCourse.code} · ${initialCourse.name}` : "");
  const [courseMenu, setCourseMenu] = useState(true);
  const [addingCourse, setAddingCourse] = useState(false);
  const [newCourse, setNewCourse] = useState(blankCourse);
  const [addingLecturer, setAddingLecturer] = useState(false);
  const [newLecturer, setNewLecturer] = useState("");
  const [publishError, setPublishError] = useState("");
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [draft, setDraft] = useState({
    courseId: initialCourse?.id ?? "",
    lecturerId: initialLecturer?.id ?? "",
    semester: "",
    year: "2026",
    courseRating: 0,
    lecturerRating: 0,
    workload: "Balanced",
    body: "",
  });

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

  const selectedCourse = courses.find((course) => course.id === draft.courseId);
  const linkedLecturers = lecturers.filter((lecturer) =>
    assignments.some((link) => link.courseId === draft.courseId && link.lecturerId === lecturer.id),
  );
  const selectedLecturer = lecturers.find((lecturer) => lecturer.id === draft.lecturerId);
  const matches = useMemo(() => {
    const query = courseQuery.toLowerCase().replace("·", " ").trim();
    return courses.filter((course) => `${course.code} ${course.name} ${course.university}`.toLowerCase().includes(query)).slice(0, 5);
  }, [courseQuery, courses]);
  const duplicates = useMemo(() => courseDuplicates(newCourse, courses), [courses, newCourse]);
  const lecturerMatches = selectedCourse ? lecturerDuplicates(newLecturer, selectedCourse.university, lecturers) : [];
  const analysis = useMemo(() => analyseFeedback(draft.body, reviews), [draft.body, reviews]);

  const selectCourse = (course) => {
    const lecturerId = assignments.find((link) => link.courseId === course.id)?.lecturerId ?? "";
    setDraft((value) => ({ ...value, courseId: course.id, lecturerId }));
    setCourseQuery(`${course.code} · ${course.name}`);
    setCourseMenu(false);
    setAddingCourse(false);
  };

  const saveCourse = () => {
    if (Object.values(newCourse).some((value) => !value.trim()) || duplicates.length) return;
    const course = onAddCourse(newCourse);
    setNewCourse(blankCourse);
    selectCourse(course);
  };

  const saveLecturer = () => {
    if (!newLecturer.trim() || !draft.courseId) return;
    const lecturer = onAddLecturer(draft.courseId, newLecturer.trim());
    setDraft((value) => ({ ...value, lecturerId: lecturer.id }));
    setNewLecturer("");
    setAddingLecturer(false);
  };

  const canContinue =
    (step === 0 && draft.courseId && draft.lecturerId && draft.semester.trim() && draft.year) ||
    (step === 1 && draft.courseRating && draft.lecturerRating) ||
    (step === 2 && draft.body.trim().length >= 70) ||
    step === 3;

  const submit = async () => {
    setSubmitting(true);
    setPublishError("");
    const result = await onPublish(draft, turnstileToken);
    setSubmitting(false);
    if (result.ok) setSubmission(result);
    else {
      setPublishError(result.error);
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    }
  };

  if (submission) {
    const stateCopy = {
      held: ["We held your review.", "We keep the review and its ratings private. Send serious claims to your university’s reporting office."],
      pending: ["We queued your review.", "We keep the review and its ratings private until moderation finishes."],
      published: ["We published your review.", "Students can read it, and its ratings now count towards the course score."],
      rejected: ["We withheld your review.", "Qwen flagged a safety or privacy risk. Use your receipt to appeal."],
    }[submission.review.status];
    return (
      <div className="review-layer" role="dialog" aria-modal="true" aria-labelledby="success-title">
        <button className="review-scrim" aria-label="Close review" onClick={onClose} />
        <section className="review-sheet success-sheet">
          <div className="success-mark"><ShieldCheck /></div>
          <h2 id="success-title">{stateCopy[0]}</h2>
          <p>{stateCopy[1]}</p>
          <div className="success-checks"><span><Check /> We received it as pending</span><span><Check /> We excluded its ratings until publication</span><span><Bot /> Core action: {submission.decision.action.replaceAll("_", " ")}</span></div>
          {submission.receipt && <div className="moderation-receipt"><strong>Save your moderation receipt</strong><code>{submission.receipt}</code><small>Copy it now. You need it to appeal.</small></div>}
          <button className="button primary" onClick={onClose}>Back to courses <ArrowRight /></button>
        </section>
      </div>
    );
  }

  return (
    <div className="review-layer" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button className="review-scrim" aria-label="Close review" onClick={onClose} />
      <section className="review-sheet">
        <div className="ticket-edge" aria-hidden="true" />
        <header className="review-header">
          <div>
            <h2 id="review-title" ref={titleRef} tabIndex="-1">Write a useful review</h2>
            <p>Give details that students and teaching staff can use.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </header>

        <ol className="step-rail" aria-label="Review progress">
          {steps.map((label, index) => (
            <li key={label} className={index === step ? "active" : index < step ? "done" : ""}>
              <button type="button" onClick={() => index < step && setStep(index)} disabled={index > step}>
                <span>{index < step ? <Check /> : index + 1}</span>{label}
              </button>
            </li>
          ))}
        </ol>

        <div className="review-content">
          {step === 0 && (
            <div className="class-step">
              <div className="form-column">
                <label className="field-label" htmlFor="course-search">Course</label>
                <div className="combo-field">
                  <Search />
                  <input
                    id="course-search"
                    role="combobox"
                    aria-expanded={courseMenu}
                    aria-controls="course-options"
                    autoComplete="off"
                    value={courseQuery}
                    onFocus={() => setCourseMenu(true)}
                    onChange={(event) => { setCourseQuery(event.target.value); setCourseMenu(true); }}
                  />
                  <ChevronDown />
                </div>
                <button className="text-action" type="button" onClick={() => setAddingCourse((value) => !value)}>
                  {addingCourse ? "Cancel adding a course" : "Can’t find it? Add a course"}
                </button>

                {courseMenu && !addingCourse && (
                  <div className="combo-menu" id="course-options" role="listbox">
                    {(matches.length ? matches : courses.slice(0, 4)).map((course) => (
                      <button type="button" role="option" aria-selected={course.id === draft.courseId} key={course.id} onClick={() => selectCourse(course)}>
                        <BookOpen /><span><strong>{course.code} · {course.name}</strong><small>{course.university} · {course.faculty}</small></span>
                      </button>
                    ))}
                  </div>
                )}

                {addingCourse && (
                  <div className="add-form">
                    <div className="add-heading"><strong>Add a course</strong><span>We save it with your review.</span></div>
                    <div className="field-grid">
                      {[
                        ["code", "Course code", "e.g., COMP2013"],
                        ["name", "Course name", "e.g., Algorithms & Data Structures"],
                        ["university", "University", "Start typing to search"],
                        ["faculty", "Faculty", "Start typing to search"],
                      ].map(([key, label, placeholder]) => (
                        <label key={key}>{label}<input value={newCourse[key]} placeholder={placeholder} onChange={(event) => setNewCourse((value) => ({ ...value, [key]: event.target.value }))} /></label>
                      ))}
                    </div>
                    <div className={`duplicate-state ${duplicates.length ? "has-match" : ""}`}>
                      {duplicates.length ? <><AlertTriangle /><span><strong>Possible duplicate:</strong> {duplicates[0].course.code} · {duplicates[0].course.name}</span><button onClick={() => selectCourse(duplicates[0].course)}>Use existing</button></> : <><CircleCheck /><span>No close matches</span></>}
                    </div>
                    <button className="button secondary save-course" type="button" disabled={Object.values(newCourse).some((value) => !value.trim()) || duplicates.length > 0} onClick={saveCourse}>Save course</button>
                  </div>
                )}

                <div className="field-separator" />
                <span className="field-label">Lecturer for this course</span>
                <div className="lecturer-menu">
                  {linkedLecturers.map((lecturer) => (
                    <button type="button" key={lecturer.id} className={draft.lecturerId === lecturer.id ? "selected" : ""} onClick={() => setDraft((value) => ({ ...value, lecturerId: lecturer.id }))}>
                      <UserRound /><span><strong>{lecturer.name}</strong><small>Taught {selectedCourse?.code} · {selectedCourse?.name}</small></span>{draft.lecturerId === lecturer.id && <Check />}
                    </button>
                  ))}
                  <button type="button" className="add-lecturer" onClick={() => setAddingLecturer((value) => !value)}><Plus /> Add another lecturer</button>
                </div>
                {addingLecturer && (
                  <div className="inline-add">
                    <label>Lecturer name<input value={newLecturer} onChange={(event) => setNewLecturer(event.target.value)} placeholder="Include the title students use" /></label>
                    {lecturerMatches.length > 0 && <p><AlertTriangle /> A similar lecturer already exists: {lecturerMatches[0].name}</p>}
                    <button className="button secondary" onClick={saveLecturer} disabled={!newLecturer.trim()}>Save & link</button>
                  </div>
                )}

                <div className="two-fields">
                  <label>Study period<input required maxLength="40" value={draft.semester} onChange={(event) => setDraft((value) => ({ ...value, semester: event.target.value }))} placeholder="Semester 1, Trimester 2, Term 3…" /></label>
                  <label>Academic year begins<input required type="number" min="2000" max="2100" value={draft.year} onChange={(event) => setDraft((value) => ({ ...value, year: event.target.value }))} /></label>
                </div>
              </div>

              <aside className="relation-note">
                <h3>Adding a course</h3>
                <p>We compare course codes and lecturer names to prevent duplicates. We list new records after publication.</p>
                <div className="relation-map">
                  <div><strong>Course</strong><span>{selectedCourse?.code ?? "New course"}</span></div>
                  <span>taught by <ArrowRight /></span>
                  <div><strong>Multiple lecturers</strong><span>{linkedLecturers.length || "1+"} linked</span></div>
                </div>
                <div className="info-note"><CircleCheck /> You can add one course and link its lecturers in this review.</div>
              </aside>
            </div>
          )}

          {step === 1 && (
            <div className="rating-step">
              <div className="step-intro"><h3>Rate the course and lecturer.</h3><p>Give each one a separate score.</p></div>
              <div className="rating-panels">
                <div><span>Course</span><h4>{selectedCourse?.name}</h4><p>Materials, assessments and learning value.</p><Stars label="Course rating" value={draft.courseRating} onChange={(courseRating) => setDraft((value) => ({ ...value, courseRating }))} /></div>
                <div><span>Lecturer</span><h4>{selectedLecturer?.name}</h4><p>Clarity, support and feedback.</p><Stars label="Lecturer rating" value={draft.lecturerRating} onChange={(lecturerRating) => setDraft((value) => ({ ...value, lecturerRating }))} /></div>
              </div>
              <fieldset className="workload-field"><legend>Workload</legend>{["Light", "Balanced", "Heavy", "Extreme"].map((workload) => <button type="button" className={draft.workload === workload ? "selected" : ""} onClick={() => setDraft((value) => ({ ...value, workload }))} key={workload}>{workload}</button>)}</fieldset>
            </div>
          )}

          {step === 2 && (
            <div className="feedback-step">
              <div className="feedback-form">
                <div className="step-intro"><h3>Describe your experience.</h3><p>Say what happened and how it affected your learning.</p></div>
                <label htmlFor="feedback">Your feedback</label>
                <textarea id="feedback" value={draft.body} onChange={(event) => setDraft((value) => ({ ...value, body: event.target.value }))} placeholder="The lecturer used worked examples each week, which clarified difficult topics. I needed the project rubric before the first assignment." />
                <div className="writing-meta"><span>{draft.body.length} characters</span><span>Minimum 70</span></div>
                <div className="prompt-line"><strong>Useful details:</strong> assessment pace · feedback quality · class format · prerequisites</div>
              </div>
              <aside className="live-check">
                <h3><ShieldCheck /> Live safety check</h3>
                <p>We flag common problems as you type. Qwen checks the full review after submission.</p>
                {[
                  ["Threats", ["threat"]],
                  ["Personal attacks", ["attack"]],
                  ["Personal information", ["pii"]],
                  ["Serious allegations", ["grave"]],
                  ["Spam or copied text", ["links", "duplicate", "flooding"]],
                  ["Enough learning context", ["specificity"]],
                ].map(([label, ids]) => {
                  const issue = analysis.issues.find(({ id }) => ids.includes(id));
                  return <div key={label} className={`check-row ${issue ? issue.severity : "clear"}`}>{issue ? <AlertTriangle /> : <Check />}<span><strong>{label}</strong><small>{issue?.message ?? "Clear"}</small></span></div>;
                })}
                <div className="moderation-explainer"><LockKeyhole /> You can post without an account. We hide reviewer identities from public pages. Cloudflare and Vercel may keep security logs.</div>
              </aside>
            </div>
          )}

          {step === 3 && (
            <div className="check-step">
              <div className="step-intro"><h3>Review and submit.</h3><p>Qwen screens the text before we publish it or count its ratings.</p></div>
              <div className="review-summary">
                <dl><div><dt>Course</dt><dd>{selectedCourse?.code} · {selectedCourse?.name}</dd></div><div><dt>Lecturer</dt><dd>{selectedLecturer?.name}</dd></div><div><dt>Study period</dt><dd>{draft.semester} · {draft.year}</dd></div><div><dt>Ratings</dt><dd>Course {draft.courseRating}/5 · Lecturer {draft.lecturerRating}/5</dd></div></dl>
                <blockquote>{draft.body}</blockquote>
              </div>
              <div className="trust-queue"><ShieldCheck /><div><strong>We log each moderation decision</strong><p>Qwen flags risks, and the Core applies rules. Neither can verify facts or decide guilt.</p></div></div>
              {analysis.requiresHold && <div className="formal-report-warning"><AlertTriangle /><div><strong>We will hold this review.</strong><p>KelasKita cannot investigate serious misconduct. Send the claim to your university’s integrity or security office.</p></div></div>}
              {analysis.blockers.length > 0 && <div className="formal-report-warning"><AlertTriangle /><div><strong>We will withhold this draft.</strong><p>Remove threats, personal information, links and direct insults before submitting.</p></div></div>}
              <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
              {publishError && <p className="publish-error"><AlertTriangle />{publishError}</p>}
            </div>
          )}
        </div>

        <footer className="review-footer">
          <div className="privacy-note"><LockKeyhole /><span><strong>Post without an account.</strong> We hide reviewer identities, log moderation decisions and accept appeals.</span></div>
          <div className="footer-buttons">
            <button className="button secondary" onClick={() => step ? setStep((value) => value - 1) : onClose()}>Back</button>
            {step < 3 ? <button className="button primary" disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>Continue <ArrowRight /></button> : <button className="button primary" disabled={submitting || !turnstileToken} onClick={submit}>{submitting ? "Qwen is checking…" : turnstileToken ? "Submit review" : "Complete anti-bot check"} <ArrowRight /></button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
