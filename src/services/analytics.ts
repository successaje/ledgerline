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

/** Property names that must never reach telemetry, matched as substrings, case-insensitive. */
export const SENSITIVE_KEYS = ["name", "amount", "phrase", "secret", "key", "note", "token", "address", "uid", "url", "employer", "worker", "salary"];

/** Strips any property whose name looks sensitive; the event still fires with what remains. */
export function sanitise(props?: Record<string, string | number | boolean>) {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    const lk = k.toLowerCase();
    if (SENSITIVE_KEYS.some(s => lk.includes(s))) continue;
    if (typeof v === "string" && v.length > 32) continue; // never free text
    out[k] = v;
  }
  return out;
}

export function logEvent(name: ProductEvent, props?: Record<string, string | number | boolean>) {
  try { track(name, sanitise(props)); } catch {}
}
