// Application pipeline (mirrors public.application_transition_allowed in SQL).
import type { Enums } from "@/types/database";

export type ApplicationStatus = Enums<"application_status">;

export const PIPELINE: ApplicationStatus[] = ["applied", "viewed", "shortlisted", "interview", "offered", "hired"];
export const FINAL_STATUSES: ApplicationStatus[] = ["hired", "rejected", "withdrawn"];

const FORWARD: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  applied: ["viewed", "shortlisted", "interview"],
  viewed: ["shortlisted", "interview"],
  shortlisted: ["interview", "offered"],
  interview: ["offered", "hired"],
  offered: ["hired"],
};

/** Employer-side transition rule. */
export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  if (from === to) return true;
  if (FINAL_STATUSES.includes(from)) return false;
  if (to === "withdrawn") return false;
  if (to === "rejected") return true;
  return FORWARD[from]?.includes(to) ?? false;
}

export function nextStatuses(from: ApplicationStatus): ApplicationStatus[] {
  if (FINAL_STATUSES.includes(from)) return [];
  return [...(FORWARD[from] ?? []), "rejected"];
}

export function candidateCanWithdraw(status: ApplicationStatus): boolean {
  return !FINAL_STATUSES.includes(status);
}

export const STATUS_TONE: Record<ApplicationStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  applied: "neutral",
  viewed: "info",
  shortlisted: "info",
  interview: "warning",
  offered: "warning",
  hired: "success",
  rejected: "danger",
  withdrawn: "neutral",
};
