import { useCallback, useEffect, useState } from "react";
import Discovery from "./components/Discovery";
import ModerationDashboard from "./components/ModerationDashboard";
import ParodyGate, { shouldShowParodyGate } from "./components/ParodyGate";
import ReviewFlow from "./components/ReviewFlow";
import TrustCentre from "./components/TrustCentre";
import { lecturerDuplicates, makeId } from "./lib/catalog";
import {
  loadPublicState,
  submitAppeal as postAppeal,
  submitReply as postReply,
  submitReport as postReport,
  submitReview as postReview,
} from "./lib/apiClient";

const emptyState = { courses: [], lecturers: [], assignments: [], reviews: [], submissionsOpen: false };

const normalisePublicState = (value = {}) => ({
  ...emptyState,
  ...value,
  courses: Array.isArray(value.courses) ? value.courses : [],
  lecturers: Array.isArray(value.lecturers) ? value.lecturers : [],
  assignments: Array.isArray(value.assignments) ? value.assignments : [],
  reviews: Array.isArray(value.reviews) ? value.reviews : [],
});

const message = (error) => error?.message ?? "The service is unavailable.";

export default function App() {
  const [data, setData] = useState(emptyState);
  const [serviceError, setServiceError] = useState("");
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState(() => window.location.pathname !== "/moderation" && shouldShowParodyGate());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [trustContext, setTrustContext] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setData(normalisePublicState(await loadPublicState()));
      setServiceError("");
    } catch (error) {
      setServiceError(message(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (window.location.pathname === "/moderation") return <ModerationDashboard />;

  const addCourse = (draft) => {
    const course = {
      ...draft,
      id: makeId("draft-course", `${draft.university}-${draft.code}`),
      level: "Undergraduate",
      temporary: true,
    };
    setData((value) => ({ ...value, courses: [course, ...value.courses] }));
    return course;
  };

  const addLecturer = (courseId, name) => {
    const course = data.courses.find((item) => item.id === courseId);
    const existing = lecturerDuplicates(name, course.university, data.lecturers)[0];
    const lecturer = existing ?? {
      id: makeId("draft-lecturer", name),
      name,
      university: course.university,
      temporary: true,
    };
    setData((value) => ({
      ...value,
      lecturers: existing ? value.lecturers : [lecturer, ...value.lecturers],
      assignments: value.assignments.some((item) => item.courseId === courseId && item.lecturerId === lecturer.id)
        ? value.assignments
        : [...value.assignments, { courseId, lecturerId: lecturer.id }],
    }));
    return lecturer;
  };

  const submitReview = async (draft, turnstileToken) => {
    const course = data.courses.find((item) => item.id === draft.courseId);
    const lecturer = data.lecturers.find((item) => item.id === draft.lecturerId);
    if (!course || !lecturer) return { ok: false, error: "Select a course and lecturer before submitting." };

    try {
      const result = await postReview({
        ...draft,
        course: { code: course.code, name: course.name, university: course.university, faculty: course.faculty },
        lecturer: { name: lecturer.name },
        turnstileToken,
      });
      await refresh();
      return result;
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  };

  const submitReport = async (input, turnstileToken) => {
    try {
      const result = await postReport({ ...input, turnstileToken });
      await refresh();
      return result;
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  };

  const submitAppeal = async (input, turnstileToken) => {
    try { return await postAppeal({ ...input, turnstileToken }); }
    catch (error) { return { ok: false, error: message(error) }; }
  };

  const submitReply = async (input, turnstileToken) => {
    try { return await postReply({ ...input, turnstileToken }); }
    catch (error) { return { ok: false, error: message(error) }; }
  };

  const contentOverlayOpen = reviewOpen || Boolean(trustContext);
  const interactionBlocked = gateOpen || contentOverlayOpen;
  return (
    <>
      <ParodyGate open={gateOpen} onClose={() => setGateOpen(false)} />
      <div className={contentOverlayOpen ? "app-underlay is-dimmed" : "app-underlay"} aria-hidden={interactionBlocked || undefined} inert={interactionBlocked ? "" : undefined}>
        <Discovery
          {...data}
          loading={loading}
          serviceError={serviceError}
          onReview={() => setReviewOpen(true)}
          onTrust={(context = { mode: "overview" }) => setTrustContext(context)}
        />
      </div>
      {reviewOpen && (
        <ReviewFlow
          {...data}
          onAddCourse={addCourse}
          onAddLecturer={addLecturer}
          onPublish={submitReview}
          onClose={() => setReviewOpen(false)}
        />
      )}
      {trustContext && (
        <TrustCentre
          key={`${trustContext.mode ?? "overview"}-${trustContext.reviewId ?? "none"}-${trustContext.reportId ?? "none"}-${trustContext.tab ?? "default"}`}
          context={trustContext}
          courses={data.courses}
          lecturers={data.lecturers}
          reviews={data.reviews}
          onNavigate={setTrustContext}
          onReport={submitReport}
          onAppeal={submitAppeal}
          onReply={submitReply}
          onClose={() => setTrustContext(null)}
        />
      )}
    </>
  );
}
