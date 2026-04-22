export function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

export function toInt(value: string | undefined, fallback: number, min = 1): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}

export function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}
