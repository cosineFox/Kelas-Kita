import { endpoint, sendJson } from "./_lib/http.js";
import { isSubmissionsOpen } from "./_lib/launchGate.js";
import { readPublicState } from "./_lib/repository.js";

export default endpoint(["GET"], async (_request, response) =>
  sendJson(response, 200, { ...await readPublicState(), submissionsOpen: isSubmissionsOpen() }));
