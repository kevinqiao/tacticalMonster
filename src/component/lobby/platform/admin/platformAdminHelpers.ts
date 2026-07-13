import { webSignInErrorMessage } from "../../shared/webSignInHelpers";

export function platformAdminErrorMessage(error: unknown): string {
  return webSignInErrorMessage(error);
}

export function platformAdminSuccessMessage(key: string): string {
  const map: Record<string, string> = {
    partnerCreated: "Partner 已创建。",
    staffUpdated: "成员资料已更新。",
  };
  return map[key] ?? key;
}
