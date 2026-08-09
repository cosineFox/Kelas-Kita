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
    semester: "Semester 2",
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
    (step === 0 && draft.courseId && draft.lecturerId) ||
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
      held: ["Held for specialist review.", "It is not public and does not affect ratings. Serious claims should also be reported through the university’s official channel."],
      pending: ["Waiting for the agent council.", "It remains private and does not affect ratings until the Core reaches a decision."],
      published: ["Screened and published.", "The review now appears publicly and its ratings are included in the course score."],
      rejected: ["Not published.", "The Core detected an urgent safety or privacy issue. You may challenge this through the appeal route."],
    }[submission.review.status];
    return (
      <div className="review-layer" role="dialog" aria-modal="true" aria-labelledby="success-title">
        <button className="review-scrim" aria-label="Close review" onClick={onClose} />
        <section className="review-sheet success-sheet">
          <div className="success-mark"><ShieldCheck /></div>
          <h2 id="success-title">{stateCopy[0]}</h2>
          <p>{stateCopy[1]}</p>
          <div className="success-checks"><span><Check /> Began as pending</span><span><Check /> Ratings excluded until publication</span><span><Bot /> Core action: {submission.decision.action.replaceAll("_", " ")}</span></div>
          {submission.receipt && <div className="moderation-receipt"><strong>Save your private moderation receipt</strong><code>{submission.receipt}</code><small>It is shown once and can support a future appeal. Do not post it publicly.</small></div>}
          <button className="button primary" onClick={onClose}>Back to Explore <ArrowRight /></button>
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
            <p>Specific feedback helps the next student — and the teaching team.</p>
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
                    <div className="add-heading"><strong>Or add a course</strong><span>Staged now; committed with this review.</span></div>
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
                      {duplicates.length ? <><AlertTriangle /><span><strong>Possible duplicate:</strong> {duplicates[0].course.code} · {duplicates[0].course.name}</span><button onClick={() => selectCourse(duplicates[0].course)}>Use existing</button></> : <><CircleCheck /><span>No close duplicate found</span></>}
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
                    <label>Lecturer name<input value={newLecturer} onChange={(event) => setNewLecturer(event.target.value)} placeholder="Include title if commonly used" /></label>
                    {lecturerMatches.length > 0 && <p><AlertTriangle /> A similar lecturer already exists: {lecturerMatches[0].name}</p>}
                    <button className="button secondary" onClick={saveLecturer} disabled={!newLecturer.trim()}>Save & link</button>
                  </div>
                )}

                <div className="two-fields">
                  <label>Semester<select value={draft.semester} onChange={(event) => setDraft((value) => ({ ...value, semester: event.target.value }))}><option>Semester 1</option><option>Semester 2</option><option>Summer</option></select></label>
                  <label>Year<select value={draft.year} onChange={(event) => setDraft((value) => ({ ...value, year: event.target.value }))}><option>2026</option><option>2025</option><option>2024</option></select></label>
                </div>
              </div>

              <aside className="relation-note">
                <h3>What happens to additions?</h3>
                <p>We check course codes, aliases, and lecturer names for duplicates. New records are committed with the pending review and then remain selectable.</p>
                <div className="relation-map">
                  <div><strong>Course</strong><span>{selectedCourse?.code ?? "New course"}</span></div>
                  <span>taught by <ArrowRight /></span>
                  <div><strong>Multiple lecturers</strong><span>{linkedLecturers.length || "1+"} linked</span></div>
                </div>
                <div className="info-note"><CircleCheck /> You can add a course once. It will be available for other students to select later.</div>
              </aside>
            </div>
          )}

          {step === 1 && (
            <div className="rating-step">
              <div className="step-intro"><h3>Rate the class, not the mood.</h3><p>Separate the course design from the lecturer’s delivery. Both can be true at once.</p></div>
              <div className="rating-panels">
                <div><span>Course</span><h4>{selectedCourse?.name}</h4><p>Materials, assessments, structure, and learning value.</p><Stars label="Course rating" value={draft.courseRating} onChange={(courseRating) => setDraft((value) => ({ ...value, courseRating }))} /></div>
                <div><span>Lecturer</span><h4>{selectedLecturer?.name}</h4><p>Clarity, support, feedback, and delivery.</p><Stars label="Lecturer rating" value={draft.lecturerRating} onChange={(lecturerRating) => setDraft((value) => ({ ...value, lecturerRating }))} /></div>
              </div>
              <fieldset className="workload-field"><legend>How did the workload feel?</legend>{["Light", "Balanced", "Heavy", "Extreme"].map((workload) => <button type="button" className={draft.workload === workload ? "selected" : ""} onClick={() => setDraft((value) => ({ ...value, workload }))} key={workload}>{workload}</button>)}</fieldset>
            </div>
          )}

          {step === 2 && (
            <div className="feedback-step">
              <div className="feedback-form">
                <div className="step-intro"><h3>Give the next student context.</h3><p>What happened, when did it matter, and how did it affect learning?</p></div>
                <label htmlFor="feedback">Your feedback</label>
                <textarea id="feedback" value={draft.body} onChange={(event) => setDraft((value) => ({ ...value, body: event.target.value }))} placeholder="For example: Weekly worked examples made difficult topics easier to apply. Publishing the project rubric earlier would improve preparation…" />
                <div className="writing-meta"><span>{draft.body.length} characters</span><span>Minimum 70</span></div>
                <div className="prompt-line"><strong>Useful details:</strong> assessment pace · feedback quality · class format · prerequisites</div>
              </div>
              <aside className="live-check">
                <h3><ShieldCheck /> Live safety check</h3>
                <p>Quick checks run here. The moderation council runs after submission.</p>
                {[
                  ["Threats", ["threat"]],
                  ["Personal attacks", ["attack"]],
                  ["Personal information", ["pii"]],
                  ["Serious allegations", ["grave"]],
                  ["Spam or copied text", ["links", "duplicate", "flooding"]],
                  ["Enough learning context", ["specificity"]],
                ].map(([label, ids]) => {
                  const issue = analysis.issues.find(({ id }) => ids.includes(id));
                  return <div key={label} className={`check-row ${issue ? issue.severity : "clear"}`}>{issue ? <AlertTriangle /> : <Check />}<span><strong>{label}</strong><small>{issue?.message ?? "No issue detected"}</small></span></div>;
                })}
                <div className="moderation-explainer"><LockKeyhole /> No account is required and reviewers are not publicly identified. Infrastructure providers may still process security records.</div>
              </aside>
            </div>
          )}

          {step === 3 && (
            <div className="check-step">
              <div className="step-intro"><h3>Check the context, then send.</h3><p>Your review enters a trust queue before it affects public scores.</p></div>
              <div className="review-summary">
                <dl><div><dt>Course</dt><dd>{selectedCourse?.code} · {selectedCourse?.name}</dd></div><div><dt>Lecturer</dt><dd>{selectedLecturer?.name}</dd></div><div><dt>Term</dt><dd>{draft.semester}, {draft.year}</dd></div><div><dt>Ratings</dt><dd>Course {draft.courseRating}/5 · Lecturer {draft.lecturerRating}/5</dd></div></dl>
                <blockquote>{draft.body}</blockquote>
              </div>
              <div className="trust-queue"><ShieldCheck /><div><strong>Screened, logged and appealable</strong><p>Strong criticism stays allowed. The agents classify risk; the Core never declares an allegation true, defamatory or proof of guilt.</p></div></div>
              {analysis.requiresHold && <div className="formal-report-warning"><AlertTriangle /><div><strong>This review will be held.</strong><p>KelasKita cannot investigate serious misconduct. Please also use your university’s integrity, student-support or security reporting channel.</p></div></div>}
              {analysis.blockers.length > 0 && <div className="formal-report-warning"><AlertTriangle /><div><strong>This text is likely to be withheld.</strong><p>Remove threats, personal information, links and direct insults if you want the teaching feedback considered for publication.</p></div></div>}
              <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
              {publishError && <p className="publish-error"><AlertTriangle />{publishError}</p>}
            </div>
          )}
        </div>

        <footer className="review-footer">
          <div className="privacy-note"><LockKeyhole /><span><strong>No account required.</strong> Reviewers are not publicly identified; automated decisions are recorded and can be appealed.</span></div>
          <div className="footer-buttons">
            <button className="button secondary" onClick={() => step ? setStep((value) => value - 1) : onClose()}>Back</button>
            {step < 3 ? <button className="button primary" disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>Continue <ArrowRight /></button> : <button className="button primary" disabled={submitting || !turnstileToken} onClick={submit}>{submitting ? "Core is evaluating…" : turnstileToken ? "Submit for review" : "Complete anti-bot check"} <ArrowRight /></button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
