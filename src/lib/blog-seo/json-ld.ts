/** Remove undefined / null / empty-string fields from JSON-LD trees. */
export function stripUndefinedJsonLd<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedJsonLd(item))
      .filter((item) => item !== undefined && item !== null) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined || v === null || v === "") continue;
      out[k] = stripUndefinedJsonLd(v);
    }
    return out as T;
  }
  return value;
}
