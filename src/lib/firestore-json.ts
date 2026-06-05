/** Remove `undefined` values — Firestore rejects them on write. */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val !== undefined) {
      out[key] = stripUndefinedDeep(val);
    }
  }
  return out as T;
}

/** Safe JSON for API responses (Timestamps → ISO strings). */
export function firestoreDocToJson(
  id: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(
      { id, ...data },
      (_key, val) => {
        if (
          val &&
          typeof val === "object" &&
          "toDate" in val &&
          typeof (val as { toDate: () => Date }).toDate === "function"
        ) {
          return (val as { toDate: () => Date }).toDate().toISOString();
        }
        return val;
      },
    ),
  ) as Record<string, unknown>;
}
