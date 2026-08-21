alter table reviews drop constraint if exists reviews_semester_check;
alter table reviews add constraint reviews_semester_check
  check (char_length(btrim(semester)) between 2 and 40);
