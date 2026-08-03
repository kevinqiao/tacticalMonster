import type { TournamentConfig } from "./tournamentConfigTypes";

/**
 * 与 `stageRuleConfigsSoloMain` 一一对应：20 个 typeId = ruleId
 */
function buildSoloMainTournaments(): TournamentConfig[] {
    const rows: TournamentConfig[] = [];
    for (let ch = 1; ch <= 4; ch++) {
        for (let st = 1; st <= 5; st++) {
            const ruleId = `monster_rumble_solo_main_ch${ch}_s${st}`;
            const base = 6 + (ch - 1) * 2;
            const stageBump = st >= 3 ? 2 : 0;
            const stageBump2 = st >= 5 ? 2 : 0;
            const energy = base + stageBump + stageBump2;
            rows.push({
                typeId: ruleId,
                name: `Solo 主线 第${ch}章 ${st}/5`,
                description: `Monster Rumble 主线：第${ch}章第${st}关`,
                gameType: "tacticalMonster",
                isActive: true,
                timeRange: "permanent",
                entryRequirements: {
                    isSubscribedRequired: false,
                    // playerLevel: Math.min(40, 1 + (ch - 1) * 8 + st),
                    entryFee: { coins: 0, energy },
                },
                mode: "solo_challenge",
                matchRules: { minPlayers: 1, maxPlayers: 1, ruleId },
                rewards: {
                    baseRewards: { coins: 36 + ch * 12 + st * 6, energy: 5 },
                    performanceRewards: { baseReward: { coins: 90 + ch * 25 + st * 12 } },
                },
                limits: { maxAttempts: 999, attemptCost: { energy } },
            });
        }
    }
    return rows;
}

export const TOURNAMENT_CONFIGS_SOLO_MAIN: TournamentConfig[] = buildSoloMainTournaments();
