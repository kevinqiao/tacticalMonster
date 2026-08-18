import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const heroSnapshot = v.object({
  uid: v.string(),
  monsterId: v.string(),
  heroId: v.string(),
  name: v.string(),
  rarity: v.string(),
  class: v.string(),
  assetPath: v.string(),
  level: v.number(),
  stars: v.number(),
  stats: v.object({
    hp: v.object({ current: v.number(), max: v.number() }),
    attack: v.number(),
    defense: v.number(),
    speed: v.number(),
  }),
  q: v.number(),
  r: v.number(),
  status: v.string(),
});

const bossSnapshot = v.object({
  bossId: v.string(),
  monsterId: v.string(),
  name: v.string(),
  tags: v.array(v.string()),
  hp: v.number(),
  damage: v.number(),
  defense: v.number(),
  speed: v.number(),
  assetPath: v.string(),
  position: v.object({ q: v.number(), r: v.number() }),
  minions: v.array(v.any()),
  uid: v.literal("boss"),
  rarity: v.string(),
  class: v.string(),
  level: v.number(),
  stars: v.number(),
  stats: v.object({
    hp: v.object({ current: v.number(), max: v.number() }),
    attack: v.number(),
    defense: v.number(),
    speed: v.number(),
  }),
  q: v.number(),
  r: v.number(),
  status: v.string(),
});

export default defineSchema({
  ca_games: defineTable({
    gameId: v.string(),
    matchId: v.optional(v.string()),
    stageId: v.string(),
    uid: v.string(),
    seedId: v.string(),
    teamPower: v.number(),
    team: v.array(heroSnapshot),
    boss: bossSnapshot,
    map: v.object({
      mapId: v.string(),
      name: v.string(),
      rows: v.number(),
      cols: v.number(),
      obstacles: v.array(v.object({ q: v.number(), r: v.number() })),
      disables: v.array(v.object({ q: v.number(), r: v.number() })),
    }),
    loadout: v.array(v.string()),
    status: v.number(),
    score: v.number(),
    lastUpdate: v.string(),
    createdAt: v.string(),
    round: v.number(),
  }).index("by_gameId", ["gameId"]),

  ca_player_heroes: defineTable({
    uid: v.string(),
    heroId: v.string(),
    copies: v.number(),
    source: v.string(),
    disenchantable: v.boolean(),
  })
    .index("by_uid", ["uid"])
    .index("by_uid_hero", ["uid", "heroId"]),

  ca_player_dust: defineTable({
    uid: v.string(),
    dust: v.number(),
  }).index("by_uid", ["uid"]),

  ca_game_events: defineTable({
    gameId: v.string(),
    name: v.string(),
    time: v.number(),
    data: v.optional(v.any()),
  }).index("by_gameId", ["gameId"]),
});
