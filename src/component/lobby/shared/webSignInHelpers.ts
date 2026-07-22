export type WebSignInStaffGate = "none" | "platform" | "partner" | "merchant";

/** Convex wraps thrown codes as `Uncaught Error: not_partner_staff` (plus request preamble). */
export function parseWebSignInErrorCode(error: unknown): string {
  const raw = String((error as Error)?.message ?? error ?? "unknown_error")
    .replace(/^Error:\s*/i, "")
    .trim();
  const uncaught = raw.match(/Uncaught Error:\s*([^\s\n]+)/i);
  if (uncaught?.[1]) return uncaught[1];
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const last = lines[lines.length - 1];
  if (last && /^[a-z0-9_]+$/i.test(last)) return last;
  return raw;
}

const WEB_SIGN_IN_ERROR_MAP: Record<string, string> = {
  account_id_required: "请填写 accountId。",
  password_required: "请填写密码。",
  invalid_credentials: "accountId 或密码错误。",
  not_platform_staff: "该账号未加入 platform_staff，无法登录运营后台。",
  not_partner_staff: "该账号未加入 partner_staff，无法登录 Partner 后台。",
  not_merchant_staff: "该账号未加入门店店员（store_staff），无法登录门店后台。",
  not_store_staff: "该账号未加入门店店员（store_staff），无法登录门店后台。",
  auth_channel_unavailable: "SSO 登录渠道不可用。",
  platform_operator_required: "当前账号不是平台运营，无法执行此操作。",
  forbidden: "没有权限。",
  not_found: "找不到 Partner 或成员。",
  user_not_found: "找不到该 UID 对应的平台用户（auth_identities）。",
  already_member: "该成员已在团队中。",
  last_owner: "不能移除最后一个 owner。",
  uid_required: "请填写 UID 或邮箱。",
  email_already_used: "该邮箱已被其他账号使用。",
  identity_subject_conflict: "该 subject 已被其他 uid 占用。",
  staff_auth_channel_unavailable: "该 Partner 未启用 staffAuth.mode=web 登录。",
  consumer_web_disabled: "玩家登录请使用 Clerk；Web 账号密码用于 Platform/Partner/门店 管理后台。",
  merchant_unreachable: "门店服务暂不可用，请确认 SSO Convex 已启动。",
  player_auth_invalid: "playerAuth 配置无效。",
  player_auth_mode_invalid: "playerAuth.mode 无效（需 clerk / embed / embed_then_clerk）。",
  staff_auth_invalid: "staffAuth 配置无效。",
  staff_auth_mode_invalid: "staffAuth.mode 无效（当前仅支持 web）。",
  default_partner_protected: "Default Partner（PID 0）是平台默认命名空间，不可删除。",
};

export function webSignInErrorMessage(error: unknown): string {
  const code = parseWebSignInErrorCode(error);
  if (WEB_SIGN_IN_ERROR_MAP[code]) return WEB_SIGN_IN_ERROR_MAP[code];
  // Fallback: Convex preamble may still contain a known code token.
  for (const key of Object.keys(WEB_SIGN_IN_ERROR_MAP)) {
    if (code.includes(key) || String((error as Error)?.message ?? "").includes(key)) {
      return WEB_SIGN_IN_ERROR_MAP[key]!;
    }
  }
  return "登录失败，请确认账号权限后重试。";
}
