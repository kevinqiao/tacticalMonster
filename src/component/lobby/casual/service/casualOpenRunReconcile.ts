import type { OpenCasualRunAssignment } from "./casualOpenRunAssignment";

const DEFAULT_MATCH_TIME_LIMIT_MS = 300_000;

export function openCasualRunDueAt(
  assignment: OpenCasualRunAssignment,
  now: number = Date.now()
): number {
  if (typeof assignment.dueAt === "number" && Number.isFinite(assignment.dueAt)) {
    return assignment.dueAt;
  }
  return assignment.createdAt + DEFAULT_MATCH_TIME_LIMIT_MS;
}

export function isOpenCasualRunExpired(
  assignment: OpenCasualRunAssignment,
  now: number = Date.now()
): boolean {
  return now >= openCasualRunDueAt(assignment, now);
}
