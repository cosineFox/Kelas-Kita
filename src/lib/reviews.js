export const publishedReviews = (reviews) =>
  reviews.filter((review) => review.status === "published");

export const summariseCourse = (course, reviews) => {
  const accepted = publishedReviews(reviews)
    .filter((review) => review.courseId === course.id)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  const count = accepted.length;
  const average = (field) => count
    ? accepted.reduce((total, review) => total + review[field], 0) / count
    : 0;
  const distribution = (field) => [5, 4, 3, 2, 1].map((rating) => count
    ? Math.round(accepted.filter((review) => review[field] === rating).length / count * 100)
    : 0);

  return {
    ...course,
    excerpt: accepted[0]?.body ?? "Be the first to add useful context for this class.",
    workload: accepted[0]?.workload ?? "Not rated",
    ratings: {
      course: average("courseRating"),
      lecturer: average("lecturerRating"),
      count,
      courseDistribution: distribution("courseRating"),
      lecturerDistribution: distribution("lecturerRating"),
    },
  };
};
