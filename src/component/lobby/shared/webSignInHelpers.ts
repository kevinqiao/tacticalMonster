export type WebSignInStaffGate = "none" | "platform" | "partner" | "merchant";

export function webSignInErrorMessage(error: unknown): string {
  const msg = String((error as Error)?.message ?? error ?? "unknown_error");
  const map: Record<string, string> = {
    account_id_required: "请填写 accountId。",
    password_required: "请填写密码。",
    invalid_credentials: "accountId 或密码错误。",
    not_platform_staff: "该账号未加入 platform_staff，无法登录运营后台。",
    not_partner_staff: "该账号未加入 partner_staff，无法登录 Partner 后台。",
    not_merchant_staff: "该账号未加入 merchant_staff，无法登录商户后台。",
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
    auth_channels_required: "至少需要一个登录渠道。",
    staff_auth_channel_unavailable: "该 Partner 未启用 staff Web 登录渠道（staff_auth_channels）。",
    consumer_web_disabled: "玩家登录请使用 Clerk；Web 账号密码用于 Platform/Partner/商户 管理后台。",
    merchant_unreachable: "商户服务暂不可用，请确认 merchantCampaign Convex 已启动。",
    invalid_consumer_auth_channel: "consumer 渠道仅支持 Clerk 与 Embed。",
    invalid_staff_auth_channel: "staff 渠道仅支持 Web 账号密码（cid=0）。",
  };
  return map[msg] ?? msg;
}
