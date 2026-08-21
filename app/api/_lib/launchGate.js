import { isProduction } from "./config.js";
import { HttpError } from "./http.js";

const present = (name) => Boolean(process.env[name]?.trim());

export const isLaunchApproved = () => {
  if (!isProduction()) return true;
  return present("EDGE_PROXY_SECRET")
    && present("OPERATOR_CONTACT_EMAIL");
};

export const isSubmissionsOpen = () => process.env.SUBMISSIONS_OPEN === "true" && isLaunchApproved();

export const assertSubmissionsOpen = () => {
  if (!isSubmissionsOpen()) {
    throw new HttpError(503, "submissions_closed", "Submissions are currently closed by the operator.");
  }
};

export const assertCaseRoutesOpen = () => {
  if (!isLaunchApproved()) {
    throw new HttpError(503, "case_routes_closed", "Reports and appeals require a configured operator contact.");
  }
};
