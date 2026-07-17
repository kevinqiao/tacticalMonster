export function jwtAccessSecret(): string | undefined {
  const s = process.env.JWT_ACCESS_SECRET;
  if (typeof s === "string" && s.trim().length > 0) {
    return s.trim();
  }
  return undefined;
}
