export function clerkSignInErrorMessage(error: unknown): string {
  const msg = String((error as Error)?.message ?? error ?? "unknown_error");
  const map: Record<string, string> = {
    clerk_not_configured: "Clerk 登录未配置，请联系管理员。",
    clerk_session_missing: "Clerk 会话无效，请重新登录。",
    auth_failed:
      "Clerk 换票失败：请确认线上 SSO 的 CLERK_SECRET_KEY 与前端 Publishable Key 同属 Production（均为 live），且 Partner 已启用 Clerk 渠道。",
  };
  return map[msg] ?? msg;
}
