import { timingSafeEqual } from "node:crypto";

export function isAdminTokenConfigured(): boolean {
  const token = process.env.CHALLENGE_ADMIN_TOKEN;
  return typeof token === "string" && token.length >= 32;
}

export function isAdminAuthorized(request: Request): boolean {
  const configuredToken = process.env.CHALLENGE_ADMIN_TOKEN;
  if (!configuredToken || configuredToken.length < 32) return false;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(configuredToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
