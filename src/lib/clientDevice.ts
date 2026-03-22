export type DeviceCategory = "mobile" | "tablet" | "desktop" | "unknown";

const UA_MAX = 400;

/**
 * Coarse device class from User-Agent (no external dependency).
 */
export function deviceCategoryFromUserAgent(ua: string): DeviceCategory {
  const u = ua.trim();
  if (!u) return "unknown";
  if (/tablet|ipad|playbook|silk|kindle/i.test(u)) return "tablet";
  // Many Android tablets omit "Mobile" in the UA
  if (/Android/i.test(u) && !/Mobile/i.test(u)) return "tablet";
  if (
    /mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile|wpdesktop/i.test(
      u
    )
  ) {
    return "mobile";
  }
  if (/Android/i.test(u)) return "mobile";
  return "desktop";
}

/**
 * Optional hint from Client Hints: sec-ch-ua-mobile ?1 means phone-style UI.
 */
export function refineCategoryWithClientHints(
  category: DeviceCategory,
  secChUaMobile: string | null
): DeviceCategory {
  if (secChUaMobile === "?1" && category === "desktop") return "mobile";
  return category;
}

/**
 * Short human-readable line for admin analytics (browser / OS hints).
 */
export function deviceLabelFromUserAgent(
  ua: string,
  category: DeviceCategory
): string {
  const u = ua.slice(0, UA_MAX);
  let os = "";
  if (/Windows NT/i.test(u)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(u)) os = "macOS";
  else if (/Android/i.test(u)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(u)) os = "iOS";
  else if (/Linux/i.test(u)) os = "Linux";

  let br = "";
  if (/Edg\//i.test(u)) br = "Edge";
  else if (/OPR\/|Opera/i.test(u)) br = "Opera";
  else if (/Chrome\//i.test(u) && !/Edg/i.test(u)) br = "Chrome";
  else if (/Safari\//i.test(u) && !/Chrome/i.test(u)) br = "Safari";
  else if (/Firefox\//i.test(u)) br = "Firefox";

  const type =
    category === "mobile"
      ? "Phone"
      : category === "tablet"
        ? "Tablet"
        : category === "desktop"
          ? "Desktop"
          : "Device";

  const parts = [type];
  if (br) parts.push(br);
  if (os) parts.push(os);
  return parts.join(" · ").slice(0, 140);
}

export function parseRequestDevice(headers: Headers): {
  category: DeviceCategory;
  label: string;
  uaSnippet: string;
} {
  const ua = headers.get("user-agent") ?? "";
  const secMobile = headers.get("sec-ch-ua-mobile");
  let category = deviceCategoryFromUserAgent(ua);
  category = refineCategoryWithClientHints(category, secMobile);
  const label = deviceLabelFromUserAgent(ua, category);
  const uaSnippet = ua.slice(0, 220);
  return { category, label, uaSnippet };
}
