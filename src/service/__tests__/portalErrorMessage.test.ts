import { describe, expect, it } from "vitest";

import "@/i18n";
import i18n from "@/i18n";
import {
  campaignFlowErrorMessage,
  leaveMatchQueueErrorText,
  portalErrorMessage,
  portalFlowMessage,
  portalPurchaseErrorMessage,
} from "@/component/lobby/portal/shared/portalErrorMessage";

describe("portalErrorMessage", () => {
  it("maps known shop codes in zh-CN", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(portalPurchaseErrorMessage("insufficient_coins")).toBe("金币不足");
    expect(portalErrorMessage("join_failed")).toBe("加入失败");
  });

  it("maps known shop codes in en-US", async () => {
    await i18n.changeLanguage("en-US");
    expect(portalPurchaseErrorMessage("insufficient_coins")).toBe("Not enough coins");
    expect(portalFlowMessage("alreadyInQueue")).toContain("match queue");
  });

  it("reuses campaign flow errors for leave queue", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(leaveMatchQueueErrorText("not_in_queue")).toBe(
      campaignFlowErrorMessage("notInQueue")
    );
    expect(leaveMatchQueueErrorText("cannot_leave_claiming")).toBe(
      campaignFlowErrorMessage("creatingMatch")
    );
  });

  it("falls back for unknown codes", async () => {
    await i18n.changeLanguage("en-US");
    expect(portalErrorMessage("totally_unknown_code")).toContain("totally_unknown_code");
  });

  it("localizes boot overlay copy", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(i18n.t("boot.enteringLobby", { ns: "host.shell" })).toBe("正在进入游戏大厅…");
    await i18n.changeLanguage("en-US");
    expect(i18n.t("boot.enteringLobby", { ns: "host.shell" })).toBe("Entering game lobby…");
  });
});
