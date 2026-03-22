const PKG = "pkg|";
const SVC = "svc|";

export function encodePackageOption(packageId: string): string {
  return `${PKG}${packageId}`;
}

export function encodeServiceSubOption(slug: string, subKey: string): string {
  return `${SVC}${slug}|${subKey}`;
}

export function parseBookingOption(
  value: string
):
  | { kind: "package"; id: string }
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
  return null;
}
