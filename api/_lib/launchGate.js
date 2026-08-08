import { isProduction } from "./config.js";
import { HttpError } from "./http.js";

const present = (name) => Boolean(process.env[name]?.trim());
const validDate = (name) => {
  const value = process.env[name]?.trim();
  const timestamp = Date.parse(value ?? "");
  return !Number.isNaN(timestamp) && timestamp <= Date.now();
};

export const isLaunchApproved = () => {
  if (!isProduction()) return true;
  return present("EDGE_PROXY_SECRET")
    && present("OPERATOR_CONTACT_EMAIL")
    && present("URGENT_REMOVAL_PRIMARY")
    && present("URGENT_REMOVAL_BACKUP")
    && validDate("LEGAL_REVIEW_SIGNED_AT")
    && validDate("URGENT_ROTA_TESTED_AT");
};

export const isSubmissionsOpen = () => process.env.SUBMISSIONS_OPEN === "true" && isLaunchApproved();

export const assertSubmissionsOpen = () => {
  if (!isSubmissionsOpen()) {
    throw new HttpError(503, "submissions_closed", "Submissions are closed until the launch checks are signed.");
  }
};

export const assertCaseRoutesOpen = () => {
  if (!isLaunchApproved()) {
    throw new HttpError(503, "case_routes_closed", "Reports and appeals open after the launch checks are signed.");
  }
};
