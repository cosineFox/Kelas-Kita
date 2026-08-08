create extension if not exists citext;
create extension if not exists pgcrypto;

create type catalog_state as enum ('pending', 'active', 'merged', 'hidden', 'rejected');
create type moderation_state as enum ('pending', 'published', 'held', 'rejected', 'removed');
create type case_state as enum ('pending', 'resolved', 'appealed', 'closed');
create type moderation_action as enum (
  'publish', 'queue', 'hold', 'reject', 'hide', 'no_action',
  'escalate', 'remove', 'restore', 'dismiss'
);
create type moderation_kind as enum ('review', 'report', 'appeal', 'reply', 'human_override');
create type job_state as enum ('queued', 'running', 'retry', 'complete', 'dead');

create table universities (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  domain citext unique
);

create table faculties (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references universities on delete cascade,
  name citext not null,
  unique (university_id, name)
);

create index faculties_university on faculties (university_id);

create table courses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references universities,
  faculty_id uuid references faculties,
  code citext not null,
  name citext not null,
  state catalog_state not null default 'pending',
  created_by_hash text,
  created_at timestamptz not null default now(),
  unique (university_id, code)
);

create index courses_faculty on courses (faculty_id);

create table course_aliases (
  course_id uuid not null references courses on delete cascade,
  alias citext not null,
  primary key (course_id, alias)
);

create table lecturers (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references universities,
  name citext not null,
  state catalog_state not null default 'pending',
  created_by_hash text,
  created_at timestamptz not null default now(),
  unique (university_id, name)
);

create index lecturers_university on lecturers (university_id);

create table course_lecturers (
  course_id uuid not null references courses on delete cascade,
  lecturer_id uuid not null references lecturers on delete cascade,
  first_seen_year smallint,
  last_seen_year smallint,
  primary key (course_id, lecturer_id)
);

create index course_lecturers_lecturer on course_lecturers (lecturer_id, course_id);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  submission_key_hash text,
  receipt_hash text not null unique,
  course_id uuid not null references courses,
  lecturer_id uuid not null references lecturers,
  semester text not null check (semester in ('Semester 1', 'Semester 2', 'Summer')),
  academic_year smallint not null check (academic_year between 2000 and 2100),
  course_rating smallint not null check (course_rating between 1 and 5),
  lecturer_rating smallint not null check (lecturer_rating between 1 and 5),
  workload text not null check (workload in ('Light', 'Balanced', 'Heavy', 'Extreme')),
  submitted_course_name citext not null,
  submitted_faculty_name citext not null,
  body text not null check (char_length(body) between 70 and 4000),
  moderation moderation_state not null default 'pending',
  created_at timestamptz not null default now(),
  published_at timestamptz,
  removed_at timestamptz,
  unique (submission_key_hash, course_id, lecturer_id, semester, academic_year)
);

create index reviews_course on reviews (course_id);
create index reviews_lecturer on reviews (lecturer_id);
create index reviews_public_feed on reviews (published_at desc, id desc)
  where moderation = 'published';
create index reviews_public_course on reviews (course_id, lecturer_id, published_at desc)
  where moderation = 'published';

create table review_signals (
  review_id uuid not null references reviews on delete cascade,
  kind text not null,
  score numeric(5,4) not null,
  detail jsonb not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (review_id, kind)
);

create table review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews on delete cascade,
  reporter_key_hash text,
  reason text not null,
  details text not null default '',
  urgent boolean not null default false,
  previous_review_state moderation_state not null,
  state case_state not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (review_id, reporter_key_hash)
);

create index reports_review on review_reports (review_id);
create index reports_open on review_reports (urgent desc, created_at)
  where state in ('pending', 'appealed');

create table review_appeals (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews on delete cascade,
  report_id uuid references review_reports on delete set null,
  appeal_key_hash text,
  details text not null,
  contact_ciphertext bytea,
  state case_state not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index appeals_review on review_appeals (review_id);
create index appeals_report on review_appeals (report_id) where report_id is not null;
create index appeals_open on review_appeals (created_at) where state = 'pending';
create unique index appeals_by_rotating_identity on review_appeals (review_id, appeal_key_hash)
  where appeal_key_hash is not null;

create table lecturer_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews on delete cascade,
  lecturer_id uuid not null references lecturers,
  verification_email_ciphertext bytea,
  body text not null check (char_length(body) between 70 and 2000),
  moderation moderation_state not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index replies_review on lecturer_replies (review_id);
create index replies_lecturer on lecturer_replies (lecturer_id);
create index replies_open on lecturer_replies (created_at) where moderation in ('pending', 'held');

create table moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  kind moderation_kind not null,
  review_id uuid references reviews on delete cascade,
  report_id uuid references review_reports on delete cascade,
  appeal_id uuid references review_appeals on delete cascade,
  reply_id uuid references lecturer_replies on delete cascade,
  action moderation_action not null,
  previous_state moderation_state,
  new_state moderation_state,
  reason_codes text[] not null default '{}',
  reason text,
  model text,
  core_version text not null,
  agent_findings jsonb not null default '[]',
  automated boolean not null default true,
  decided_by text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(review_id, report_id, appeal_id, reply_id) = 1)
);

create index decisions_by_review on moderation_decisions (review_id, created_at desc);
create index decisions_by_report on moderation_decisions (report_id, created_at desc) where report_id is not null;
create index decisions_by_appeal on moderation_decisions (appeal_id, created_at desc) where appeal_id is not null;
create index decisions_by_reply on moderation_decisions (reply_id, created_at desc) where reply_id is not null;

create table moderation_jobs (
  id uuid primary key default gen_random_uuid(),
  kind moderation_kind not null check (kind <> 'human_override'),
  target_id uuid not null,
  state job_state not null default 'queued',
  priority smallint not null default 0,
  attempts smallint not null default 0,
  max_attempts smallint not null default 6,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, target_id)
);

create index moderation_jobs_ready on moderation_jobs (priority desc, run_after, created_at)
  where state in ('queued', 'retry');

create table rate_limit_buckets (
  key_hash text not null,
  scope text not null,
  bucket_start timestamptz not null,
  count integer not null check (count > 0),
  expires_at timestamptz not null,
  primary key (key_hash, scope, bucket_start)
);

create index rate_limit_expiry on rate_limit_buckets (expires_at);
create index expiring_review_signals on review_signals (expires_at) where expires_at is not null;

create view public_reviews as
select
  id,
  course_id,
  lecturer_id,
  semester,
  academic_year,
  course_rating,
  lecturer_rating,
  workload,
  body,
  published_at
from reviews
where moderation = 'published';

create view public_course_ratings as
select
  course_id,
  lecturer_id,
  count(*) as review_count,
  round(avg(course_rating), 2) as course_rating,
  round(avg(lecturer_rating), 2) as lecturer_rating
from public_reviews
group by course_id, lecturer_id;

comment on column reviews.submission_key_hash is 'Rotating server-side HMAC for abuse control; never a raw IP or public identifier.';
comment on column reviews.receipt_hash is 'Hash of the one-time moderation receipt returned to the submitter.';
comment on column moderation_decisions.agent_findings is 'Private minimal findings; never store chain-of-thought or copied personal information.';
comment on column moderation_jobs.last_error is 'A short internal error code, never raw user content or provider responses.';
