import { describe, expect, it } from "vitest";

import { AppsConfiguration } from "@/host/config/PageConfiguration";
import type { PageContainer } from "@/host/service/PageManager";
import {
  modalMatchesActiveContext,
  resolveActiveContext,
  resolveMountedRootShells,
} from "@/host/util/PageUtils";

function buildPageContainers(): PageContainer[] {
  const containers = AppsConfiguration.reduce<PageContainer[]>((acc, config) => {
    return acc.concat(
      config.navs.map((nav) => ({
        ...nav,
        app: config.name,
        uri: config.context === "/" ? config.context + nav.uri : config.context + "/" + nav.uri,
      }))
    );
  }, []);
  containers.forEach((container) => {
    if (container.children) {
      container.children = container.children.map((child) => ({
        ...child,
        app: container.app,
        uri: container.uri + "/" + child.uri,
        parentURI: container.uri,
      }));
    }
  });
  return containers;
}

describe("context routing", () => {
  const containers = buildPageContainers();

  it("resolveActiveContext maps pathname to app context", () => {
    expect(resolveActiveContext("/cc/demo-cafe")).toBe("/cc");
    expect(resolveActiveContext("/casual/lobby/c3")).toBe("/casual");
    expect(resolveActiveContext("/gc/solitaire")).toBe("/gc");
    expect(resolveActiveContext("/tactical/lobby")).toBe("/tactical");
    expect(resolveActiveContext("/partner/admin")).toBe("/partner");
    expect(resolveActiveContext("/partner/operation")).toBe("/partner");
    expect(resolveActiveContext("/platform/admin")).toBe("/platform");
  });

  it("resolveMountedRootShells returns one root shell per context", () => {
    const campaign = resolveMountedRootShells(containers, "/cc/demo-cafe");
    expect(campaign).toHaveLength(1);
    expect(campaign[0]?.uri.startsWith("/cc")).toBe(true);

    const casual = resolveMountedRootShells(containers, "/casual/lobby/c3");
    expect(casual).toHaveLength(1);
    expect(casual[0]?.uri.startsWith("/casual")).toBe(true);

    const tactical = resolveMountedRootShells(containers, "/tactical/lobby");
    expect(tactical).toHaveLength(1);
    expect(tactical[0]?.uri.startsWith("/tactical")).toBe(true);

    const partner = resolveMountedRootShells(containers, "/partner/admin");
    expect(partner).toHaveLength(1);
    expect(partner[0]?.uri.startsWith("/partner")).toBe(true);

    const partnerOps = resolveMountedRootShells(containers, "/partner/operation");
    expect(partnerOps).toHaveLength(1);
    expect(partnerOps[0]?.uri).toBe("/partner/operation");

    const platform = resolveMountedRootShells(containers, "/platform/admin");
    expect(platform).toHaveLength(1);
    expect(platform[0]?.uri.startsWith("/platform")).toBe(true);

    const preview = resolveMountedRootShells(containers, "/gc/preview");
    expect(preview).toHaveLength(0);
  });

  it("modalMatchesActiveContext scopes modals by context", () => {
    expect(
      modalMatchesActiveContext(
        { path: "./lobby/casual/view/tasks/CasualTasksModal", contexts: ["casual"] },
        "/cc/demo"
      )
    ).toBe(false);
    expect(
      modalMatchesActiveContext(
        { path: "./battle/games/blockBlast/battle/PlayBlockBlast", contexts: ["shared"] },
        "/cc/demo"
      )
    ).toBe(true);
    expect(
      modalMatchesActiveContext(
        { path: "./lobby/tactical/tournament/TournamentJoinList", contexts: ["tactical"] },
        "/tactical/lobby"
      )
    ).toBe(true);
  });
});
