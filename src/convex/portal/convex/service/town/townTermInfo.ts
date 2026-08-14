import {
  portalSeasonDisplayN,
  portalSeasonIdAt,
  portalSeasonWeekOf,
} from "../../data/portalSeasonHonorConfig";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";

export function resolveTownTermInfo(nowMs = Date.now()) {
  const weekKey = weeklyPeriodKey(nowMs);
  const termId = portalSeasonIdAt(nowMs);
  const termNumber = portalSeasonDisplayN(termId);
  const { weekOf, weeks: weeksTotal } = portalSeasonWeekOf(weekKey);
  return {
    termId,
    termNumber,
    weekOf,
    weeksTotal,
    weekKey,
  };
}
