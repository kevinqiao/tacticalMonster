/**
 * Character3DDemo 模拟角色数据
 * 支持所有 GLB 格式的角色模型
 */

import { ASSET_TYPE } from "../battle/types/CharacterTypes";
import { GameCharacter } from "../battle/types/CombatTypes";

/**
 * 根据模型路径和名称生成角色配置的辅助函数
 */
function createCharacterFromModel(
    id: string,
    name: string,
    modelPath: string,
    overrides: Partial<GameCharacter> = {}
): GameCharacter {
    // 根据名称判断角色类型和属性
    const nameLower = name.toLowerCase();

    // 判断是否是飞行单位（包含 dragon, fairy, harpy, griffin 等关键词）
    const isFlying = /dragon|fairy|harpy|griffin|angel|bird/.test(nameLower);

    // 判断是否是小型怪物（通常名称较短或有 minion 等关键词）
    const isMinion = /minion|goblin|orc|bunny|egg|hopper|marmot|jackal/.test(nameLower);

    // 根据名称判断职业和种族
    let characterClass = "战士";
    let race = "人族";

    if (/dragon|griffin|lion|tiger|wolf|bear|boar/.test(nameLower)) {
        race = "兽族";
    } else if (/fairy|element|shaman|witch/.test(nameLower)) {
        race = "精灵族";
        characterClass = /shaman|witch/.test(nameLower) ? "法师" : "游侠";
    } else if (/knight|paladin|warrior/.test(nameLower)) {
        characterClass = "骑士";
    } else if (/archer|sharpshooter|hunter/.test(nameLower)) {
        characterClass = "游侠";
    } else if (/shaman|wizard|mage|doctor/.test(nameLower)) {
        characterClass = "法师";
    } else if (/minion|orc|goblin/.test(nameLower)) {
        race = "兽族";
        characterClass = "战士";
    }

    // 根据职业和类型生成基础属性
    const baseLevel = Math.floor(Math.random() * 10) + 5;
    const baseExp = baseLevel * 50;

    let baseStats = {
        hp: { current: 100, max: 100 },
        mp: { current: 50, max: 50 },
        stamina: 80,
        attack: 20,
        defense: 12,
        speed: 15,
        crit_rate: 0.15,
        evasion: 0.1
    };

    if (characterClass === "法师") {
        baseStats = {
            hp: { current: 60, max: 60 },
            mp: { current: 120, max: 120 },
            stamina: 50,
            attack: 25,
            defense: 5,
            speed: 10,
            crit_rate: 0.2,
            evasion: 0.05
        };
    } else if (characterClass === "骑士") {
        baseStats = {
            hp: { current: 150, max: 150 },
            mp: { current: 40, max: 40 },
            stamina: 70,
            attack: 25,
            defense: 18,
            speed: 8,
            crit_rate: 0.1,
            evasion: 0.05
        };
    }

    // 生成基础属性值
    const baseAttributes = {
        strength: 15,
        dexterity: 12,
        constitution: 14,
        intelligence: 8,
        wisdom: 10,
        charisma: 11
    };

    return {
        character_id: id,
        uid: "demo",
        name: name,
        class: characterClass,
        race: race,
        level: baseLevel,
        experience: baseExp,
        q: 0,
        r: 0,
        scaleX: isMinion ? 1.2 : 1.5,
        attributes: baseAttributes,
        stats: baseStats,
        move_range: isFlying ? 4 : 3,
        attack_range: characterClass === "游侠" ? { min: 2, max: 5 } : { min: 1, max: 2 },
        isFlying: isFlying,
        flightHeight: isFlying ? 0.5 : undefined,
        canIgnoreObstacles: isFlying ? true : undefined,
        asset: {
            type: ASSET_TYPE.GLTF,
            resource: {
                glb: modelPath,
            }
        },
        ...overrides
    };
}

/**
 * 所有可用的模型路径列表（按字母顺序）
 */
const ALL_MODELS: Array<{ name: string; path: string }> = [
    { name: "Akedia", path: "/assets/3d/characters/akedia/model/akedia.glb" },
    { name: "Alien", path: "/assets/3d/characters/alien/model/alien.glb" },
    { name: "Apollo", path: "/assets/3d/characters/apollo/model/apollo.glb" },
    { name: "Arcanewitch Redhat", path: "/assets/3d/characters/arcanewitch_redhat/model/arcanewitch_redhat.glb" },
    { name: "Archer", path: "/assets/3d/characters/archer/model/archer.glb" },
    { name: "Arctic Shaman", path: "/assets/3d/characters/arcticshaman/model/arcticshaman.glb" },
    { name: "Arctic Totem", path: "/assets/3d/characters/arctictotem/model/arctictotem.glb" },
    { name: "Ares", path: "/assets/3d/characters/ares/model/ares.glb" },
    { name: "Ares Darkwarrior", path: "/assets/3d/characters/ares_darkwarrior/model/ares_darkwarrior.glb" },
    { name: "Assassin", path: "/assets/3d/characters/assassin/model/assassin.glb" },
    { name: "Athena", path: "/assets/3d/characters/athena/model/athena.glb" },
    { name: "Azar", path: "/assets/3d/characters/azar/model/azar.glb" },
    { name: "Bajie", path: "/assets/3d/characters/bajie/model/bajie.glb" },
    { name: "Batory", path: "/assets/3d/characters/batory/model/batory.glb" },
    { name: "Bear Warrior", path: "/assets/3d/characters/bearwarrior/model/bearwarrior.glb" },
    { name: "Bear Warrior Cook", path: "/assets/3d/characters/bearwarrior_cook/model/bearwarrior_cook.glb" },
    { name: "Boar", path: "/assets/3d/characters/boar/model/boar.glb" },
    { name: "Boar Punk", path: "/assets/3d/characters/boar_punk/model/boar_punk.glb" },
    { name: "Bombcrag", path: "/assets/3d/characters/bombcrag/model/bombcrag.glb" },
    { name: "Bunny", path: "/assets/3d/characters/bunny/model/bunny.glb" },
    { name: "Bunny Hat", path: "/assets/3d/characters/bunny_hat/model/bunny_hat.glb" },
    { name: "Bunnybig", path: "/assets/3d/characters/bunnybig/model/bunnybig.glb" },
    { name: "Bunnybig Hat", path: "/assets/3d/characters/bunnybig_hat/model/bunnybig_hat.glb" },
    { name: "Centaur", path: "/assets/3d/characters/centaur/model/centaur.glb" },
    { name: "Cervitaur", path: "/assets/3d/characters/cervitaur/model/cervitaur.glb" },
    { name: "Change", path: "/assets/3d/characters/change/model/change.glb" },
    { name: "Change Icy", path: "/assets/3d/characters/change_icy/model/change_icy.glb" },
    { name: "Chinese Lion", path: "/assets/3d/characters/chineselion/model/chineselion.glb" },
    { name: "Chomper", path: "/assets/3d/characters/chomper/model/chomper.glb" },
    { name: "Christmas Tree", path: "/assets/3d/characters/christmastree/model/christmastree.glb" },
    { name: "Clownbox", path: "/assets/3d/characters/clownbox/model/clownbox.glb" },
    { name: "Crocodile", path: "/assets/3d/characters/crocodile/model/crocodile.glb" },
    { name: "Cupid", path: "/assets/3d/characters/cupid/model/cupid.glb" },
    { name: "Death", path: "/assets/3d/characters/death/model/death.glb" },
    { name: "Death Pumpkin", path: "/assets/3d/characters/death_pumpkin/model/death_pumpkin.glb" },
    { name: "Earth Element", path: "/assets/3d/characters/earthelement/model/earthelement.glb" },
    { name: "Egg", path: "/assets/3d/characters/egg/model/egg.glb" },
    { name: "Elephant", path: "/assets/3d/characters/elephant/model/elephant.glb" },
    { name: "Ent", path: "/assets/3d/characters/ent/model/ent.glb" },
    { name: "Faerie Dragon", path: "/assets/3d/characters/faeriedragon/model/faeriedragon.glb" },
    { name: "Fairy", path: "/assets/3d/characters/fairy/model/fairy.glb" },
    { name: "Fairy Flower", path: "/assets/3d/characters/fairy_flower/model/fairy_flower.glb" },
    { name: "Fiammetta", path: "/assets/3d/characters/fiammetta/model/fiammetta.glb" },
    { name: "Fire Dragon", path: "/assets/3d/characters/firedragon/model/firedragon.glb" },
    { name: "Fire Dragon Bone", path: "/assets/3d/characters/firedragon_bonedragon/model/firedragon_bonedragon.glb" },
    { name: "Forest Drummer", path: "/assets/3d/characters/forestdrummer/model/forestdrummer.glb" },
    { name: "Frankenstein", path: "/assets/3d/characters/frankenstein/model/frankenstein.glb" },
    { name: "Ginger", path: "/assets/3d/characters/ginger/model/ginger.glb" },
    { name: "Goblin Gamer", path: "/assets/3d/characters/goblingamer/model/goblingamer.glb" },
    { name: "Griffin", path: "/assets/3d/characters/griffin/model/griffin.glb" },
    { name: "Griffin Machine", path: "/assets/3d/characters/griffin_machine/model/griffin_machine.glb" },
    { name: "Harpy", path: "/assets/3d/characters/harpy/model/harpy.glb" },
    { name: "Heliantos", path: "/assets/3d/characters/heliantos/model/heliantos.glb" },
    { name: "Heliantos Dandelion", path: "/assets/3d/characters/heliantos_dandelion/model/heliantos_dandelion.glb" },
    { name: "Hellboy", path: "/assets/3d/characters/hellboy/model/hellboy.glb" },
    { name: "Hellboy General", path: "/assets/3d/characters/hellboy_general/model/hellboy_general.glb" },
    { name: "Hitalot", path: "/assets/3d/characters/hitalot/model/hitalot.glb" },
    { name: "Hopper", path: "/assets/3d/characters/hopper/model/hopper.glb" },
    { name: "Ice Cart", path: "/assets/3d/characters/icecart/model/icecart.glb" },
    { name: "Ice Commander", path: "/assets/3d/characters/icecommonder/model/icecommonder.glb" },
    { name: "Ice Commander Hammerfrost", path: "/assets/3d/characters/icecommonder_hammerfrost/model/icecommonder_hammerfrost.glb" },
    { name: "Ice Sucker", path: "/assets/3d/characters/icesucker/model/icesucker.glb" },
    { name: "Ice Sucker Hammerfrost", path: "/assets/3d/characters/icesucker_hammerfrost/model/icesucker_hammerfrost.glb" },
    { name: "Ice Sucker Plus", path: "/assets/3d/characters/icesuckerplus/model/icesuckerplus.glb" },
    { name: "Ice Sucker Plus Hammerfrost", path: "/assets/3d/characters/icesuckerplus_hammerfrost/model/icesuckerplus_hammerfrost.glb" },
    { name: "Ice Sucker Special", path: "/assets/3d/characters/icesuckerspecial/model/icesuckerspecial.glb" },
    { name: "Ice Sucker Special Hammerfrost", path: "/assets/3d/characters/icesuckerspecial_hammerfrost/model/icesuckerspecial_hammerfrost.glb" },
    { name: "Infantry", path: "/assets/3d/characters/infantry/model/infantry.glb" },
    { name: "Jackal", path: "/assets/3d/characters/jackal/model/jackal.glb" },
    { name: "Jackmouse", path: "/assets/3d/characters/jackmouse/model/jackmouse.glb" },
    { name: "Jungle Shaman", path: "/assets/3d/characters/jungleshaman/model/jungleshaman.glb" },
    { name: "Kabuto", path: "/assets/3d/characters/kabuto/model/kabuto.glb" },
    { name: "Karasu", path: "/assets/3d/characters/karasu/model/karasu.glb" },
    { name: "Knight", path: "/assets/3d/characters/knight/model/knight.glb" },
    { name: "Knight Motor", path: "/assets/3d/characters/knight_motor/model/knight_motor.glb" },
    { name: "Lamp", path: "/assets/3d/characters/lamp/model/lamp.glb" },
    { name: "Lava Dolphin", path: "/assets/3d/characters/lavadolphin/model/lavadolphin.glb" },
    { name: "Liberty", path: "/assets/3d/characters/liberty/model/liberty.glb" },
    { name: "Lion", path: "/assets/3d/characters/lion/model/lion.glb" },
    { name: "Little Centaur", path: "/assets/3d/characters/littlecentaur/model/littlecentaur.glb" },
    { name: "Longicorn", path: "/assets/3d/characters/longicorn/model/longicorn.glb" },
    { name: "Mad Robot", path: "/assets/3d/characters/madrobot/model/madrobot.glb" },
    { name: "Marmot Miner", path: "/assets/3d/characters/marmotminer/model/marmotminer.glb" },
    { name: "Marmot Miner Rich", path: "/assets/3d/characters/marmotminer_rich/model/marmotminer_rich.glb" },
    { name: "Matryoshka 1", path: "/assets/3d/characters/matryoshka1/model/matryoshka1.glb" },
    { name: "Matryoshka 2", path: "/assets/3d/characters/matryoshka/skill/matryoshka2/model/matryoshka2.glb" },
    { name: "Mecha Doctor", path: "/assets/3d/characters/mechadoctor/model/mechadoctor.glb" },
    { name: "Medusa", path: "/assets/3d/characters/medusa/model/medusa.glb" },
    { name: "Medusa Lava", path: "/assets/3d/characters/medusa_lava/model/medusa_lava.glb" },
    { name: "Mulan", path: "/assets/3d/characters/mulan/model/mulan.glb" },
    { name: "Orc", path: "/assets/3d/characters/orc/model/orc.glb" },
    { name: "Orc Warrior", path: "/assets/3d/characters/orcwarrior/model/orcwarrior.glb" },
    { name: "Orc Warrior Blackarmor", path: "/assets/3d/characters/orcwarrior_blackarmor/model/orcwarrior_blackarmor.glb" },
    { name: "Paladin", path: "/assets/3d/characters/paladin/model/paladin.glb" },
    { name: "Paladin Darkknight", path: "/assets/3d/characters/paladin_darkknight/model/paladin_darkknight.glb" },
    { name: "Panda", path: "/assets/3d/characters/panda/model/panda.glb" },
    { name: "Panda Mecha", path: "/assets/3d/characters/panda_mecha/model/panda_mecha.glb" },
    { name: "Panda Monk", path: "/assets/3d/characters/panda_monk/model/panda_monk.glb" },
    { name: "Pastor", path: "/assets/3d/characters/pastor/model/pastor.glb" },
    { name: "Patrick", path: "/assets/3d/characters/patrick/model/patrick.glb" },
    { name: "Phobos", path: "/assets/3d/characters/phobos/model/phobos.glb" },
    { name: "Pukak", path: "/assets/3d/characters/pukak/model/pukak.glb" },
    { name: "Puppetboxer", path: "/assets/3d/characters/puppetboxer/model/puppetboxer.glb" },
    { name: "Santa", path: "/assets/3d/characters/santa/model/santa.glb" },
    { name: "Shadow Minion", path: "/assets/3d/characters/shadowminion/model/shadowminion.glb" },
    { name: "Shadow Minion Pumpkin", path: "/assets/3d/characters/shadowminion_pumpkin/model/shadowminion_pumpkin.glb" },
    { name: "Shaman", path: "/assets/3d/characters/shaman/model/shaman.glb" },
    { name: "Sharpshooter", path: "/assets/3d/characters/sharpshooter/model/sharpshooter.glb" },
    { name: "Skin Cupid Nurse", path: "/assets/3d/characters/skincupidnurse/model/skincupidnurse.glb" },
    { name: "Snow Maiden", path: "/assets/3d/characters/snowmaiden/model/snowmaiden.glb" },
    { name: "Sumo", path: "/assets/3d/characters/sumo/model/sumo.glb" },
    { name: "Surrender", path: "/assets/3d/characters/surrender/model/surrender.glb" },
    { name: "Talis", path: "/assets/3d/characters/talis/model/talis.glb" },
    { name: "Talis Cat", path: "/assets/3d/characters/talis_cat/model/talis_cat.glb" },
    { name: "Tauren", path: "/assets/3d/characters/tauren/model/tauren.glb" },
    { name: "Thor", path: "/assets/3d/characters/thor/model/thor.glb" },
    { name: "Tiger", path: "/assets/3d/characters/tiger/model/tiger.glb" },
    { name: "Time Master", path: "/assets/3d/characters/timemaster/model/timemaster.glb" },
    { name: "Time Master Green", path: "/assets/3d/characters/timemaster_green/model/timemaster_green.glb" },
    { name: "Trap Addap", path: "/assets/3d/characters/trapaddap/model/trapaddap.glb" },
    { name: "Trap Speedinc", path: "/assets/3d/characters/trapspeedinc/model/trapspeedinc.glb" },
    { name: "Trap Takedamage", path: "/assets/3d/characters/traptakedamage/model/traptakedamage.glb" },
    { name: "Turkey", path: "/assets/3d/characters/turkey/model/turkey.glb" },
    { name: "Turtle Captain", path: "/assets/3d/characters/turtulecaptain/model/turtulecaptain.glb" },
    { name: "Turtle Captain Diamond", path: "/assets/3d/characters/turtulecaptain_diamond/model/turtulecaptain_diamond.glb" },
    { name: "Turtle Captain Koopa", path: "/assets/3d/characters/turtulecaptain_koopa/model/turtulecaptain_koopa.glb" },
    { name: "Valkyrie", path: "/assets/3d/characters/valkyrie/model/valkyrie.glb" },
    { name: "Werewolf", path: "/assets/3d/characters/werewolf/model/werewolf.glb" },
    { name: "Wild Referee", path: "/assets/3d/characters/wildreferee/model/wildreferee.glb" },
    { name: "Wujing", path: "/assets/3d/characters/wujing/model/wujing.glb" },
    { name: "Yeti", path: "/assets/3d/characters/yeti/model/yeti.glb" },
];

/**
 * 保留原有的详细配置角色（作为示例和测试）
 */
export const mockCharacters: GameCharacter[] = [
    // 原有详细配置的角色
    {
        character_id: "char_demo_1",
        uid: "demo",
        name: "孙悟空",
        class: "战士",
        race: "猴族",
        level: 10,
        experience: 500,
        q: 0,
        r: 0,
        scaleX: 1.5,
        attributes: {
            strength: 15,
            dexterity: 12,
            constitution: 14,
            intelligence: 8,
            wisdom: 10,
            charisma: 11
        },
        stats: {
            hp: { current: 100, max: 100 },
            mp: { current: 50, max: 50 },
            stamina: 80,
            attack: 20,
            defense: 12,
            speed: 15,
            crit_rate: 0.15,
            evasion: 0.1
        },
        move_range: 3,
        attack_range: { min: 1, max: 2 },
        isFlying: true,
        flightHeight: 0.5,
        canIgnoreObstacles: true,
        asset: {
            type: ASSET_TYPE.FBX,
            resource: {
                fbx: "/assets/3d/characters/wukong/model/wukong.fbx",
                glb: "/assets/3d/characters/wukong/model/wukong.glb"
            }
        }
    },
    {
        character_id: "char_demo_2",
        uid: "demo",
        name: "法师",
        class: "魔法师",
        race: "人族",
        level: 8,
        experience: 300,
        q: 0,
        r: 0,
        scaleX: 1.5,
        attributes: {
            strength: 5,
            dexterity: 8,
            constitution: 6,
            intelligence: 18,
            wisdom: 15,
            charisma: 12
        },
        stats: {
            hp: { current: 60, max: 60 },
            mp: { current: 120, max: 120 },
            stamina: 50,
            attack: 25,
            defense: 5,
            speed: 10,
            crit_rate: 0.2,
            evasion: 0.05
        },
        move_range: 2,
        attack_range: { min: 2, max: 5 },
        asset: {
            type: ASSET_TYPE.FBX,
            resource: {
                glb: "/assets/3d/characters/yeti/model/yeti.glb",
                fbx: "/assets/3d/characters/yeti/model/yeti.fbx"
            }
        }
    },
    // 自动生成所有其他模型
    ...ALL_MODELS.map((model, index) =>
        createCharacterFromModel(
            `char_glb_${index + 1}`,
            model.name,
            model.path
        )
    )
];

/**
 * 获取所有可用的角色名称列表（用于下拉选择等）
 */
export const getAllCharacterNames = (): string[] => {
    return mockCharacters
        .map(char => char.name)
        .filter((name): name is string => name !== undefined);
};

/**
 * 根据名称查找角色
 */
export const findCharacterByName = (name: string): GameCharacter | undefined => {
    return mockCharacters.find(char => char.name === name);
};

/**
 * 根据模型路径查找角色
 */
export const findCharacterByModelPath = (path: string): GameCharacter | undefined => {
    return mockCharacters.find(char =>
        char.asset?.resource?.glb === path ||
        char.asset?.resource?.fbx === path
    );
};
