export function clerkSignInErrorMessage(error: unknown): string {
  const msg = String((error as Error)?.message ?? error ?? "unknown_error");
  const map: Record<string, string> = {
    clerk_not_configured: "Clerk 登录未配置，请联系管理员。",
    clerk_session_missing: "Clerk 会话无效，请重新登录。",
    auth_failed: "Clerk 登录失败，请确认 SSO 已启动且 Partner 已启用 Clerk 渠道。",
  };
  return map[msg] ?? msg;
}
