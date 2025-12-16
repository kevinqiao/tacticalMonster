import { defineSchema } from "convex/server";
import { bossSchema } from "./schemas/bossSchema";
import { chestSchema } from "./schemas/chestSchema";
import { tacticalMonsterSchema } from "./schemas/mainSchema";
import { monsterSchema } from "./schemas/monsterSchema";

export default defineSchema({

    ...tacticalMonsterSchema,
    ...chestSchema,
    ...monsterSchema,
    ...bossSchema,
});


