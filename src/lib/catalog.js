export const normalise = (value = "") =>
  value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

const compact = (value) => normalise(value).replaceAll(" ", "");
const personName = (value) => normalise(value).replace(/\b(dr|prof|professor|mr|mrs|ms)\b/g, "").trim();
const words = (value) => new Set(normalise(value).split(" ").filter(Boolean));

export const similarity = (left, right) => {
  const a = words(left);
  const b = words(right);
  const union = new Set([...a, ...b]);
  return union.size ? [...a].filter((word) => b.has(word)).length / union.size : 0;
};

export const courseDuplicates = (draft, courses) =>
  courses
    .map((course) => ({
      course,
      exactCode:
        normalise(course.university) === normalise(draft.university) &&
        compact(course.code) === compact(draft.code),
      score: similarity(`${course.code} ${course.name}`, `${draft.code} ${draft.name}`),
    }))
    .filter(({ exactCode, score }) => exactCode || score >= 0.72)
    .sort((a, b) => Number(b.exactCode) - Number(a.exactCode) || b.score - a.score);

export const lecturerDuplicates = (name, university, lecturers) =>
  lecturers.filter(
    (lecturer) =>
      normalise(lecturer.university) === normalise(university) &&
      (personName(lecturer.name) === personName(name) || similarity(lecturer.name, name) >= 0.8),
  );

export const makeId = (prefix, value) =>
  `${prefix}-${normalise(value).replaceAll(" ", "-")}-${Date.now().toString(36)}`;
