/**
 * Casual Platform JWT 校验密钥，须与签发 `user.token` 的一方一致。
 * 生产环境请在 Convex Dashboard → Settings → Environment Variables 配置 `JWT_ACCESS_SECRET`。
 * 未配置时使用与 `authenticate` 历史行为一致的本地开发回退（勿用于生产）。
 */
export function jwtAccessSecret(): string | null {
  const s = process.env.JWT_ACCESS_SECRET ?? "12222222";
  return s && s.length > 0 ? s : null;
}
