/** Saved visitor contact for popup autofill + skip re-prompt after submit. */

export const VISITOR_LEAD_PROFILE_KEY = "bsg_visitor_lead_profile";
export const VISITOR_LEAD_SUBMITTED_KEY = "bsg_lead_popup_submitted";
export const VISITOR_LEAD_DISMISSED_SESSION_KEY = "bsg_lead_popup_dismissed";

export type VisitorLeadProfile = {
  name: string;
  email: string;
  phone: string;
};

export function readVisitorLeadProfile(): VisitorLeadProfile {
  if (typeof window === "undefined") {
    return { name: "", email: "", phone: "" };
  }
  try {
    const raw = localStorage.getItem(VISITOR_LEAD_PROFILE_KEY);
    if (!raw) return { name: "", email: "", phone: "" };
    const parsed = JSON.parse(raw) as Partial<VisitorLeadProfile>;
    return {
      name: String(parsed.name ?? "").trim(),
      email: String(parsed.email ?? "").trim(),
      phone: String(parsed.phone ?? "").trim(),
    };
  } catch {
    return { name: "", email: "", phone: "" };
  }
}

export function saveVisitorLeadProfile(profile: VisitorLeadProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      VISITOR_LEAD_PROFILE_KEY,
      JSON.stringify({
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      }),
    );
  } catch {
    /* ignore quota */
  }
}

export function markVisitorLeadSubmitted(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VISITOR_LEAD_SUBMITTED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasVisitorLeadSubmitted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(VISITOR_LEAD_SUBMITTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissLeadPopupForSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(VISITOR_LEAD_DISMISSED_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isLeadPopupDismissedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(VISITOR_LEAD_DISMISSED_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
