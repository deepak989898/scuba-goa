const PKG = "pkg|";
const SVC = "svc|";
const SVC_BASE = "svcb|";

export function encodePackageOption(packageId: string): string {
  return `${PKG}${packageId}`;
}

export function encodeServiceSubOption(slug: string, subKey: string): string {
  return `${SVC}${slug}|${subKey}`;
}

export function encodeServiceBaseOption(slug: string): string {
  return `${SVC_BASE}${slug}`;
}

export function parseBookingOption(
  value: string
):
  | { kind: "package"; id: string }
  | { kind: "service"; slug: string }
  | { kind: "serviceSub"; slug: string; subKey: string }
  | null {
  if (!value) return null;
  if (value.startsWith(PKG)) {
    return { kind: "package", id: value.slice(PKG.length) };
  }
  if (value.startsWith(SVC)) {
    const rest = value.slice(SVC.length);
    const i = rest.indexOf("|");
    if (i < 1) return null;
    return {
      kind: "serviceSub",
      slug: rest.slice(0, i),
      subKey: rest.slice(i + 1),
    };
  }
  if (value.startsWith(SVC_BASE)) {
    const slug = value.slice(SVC_BASE.length).trim();
    if (!slug) return null;
    return { kind: "service", slug };
  }
  return null;
}
