import { describe, expect, it } from "vitest";

import { comparePortalWeeklyTotalPoints } from "../portalWeeklyTotalPointsService";

describe("comparePortalWeeklyTotalPoints", () => {
  it("sorts by totalPoints desc then uid asc", () => {
    const rows = [
      { uid: "b", totalPoints: 10 },
      { uid: "a", totalPoints: 10 },
      { uid: "c", totalPoints: 12 },
    ];
    const sorted = [...rows].sort(comparePortalWeeklyTotalPoints);
    expect(sorted.map((r) => r.uid)).toEqual(["c", "a", "b"]);
  });
});
