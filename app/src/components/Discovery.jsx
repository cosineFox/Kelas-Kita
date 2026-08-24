import { useMemo, useState } from "react";
import {
  Bot,
  Clock3,
  Flag,
  MessageSquareReply,
  PenLine,
  Quote,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { publishedReviews, summariseCourse } from "../lib/reviews";

const memes = [
  {
    image: "/memes/deadline-panic.jpg",
    alt: "A panicked student facing a huge stack of assignment papers",
    top: "Me: I'll start the assignment early",
    bottom: "Also me at 11:58 PM",
  },
  {
    image: "/memes/not-in-exam.jpg",
    alt: "A lecturer erasing a board packed with equations",
    top: "Lecturer: this won't be in the exam",
    bottom: "The exam:",
  },
  {
    image: "/memes/workload-final-boss.jpg",
    alt: "A small course outline facing a monster made from books and calendars",
    top: "Course outline: 3 credit hours",
    bottom: "Actual workload: final boss",
  },
];

const RatingBlock = ({ distribution, label, value, count }) => (
  <div className="rating-block" aria-label={count ? `${label} rating ${value.toFixed(1)} out of 5` : `${label} not yet rated`}>
    <span>{label}</span>
    <strong><i>[</i>{count ? value.toFixed(1) : "N/A"}<i>]</i></strong>
    <div className="rating-bars" aria-hidden="true">
      {distribution.map((width, index) => <span key={5 - index}><small>{5 - index}</small><i><b style={{ width: `${width}%` }} /></i></span>)}
    </div>
  </div>
);

function CourseRow({ course, lecturer, active, onToggle }) {
  return (
    <article className={`course-row ${active ? "is-active" : ""}`}>
      <button className="row-main" onClick={onToggle} aria-expanded={active}>
        <div className="course-title">
          <span className="course-code">{course.code} · {course.level}</span>
          <h3>{course.name}</h3>
          <p>{course.university} · {course.faculty}</p>
          <div className="course-meta">
            <span><Clock3 /> Workload: <b>{course.workload}</b></span>
            <span><UsersRound /> {course.ratings.count} yaps</span>
          </div>
        </div>
        <div className="rating-pair">
          <RatingBlock label="Class aura" value={course.ratings.course} count={course.ratings.count} distribution={course.ratings.courseDistribution} />
          <RatingBlock label="Lecturer aura" value={course.ratings.lecturer} count={course.ratings.count} distribution={course.ratings.lecturerDistribution} />
        </div>
        <div className="lecturer-quote">
          <strong>{lecturer?.name ?? "Mystery lecturer"}</strong>
          <p><Quote />{course.excerpt}</p>
        </div>
      </button>
      {active && (
        <div className="row-detail">
          <span>{course.ratings.count ? `${course.ratings.count} published ${course.ratings.count === 1 ? "review" : "reviews"}. Pending and held yaps do not touch the score.` : "Zero published yaps. Pending submissions do not touch the score."}</span>
        </div>
      )}
    </article>
  );
}

export default function Discovery({ courses, lecturers, assignments, reviews, submissionsOpen, loading, serviceError, onReview, onTrust }) {
  const [query, setQuery] = useState("");
  const [activeCourse, setActiveCourse] = useState(null);

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
          <a className="active" href="#explore">Class board</a>
          <button onClick={() => onTrust({ mode: "overview", tab: "rules" })}>Don't be weird</button>
          <button onClick={() => onTrust({ mode: "overview" })}>How the bot cooks</button>
        </nav>
        <div className="header-actions">
          <button className="mobile-trust-button" onClick={() => onTrust({ mode: "overview" })} aria-label="Trust centre">
            <ShieldCheck aria-hidden="true" />
          </button>
          <button className="button primary" disabled={!submissionsOpen} onClick={onReview}><PenLine /> Start yapping</button>
          <span className="no-account">{submissionsOpen ? "yap portal open" : "yap portal closed"}</span>
        </div>
      </header>

      <main id="top">
        {serviceError && <div className="service-status" role="status"><ShieldCheck /><span><strong>The backend is cooked.</strong> {serviceError} Nothing you submit here will save.</span></div>}
        {!loading && !serviceError && !submissionsOpen && <div className="service-status" role="status"><ShieldCheck /><span><strong>The yap portal is locked.</strong> Lurk for now.</span></div>}
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-sticker">student takes with Qwen opp-checking included</span>
            <h1>Clock the class<br /><span>before it clocks you.</span></h1>
            <p>Find out if the workload is cooked, the teaching hits, or the assessments are straight academic warfare before you lock in.</p>
            <label className="search-box">
              <Search aria-hidden="true" />
              <span className="sr-only">Search courses, lecturers, or universities</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the academic opp list"
              />
              {query && <kbd>{filtered.length} found</kbd>}
            </label>
          </div>
        </section>

        <section className="explore-layout" id="explore">
          <div className="results">
            <div className="results-heading">
              <div><h2>{query ? "Opps located" : "The class board"}</h2></div>
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
                  <div className="empty-copy"><Search /><h3>{loading ? "Loading the academic DLC" : query ? "No opps found" : "The board has zero aura"}</h3><p>{loading ? "Fetching classes and published yaps." : submissionsOpen ? "Add the class with your review. It appears after moderation." : "Posting is locked. Lurk for now."}</p>{!loading && submissionsOpen && <button className="button primary" onClick={onReview}>{query ? "Spawn this class" : "Drop the first yap"}</button>}</div>
                </div>
              )}
            </div>
            <div className="moderation-banner">
              <Bot />
              <span>Qwen checks whether your yap contains threats, personal data, serious allegations or spam. The Core then applies the rules.</span>
              <button onClick={() => onTrust({ mode: "overview" })}>Enter the bot basement</button>
            </div>

            <section className="meme-section" aria-labelledby="meme-heading">
              <header>
                <div><span>zero academic citations</span><h2 id="meme-heading">Academic brainrot archive</h2></div>
                <p>Original campus specimens. No stolen templates.</p>
              </header>
              <div className="meme-wall">
                {memes.map((meme) => (
                  <figure className="meme-scrap" key={meme.image}>
                    <figcaption className="meme-top">{meme.top}</figcaption>
                    <img src={meme.image} alt={meme.alt} width="960" height="720" loading="lazy" />
                    <figcaption className="meme-bottom">{meme.bottom}</figcaption>
                  </figure>
                ))}
              </div>
            </section>

            <section className="recent-section">
              <div className="results-heading"><div><h2>Fresh yaps</h2></div></div>
              <div className="recent-table" role="table" aria-label="Latest course reviews">
                {!recent.length && <p className="recent-empty">The group chat has said nothing.</p>}
                {recent.map((review) => {
                  const course = courses.find((item) => item.id === review.courseId);
                  const lecturer = lecturers.find((item) => item.id === review.lecturerId);
                  if (!course) return null;
                  return (
                    <div className="recent-row" role="row" key={review.id}>
                      <div><strong>{course.name}</strong><small>{course.code}</small></div>
                      <span>{lecturer?.name ?? "Lecturer TBA"}</span>
                      <p>{review.body}</p>
                      <div className="review-actions"><button onClick={() => onTrust({ mode: "report", reviewId: review.id })}><Flag /> Snitch</button><button onClick={() => onTrust({ mode: "reply", reviewId: review.id })}><MessageSquareReply /> Reply</button></div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </section>
      </main>

      <footer><span>© 2026 KelasKita · Independent, unserious and not endorsed by any listed university.</span><nav><button onClick={() => onTrust({ mode: "overview", tab: "rules" })}>Don't be weird</button><button onClick={() => onTrust({ mode: "overview", tab: "privacy" })}>Privacy stuff</button><button onClick={() => onTrust({ mode: "overview", tab: "terms" })}>Actual terms</button><a href="#top">Beam up</a></nav></footer>
    </div>
  );
}
