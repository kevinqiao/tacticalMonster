import { defineSchema } from "convex/server";
import { chestSchema } from "./schemas/chestSchema";
import { tacticalMonsterSchema } from "./schemas/mainSchema";
import { monsterSchema } from "./schemas/monsterSchema";

export default defineSchema({

    ...tacticalMonsterSchema,
    ...chestSchema,
    ...monsterSchema,
    // bossSchema 已移除，Boss数据现在存储在 mr_games.boss 字段中
});


