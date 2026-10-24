"use client";
import { track } from "@vercel/analytics";

/**
 * Product events, no identifiers. Answers: do people record, do employers answer, do bundles get verified,
 * do restores succeed. Never pass names, amounts, keys or UIDs.
 */
export type ProductEvent =
  | "onboarding_started" | "sample_loaded" | "record_started" | "record_done" | "record_failed"
  | "employer_link_created" | "employer_answered" | "proof_done" | "proof_failed"
  | "bundle_created" | "verify_opened" | "verify_done" | "restore_done" | "backup_shown" | "month_edited" | "settings_saved" | "pwa_installed";

export function logEvent(name: ProductEvent, props?: Record<string, string | number | boolean>) {
  try { track(name, props); } catch {}
}
