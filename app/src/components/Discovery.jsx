import { useMemo, useState } from "react";
import {
  Bot,
  Bookmark,
  BookmarkCheck,
  Clock3,
  Flag,
  MessageSquareReply,
  PenLine,
  Quote,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { publishedReviews, summariseCourse } from "../lib/reviews";

const RatingBlock = ({ distribution, label, value, count }) => (
  <div className="rating-block" aria-label={count ? `${label} rating ${value.toFixed(1)} out of 5` : `${label} not yet rated`}>
    <span>{label}</span>
    <strong><i>[</i>{count ? value.toFixed(1) : "—"}<i>]</i></strong>
    <div className="rating-bars" aria-hidden="true">
      {distribution.map((width, index) => <span key={5 - index}><small>{5 - index}</small><i><b style={{ width: `${width}%` }} /></i></span>)}
    </div>
  </div>
);

function CourseRow({ course, lecturer, active, onToggle }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className={`course-row ${active ? "is-active" : ""}`}>
      <button className="row-main" onClick={onToggle} aria-expanded={active}>
        <div className="course-title">
          <Bookmark className="course-glyph" aria-hidden="true" />
          <span className="course-code">{course.code} · {course.level}</span>
          <h3>{course.name}</h3>
          <p>{course.university} · {course.faculty}</p>
          <div className="course-meta">
            <span><Clock3 /> Workload: <b>{course.workload}</b></span>
            <span><UsersRound /> {course.ratings.count} reviews</span>
          </div>
        </div>
        <div className="rating-pair">
          <RatingBlock label="Course" value={course.ratings.course} count={course.ratings.count} distribution={course.ratings.courseDistribution} />
          <RatingBlock label="Lecturer" value={course.ratings.lecturer} count={course.ratings.count} distribution={course.ratings.lecturerDistribution} />
        </div>
        <div className="lecturer-quote">
          <strong>{lecturer?.name ?? "Lecturer not listed"}</strong>
          <p><Quote />{course.excerpt}</p>
        </div>
      </button>
      <button
        className="bookmark-btn"
        aria-label={saved ? "Remove bookmark" : `Bookmark ${course.name}`}
        aria-pressed={saved}
        onClick={() => setSaved((value) => !value)}
      >
        {saved ? <BookmarkCheck /> : <Bookmark />}
      </button>
      {active && (
        <div className="row-detail">
          <span>{course.ratings.count ? `${course.ratings.count} published ${course.ratings.count === 1 ? "review" : "reviews"}. Pending and held submissions do not affect this score.` : "No published reviews yet. Pending submissions do not affect this course."}</span>
        </div>
      )}
    </article>
  );
}

export default function Discovery({ courses, lecturers, assignments, reviews, submissionsOpen, loading, serviceError, onReview, onTrust }) {
  const [query, setQuery] = useState("");
  const [activeCourse, setActiveCourse] = useState(null);
  const [engineeringOnly, setEngineeringOnly] = useState(true);

  const lecturerFor = (courseId) => {
    const link = assignments.find((item) => item.courseId === courseId);
    return lecturers.find((lecturer) => lecturer.id === link?.lecturerId);
  };

  const directory = useMemo(() => courses.map((course) => summariseCourse(course, reviews)), [courses, reviews]);

  const filtered = useMemo(() => {
    const value = query.toLowerCase().trim();
    if (!value) return directory;
    return directory.filter((course) => {
      const names = assignments
        .filter((item) => item.courseId === course.id)
        .map((item) => lecturers.find((lecturer) => lecturer.id === item.lecturerId)?.name)
        .join(" ");
      return `${course.code} ${course.name} ${course.university} ${names}`.toLowerCase().includes(value);
    });
  }, [assignments, directory, lecturers, query]);

  const recent = publishedReviews(reviews).reverse().slice(0, 4);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="KelasKita home">
          <span className="logo-mark">KK</span><span>KelasKita</span>
        </a>
        <nav aria-label="Primary navigation">
          <a className="active" href="#explore">The class pile</a>
          <button onClick={() => onTrust({ mode: "overview", tab: "rules" })}>Community rules</button>
          <button onClick={() => onTrust({ mode: "overview" })}>Boring but important</button>
        </nav>
        <div className="header-actions">
          <button className="mobile-trust-button" onClick={() => onTrust({ mode: "overview" })} aria-label="Trust centre">
            <ShieldCheck aria-hidden="true" />
          </button>
          <button className="button primary" disabled={!submissionsOpen} onClick={onReview}><PenLine /> Drop a review</button>
          <span className="no-account">{submissionsOpen ? "posting is open" : "posting is paused"}</span>
        </div>
      </header>

      <main id="top">
        {serviceError && <div className="service-status" role="status"><ShieldCheck /><span><strong>The doors are still locked.</strong> {serviceError} No records are being kept in this browser.</span></div>}
        {!loading && !serviceError && !submissionsOpen && <div className="service-status" role="status"><ShieldCheck /><span><strong>Look, don’t touch mode.</strong> The operator has paused new submissions.</span></div>}
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-sticker">student lore, now peer reviewed*</span>
            <h1>Pick a class.<br />Dodge a <span>character arc.</span></h1>
            <p>Course reviews, workload warnings, and teaching lore—moderated by robots on a very short leash.</p>
            <label className="search-box">
              <Search aria-hidden="true" />
              <span className="sr-only">Search courses, lecturers, or universities</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the academic rumour mill…"
              />
              {query && <kbd>{filtered.length} found</kbd>}
            </label>
          </div>
        </section>

        <section className="explore-layout" id="explore">
          <aside className="filters" aria-label="Course filters">
            <div className="filters-title"><SlidersHorizontal /><h2>Narrow the chaos</h2><button>Reset</button></div>
            <label>University<select><option>All universities</option></select></label>
            <label>Faculty<select><option>Engineering</option><option>All faculties</option></select></label>
            <fieldset>
              <legend>Level</legend>
              <label><input type="checkbox" /> All levels</label>
              <label><input type="checkbox" checked={engineeringOnly} onChange={(event) => setEngineeringOnly(event.target.checked)} /> Undergraduate</label>
              <label><input type="checkbox" /> Postgraduate</label>
            </fieldset>
          </aside>

          <div className="results">
            <div className="results-heading">
              <div><h2>{query ? "Things matching that" : courses.length ? "Currently causing discourse" : "The class pile"}</h2></div>
              <label>Sort by:<select><option>Most reviews</option><option>Highest rated</option><option>Recently reviewed</option></select></label>
            </div>
            <div className="course-list">
              {filtered.length ? filtered.slice(0, query ? 6 : 3).map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  lecturer={lecturerFor(course.id)}
                  active={activeCourse === course.id}
                  onToggle={() => setActiveCourse((id) => id === course.id ? null : course.id)}
                />
              )) : (
                <div className="empty-state">
                  <div className="empty-pin-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div>
                  <div className="empty-copy"><Search /><h3>{loading ? "Shuffling the paperwork" : query ? "Nothing. Suspicious." : "Nothing pinned yet"}</h3><p>{loading ? "Fetching the public catalogue and published reviews…" : submissionsOpen ? "Pin a course with a pending review and future students can find it here." : "Zero courses, zero fake activity. New pins appear when submissions reopen."}</p>{!loading && submissionsOpen && <button className="button primary" onClick={onReview}>{query ? "Add it in a review" : "Pin the first course"}</button>}</div>
                </div>
              )}
            </div>
            <div className="moderation-banner">
              <Bot />
              <span>Every review waits backstage. Tiny specialist robots flag trouble; boring fixed rules make the call.</span>
              <button onClick={() => onTrust({ mode: "overview" })}>Inspect the robot basement</button>
            </div>

            <section className="recent-section">
              <div className="results-heading"><div><h2>Fresh from the group chat</h2></div></div>
              <div className="recent-table" role="table" aria-label="Recently reviewed courses">
                {!recent.length && <p className="recent-empty">Nobody has submitted the sacred paragraph yet.</p>}
                {recent.map((review) => {
                  const course = courses.find((item) => item.id === review.courseId);
                  const lecturer = lecturers.find((item) => item.id === review.lecturerId);
                  if (!course) return null;
                  return (
                    <div className="recent-row" role="row" key={review.id}>
                      <div><strong>{course.name}</strong><small>{course.code}</small></div>
                      <span>{lecturer?.name ?? "Lecturer pending"}</span>
                      <p>{review.body}</p>
                      <div className="review-actions"><button onClick={() => onTrust({ mode: "report", reviewId: review.id })}><Flag /> Report</button><button onClick={() => onTrust({ mode: "reply", reviewId: review.id })}><MessageSquareReply /> Reply</button></div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </section>
      </main>

      <footer><span>© 2026 KelasKita · Student-built, robot-supervised, not affiliated with any listed university.</span><nav><button onClick={() => onTrust({ mode: "overview", tab: "rules" })}>Rules</button><button onClick={() => onTrust({ mode: "overview", tab: "privacy" })}>Privacy</button><button onClick={() => onTrust({ mode: "overview", tab: "terms" })}>Legal-ish</button><a href="#top">Beam me up</a></nav></footer>
    </div>
  );
}
