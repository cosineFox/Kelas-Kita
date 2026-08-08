import { classifyContent, publicDecision } from "./moderation.js";
import {
  claimJobs,
  claimTargetJob,
  finishJob,
  loadModerationTarget,
  saveAutomatedDecision,
} from "./repository.js";

export const processJob = async (job) => {
  try {
    const target = await loadModerationTarget(job.kind, job.targetId);
    const result = await classifyContent({ kind: job.kind, text: target.text, report: target.report });
    await saveAutomatedDecision(job.kind, job.targetId, result);
    await finishJob(job, result.aiAvailable);
    return { ok: true, complete: result.aiAvailable, decision: publicDecision(result) };
  } catch {
    await finishJob(job, false, "processing_error");
    return { ok: false, complete: false, decision: null };
  }
};

export const processTarget = async (kind, targetId) => {
  const job = await claimTargetJob(kind, targetId);
  if (!job) return null;
  return processJob(job);
};

export const processQueue = async (limit = 3) => {
  const jobs = await claimJobs(limit);
  const results = [];
  for (const job of jobs) results.push(await processJob(job));
  return results;
};
