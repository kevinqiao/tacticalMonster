import { defineTable } from "convex/server";
import { v } from "convex/values";

// å®ç®±ç±»åž‹æƒé‡é…ç½® Schema
const ChestTypeWeightsSchema = v.object({
    silver: v.optional(v.number()),
    gold: v.optional(v.number()),
    purple: v.optional(v.number()),
    orange: v.optional(v.number()),
});

// é”¦æ ‡èµ›ç³»ç»Ÿç›¸å…³è¡¨
export const tournamentSchema = {
    matchingQueue: defineTable({
        // åŸºç¡€ä¿¡æ¯
        uid: v.string(),
        tournamentId: v.optional(v.string()),
        tournamentType: v.optional(v.string()),

        // åŒ¹é…çŠ¶æ€
        status: v.union(
            v.literal("waiting"),
            v.literal("matched"),
            v.literal("expired"),
            v.literal("cancelled")
        ),

        // æ—¶é—´ä¿¡æ¯
        joinedAt: v.string(),
        matchedAt: v.optional(v.string()),
        expiredAt: v.optional(v.string()),

        // å…ƒæ•°æ®
        metadata: v.optional(v.any()),

        // ç³»ç»Ÿå­—æ®µ
        createdAt: v.string(),
        updatedAt: v.string()
    }).index("by_tournament", ["tournamentId"]).index("by_tournament_type", ["tournamentType"])
        .index("by_uid", ["uid"])
        .index("by_joined_at", ["joinedAt"])
        .index("by_expired_at", ["expiredAt"]),

    tournaments: defineTable({
        gameType: v.string(), // "solitaire", "uno", "ludo", "rummy"
        status: v.number(), // 0:openï¼Œ1ï¼šcompletedï¼Œ2ï¼šsettled,3:cancelled
        type: v.string(), // å¼•ç”¨ tournament_types.typeId
        createdAt: v.string(),
        updatedAt: v.string(),
        endTime: v.optional(v.string()),
    }).index("by_type_status", ["type", "status"])
        .index("by_type_status_createdAt", ["type", "status", "createdAt"])
        .index("by_type_status_gameType", ["type", "status", "gameType"])
        .index("by_type_status_gameType_createdAt", ["type", "status", "gameType", "createdAt"]),

    // çŽ©å®¶ä¸Žé”¦æ ‡èµ›çš„å…³ç³»è¡¨
    player_tournaments: defineTable({
        uid: v.string(),
        tournamentId: v.id("tournaments"),
        tournamentType: v.string(), // æ–°å¢žï¼šé”¦æ ‡èµ›ç±»åž‹ï¼Œç”¨äºŽä¼˜åŒ–æŸ¥è¯¢
        gameType: v.optional(v.string()), // æ–°å¢žï¼šæ¸¸æˆç±»åž‹ï¼Œç”¨äºŽä¼˜åŒ–æŸ¥è¯¢
        status: v.optional(v.number()), // 0:openï¼Œ1ï¼šcompletedï¼Œ2ï¼šcollected,3:cancelled
        rank: v.optional(v.number()),
        matchCount: v.optional(v.number()), // æ–°å¢žï¼šå‚ä¸Žçš„æ¯”èµ›åœºæ•°
        score: v.optional(v.number()), // æ–°å¢žï¼šç´¯ç§¯çš„åˆ†æ•°
        rewards: v.optional(v.any()),
        lastMatchAt: v.optional(v.string()), // æ–°å¢žï¼šæœ€åŽä¸€åœºæ¯”èµ›æ—¶é—´
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_tournament", ["tournamentId"])
        .index("by_tournament_uid", ["tournamentId", "uid"])
        .index("by_uid_gameType_status", ["uid", "gameType", "status", "updatedAt"]) // æ–°å¢žï¼šä¼˜åŒ–çŠ¶æ€æŸ¥è¯¢
        .index("by_tournament_score", ["tournamentId", "score"]),
    tournament_types: defineTable({
        // åŸºç¡€ä¿¡æ¯
        typeId: v.string(), // å¦‚ "daily_special"
        name: v.string(), // å¦‚ "æ¯æ—¥ç‰¹åˆ«é”¦æ ‡èµ›"
        description: v.string(),
        timeRange: v.optional(v.string()),

        // æ¸¸æˆé…ç½®
        gameType: v.optional(v.string()), // "solitaire", "rummy", "uno", "ludo", "chess", "checkers", "puzzle", "arcade", "tacticalMonster"
        gameRule: v.optional(v.object({
            description: v.string(),
            mode: v.union(
                v.literal("challenge"),
                v.literal("pvp"),
                v.literal("story")
            ),
            ruleId: v.string(),  // å¿…å¡«ï¼šå…³è”åˆ° TacticalMonster æ¨¡å—çš„ GameRuleConfig
        })),
        isActive: v.boolean(),

        /** TacticalMonster：与 TournamentConfig.mode 一致；优先于 matchRules 内同名字段（历史行可仍仅存于 matchRules） */
        mode: v.optional(v.union(
            v.literal("tutorial"),
            v.literal("solo_challenge"),
            v.literal("multiplayer_tournament")
        )),
        /** @deprecated 旧字段名，与 mode 同义 */
        modeType: v.optional(v.union(
            v.literal("tutorial"),
            v.literal("solo_challenge"),
            v.literal("multiplayer_tournament")
        )),

        // å‚èµ›æ¡ä»¶
        entryRequirements: v.optional(v.object({
            isSubscribedRequired: v.boolean(),
            // çŽ©å®¶ç­‰çº§è¦æ±‚ï¼ˆTacticalMonster æ¸¸æˆä½¿ç”¨ï¼‰
            playerLevel: v.optional(v.number()),
            // æ³¨æ„ï¼šPower èŒƒå›´ï¼ˆminTeamPower/maxTeamPowerï¼‰åœ¨ GameRuleConfig.unlockConditions ä¸­é…ç½®
            // é€šè¿‡ gameRule.ruleId å…³è”åˆ° TacticalMonster æ¨¡å—çš„ GameRuleConfig èŽ·å– Power èŒƒå›´
            entryFee: v.object({
                coins: v.optional(v.number()),
                gems: v.optional(v.number()),
                energy: v.optional(v.number()),  // TacticalMonster ç‰¹å®šï¼šèƒ½é‡æ¶ˆè€—
            }),
        })),

        // æ¯”èµ›è§„åˆ™
        matchRules: v.object({
            // çŽ©å®¶æ•°é‡
            minPlayers: v.number(),
            maxPlayers: v.number(),

            // TacticalMonster：与 StageRuleConfig.ruleId 对齐；mode 已提升至 tournament_types 顶层，此处仅兼容旧文档
            ruleId: v.optional(v.string()),
            mode: v.optional(v.union(
                v.literal("tutorial"),
                v.literal("solo_challenge"),
                v.literal("multiplayer_tournament")
            )),
            /** @deprecated 旧字段名，与 mode 同义 */
            modeType: v.optional(v.union(
                v.literal("tutorial"),
                v.literal("solo_challenge"),
                v.literal("multiplayer_tournament")
            )),

            // æŽ’åè§„åˆ™
            matchPointsType: v.optional(v.union(
                v.literal("by_score"),
                v.literal("by_rank"),
                v.literal("by_performance")
            )),
            rankPoints: v.optional(v.any()), // { [k: string]: number }
            performancePoints: v.optional(v.any()), // { [k: string]: number }
        }),

        rewards: v.object({
            rewardType: v.optional(v.union(
                v.literal("by_points"),
                v.literal("by_rank")
            )),  // å¯é€‰ï¼šå‘åŽå…¼å®¹

            // åŸºç¡€å¥–åŠ± - å‚ä¸Žå³å¯èŽ·å¾—
            baseRewards: v.object({
                coins: v.optional(v.number()),        // TacticalMonster ç‰¹å®šå¥–åŠ±
                energy: v.optional(v.number()),
                chestDropRate: v.optional(v.number()),  // å¯é€‰ï¼šå‘åŽå…¼å®¹ï¼Œå¦‚æžœæ²¡æœ‰é…ç½®åˆ™ä½¿ç”¨é»˜è®¤å€¼
            }),

            // æŽ’åå¥–åŠ± - ä»…ç”¨äºŽå¤šäººæ¯”èµ›ï¼ˆminPlayers > 1 æˆ– maxPlayers > 1ï¼‰
            rankRewards: v.optional(v.array(v.object({
                rankRange: v.array(v.number()), // [minRank, maxRank]
                multiplier: v.number(),
                // TacticalMonster ç‰¹å®šå¥–åŠ±
                coins: v.optional(v.number()),
                monsterShards: v.optional(v.array(v.object({
                    monsterId: v.string(),
                    quantity: v.number()
                }))),
                energy: v.optional(v.number()),
                chestDropRate: v.optional(v.number()),
                chestTypeWeights: v.optional(ChestTypeWeightsSchema),
            }))),

            // è®¢é˜…çŽ©å®¶é¢å¤–å¥–åŠ±ï¼ˆå›ºå®šåŠ ç®—ï¼›è§ RewardConfig æ³¨é‡Šï¼‰
            subscribedPlayerExtraRewards: v.optional(v.object({
                coins: v.optional(v.number()),
                monsterShards: v.optional(v.array(v.object({
                    monsterId: v.string(),
                    quantity: v.number()
                }))),
                energy: v.optional(v.number()),
            })),
            /** @deprecated ä¸Ž subscribedPlayerExtraRewards åŒä¹‰ï¼Œæ—§æ•°æ®è¿ç§»åŽå¯åˆ  */
            subscriptionBonus: v.optional(v.object({
                coins: v.optional(v.number()),
                monsterShards: v.optional(v.array(v.object({
                    monsterId: v.string(),
                    quantity: v.number()
                }))),
                energy: v.optional(v.number()),
            })),

            // è¡¨çŽ°å¥–åŠ± - ä»…ç”¨äºŽå•äººå…³å¡ï¼ˆminPlayers === 1 && maxPlayers === 1ï¼‰
            // åŸºäºŽåˆ†æ•°é˜ˆå€¼è®¡ç®—å¥–åŠ±ï¼Œæ›¿ä»£æŽ’åå¥–åŠ±
            performanceRewards: v.optional(v.object({
                // åŸºç¡€è¡¨çŽ°å¥–åŠ±ï¼ˆç”¨äºŽè®¡ç®—å„ç­‰çº§å¥–åŠ±ï¼‰
                baseReward: v.object({
                    coins: v.optional(v.number()),
                    monsterShards: v.optional(v.array(v.object({
                        monsterId: v.string(),
                        quantity: v.number()
                    }))),
                    energy: v.optional(v.number()),
                }),
                // levelRewards ä½¿ç”¨ v.any() å› ä¸º Record ç±»åž‹
                // æ¯ä¸ªè¡¨çŽ°ç­‰çº§å¯ä»¥åŒ…å«ï¼šcoins, monsterShards, energy, chestDropRate, chestTypeWeights
                levelRewards: v.optional(v.any()),
            })),
            // é¦–æ¬¡é€šå…³å¥–åŠ± - ä»…ç”¨äºŽå•äººå…³å¡ï¼ˆminPlayers === 1 && maxPlayers === 1ï¼‰
            firstClearRewards: v.optional(v.object({
                coins: v.optional(v.number()),
                energy: v.optional(v.number()),
                monsterShards: v.optional(v.array(v.object({
                    monsterId: v.string(),
                    quantity: v.number()
                }))),
                monsters: v.optional(v.array(v.object({
                    monsterId: v.string(),
                    level: v.optional(v.number()),
                    stars: v.optional(v.number()),
                }))),
                chestDropRate: v.optional(v.number()),
                chestTypeWeights: v.optional(ChestTypeWeightsSchema),
            })),
        }),

        // é™åˆ¶é…ç½®
        limits: v.optional(v.object({
            // æœ€å¤§å‚ä¸Žæ¬¡æ•°
            intervalHours: v.optional(v.number()),
            maxAttempts: v.optional(v.number()),  // æœ€å¤§å°è¯•æ¬¡æ•°
            // è®¢é˜…ç”¨æˆ·é™åˆ¶
            subscribed: v.optional(v.object({
                maxAttempts: v.optional(v.number()),
            })),
            // å°è¯•æˆæœ¬
            attemptCost: v.optional(v.object({
                coins: v.optional(v.number()),
                energy: v.optional(v.number()),
            })),
            // æ˜¯å¦å…è®¸æ— é™å°è¯•
            unlimitedAttempts: v.optional(v.boolean()),
        })),

        // æ—¶é—´æˆ³
        createdAt: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
    }).index("by_typeId", ["typeId"])
        .index("by_isActive", ["isActive"])
        .index("by_gameType", ["gameType"])
        .index("by_gameType_isActive", ["gameType", "isActive"]),

    // æ¯”èµ›åŸºç¡€ä¿¡æ¯è¡¨ - å­˜å‚¨æ¯”èµ›çš„æ ¸å¿ƒä¿¡æ¯
    matches: defineTable({
        tournamentId: v.optional(v.string()),
        tournamentType: v.string(),
        gameType: v.string(),
        completed: v.boolean(),
        maxPlayers: v.number(),
        minPlayers: v.number(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_tournament", ["tournamentId"])
        .index("by_game_type", ["gameType"])
        .index("by_tournament_completed", ["tournamentId", "completed"]),

    // çŽ©å®¶æ¯”èµ›è®°å½•è¡¨ - å­˜å‚¨æ¯ä¸ªçŽ©å®¶åœ¨æ¯”èµ›ä¸­çš„å…·ä½“è¡¨çŽ°
    player_matches: defineTable({
        matchId: v.string(),
        tournamentId: v.optional(v.id("tournaments")),
        tournamentType: v.optional(v.string()),
        mode: v.union(
            v.literal("tutorial"), v.literal("solo_tournament"),
            v.literal("multiplayer_tournament")
        ),
        gameType: v.optional(v.string()),
        uid: v.string(),
        score: v.number(),
        rank: v.number(),
        /** open：进行中；finished：已交分；settled：本场已结算排名 */
        status: v.union(
            v.literal("open"),
            v.literal("finished"),
            v.literal("settled")
        ),
        gameId: v.optional(v.string()),
        teamPower: v.optional(v.number()),
        stageId: v.optional(v.string()),
        seed: v.optional(v.string()),
        // æ¯”èµ›ç»“æžœï¼ˆä¸»è¦ç”¨äºŽå•äººå…³å¡æŒ‘æˆ˜ï¼‰
        // perfect: å®Œç¾Žé€šå…³ï¼ˆæ— ä¼¤ã€æ»¡åˆ†ç­‰ï¼‰
        // win: é€šå…³æˆåŠŸ
        // lose: å¤±è´¥
        // draw: å¹³å±€ï¼ˆè¶…æ—¶ç­‰æƒ…å†µï¼‰
        performance: v.optional(v.union(
            v.literal("perfect"),
            v.literal("win"),
            v.literal("lose"),
            v.literal("draw")
        )),
        dueTime: v.optional(v.string()),
        /** 战术怪等关卡首通（与 tacticalMonster submitScore / mr_player_first_clear 对齐） */
        isFirstClear: v.optional(v.boolean()),
        createdAt: v.string(),
        updatedAt: v.optional(v.string()),
    }).index("by_uid_status", ["uid", "status"])
        .index("by_match", ["matchId"])
        .index("by_match_uid", ["matchId", "uid"])
        .index("by_uid", ["uid"])
        .index("by_game", ["gameId"])
        .index("by_tournamentType_uid_status", ["tournamentType", "uid", "status"])
        .index("by_tournamentType_uid_createdAt", ["tournamentType", "uid", "createdAt"])
        .index("by_uid_createdAt", ["uid", "createdAt"])
        .index("by_score", ["score"])                    // æŒ‰å¾—åˆ†æŸ¥è¯¢
        .index("by_rank", ["rank"])                      // æŒ‰æŽ’åæŸ¥è¯¢
        .index("by_team_stage", ["teamPower", "stageId"])// æŒ‰æ¸¸æˆç±»åž‹å’ŒçŽ©å®¶æŸ¥è¯¢        
        .index("by_uid_gameType", ["uid", "gameType"])   // å¤åˆç´¢å¼•ï¼Œç”¨äºŽæŒ‰æ¸¸æˆç±»åž‹æŸ¥è¯¢çŽ©å®¶åŽ†å²
        .index("by_uid_gameType_created", ["uid", "gameType", "createdAt"]) // å¤åˆç´¢å¼•ï¼Œç”¨äºŽæŒ‰æ¸¸æˆç±»åž‹æŸ¥è¯¢çŽ©å®¶åŽ†å²ï¼ˆæŽ’åºï¼‰
        .index("by_uid_performance", ["uid", "performance"]) // å¤åˆç´¢å¼•ï¼Œç”¨äºŽæŸ¥è¯¢çŽ©å®¶çš„ perfect/win/lose/draw æ¬¡æ•°
        .index("by_tournamentType_performance", ["tournamentType", "performance"]), // å¤åˆç´¢å¼•ï¼Œç”¨äºŽç»Ÿè®¡ç‰¹å®šé”¦æ ‡èµ›ç±»åž‹çš„æˆç»©åˆ†å¸ƒ

    // æ¯”èµ›äº‹ä»¶æ—¥å¿—è¡¨ - è®°å½•æ¯”èµ›è¿‡ç¨‹ä¸­çš„é‡è¦äº‹ä»¶
    match_events: defineTable({
        matchId: v.id("matches"),
        tournamentId: v.id("tournaments"),
        uid: v.optional(v.string()), // è§¦å‘äº‹ä»¶çš„çŽ©å®¶ï¼Œå¯é€‰
        eventType: v.string(), // "player_join", "player_leave", "score_submit", "prop_used", "match_start", "match_end"
        eventData: v.any(), // äº‹ä»¶ç›¸å…³æ•°æ®
        timestamp: v.string(),
        createdAt: v.string(),
    }).index("by_match", ["matchId"])
        .index("by_tournament", ["tournamentId"])
        .index("by_uid", ["uid"])
        .index("by_event_type", ["eventType"])
        .index("by_timestamp", ["timestamp"]),


    // é”¦æ ‡èµ›å‚èµ›è´¹ç”¨
    tournament_entry_fees: defineTable({
        uid: v.string(),
        tournamentId: v.string(),
        tournamentTypeId: v.string(),
        entryFee: v.any(),
        createdAt: v.string()
    })
        .index("by_uid", ["uid"])
        .index("by_tournamentId", ["tournamentId"]),

    seasons: defineTable({
        name: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        isActive: v.boolean(),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_isActive", ["isActive"]),

    // çŽ©å®¶å°è¯•æ¬¡æ•°ç»Ÿè®¡è¡¨ï¼ˆå¢žé‡ç¼“å­˜ï¼‰
    // ç”¨äºŽé«˜æ•ˆç»Ÿè®¡çŽ©å®¶åœ¨ç‰¹å®šæ—¶é—´èŒƒå›´å†…å‚ä¸Žç‰¹å®šç±»åž‹é”¦æ ‡èµ›çš„æ¬¡æ•°
    player_attempt_stats: defineTable({
        uid: v.string(),
        tournamentType: v.string(),
        timeRange: v.string(), // "daily" | "weekly" | "monthly" | "permanent"
        periodStart: v.string(), // æ—¶é—´æ®µå¼€å§‹æ—¶é—´ï¼ˆISOå­—ç¬¦ä¸²ï¼Œç”¨äºŽ daily/weekly/monthlyï¼‰
        attemptCount: v.number(), // å°è¯•æ¬¡æ•°
        lastUpdated: v.string(), // æœ€åŽæ›´æ–°æ—¶é—´
        createdAt: v.string(),
    }).index("by_uid_tournamentType", ["uid", "tournamentType"])
        .index("by_uid_tournamentType_period", ["uid", "tournamentType", "timeRange", "periodStart"])
        .index("by_tournamentType_period", ["tournamentType", "timeRange", "periodStart"]),
}; 

