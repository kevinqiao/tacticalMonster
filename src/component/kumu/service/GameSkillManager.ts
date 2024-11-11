
import { CharacterFactory } from "./model/CharacterFactory";
import { Character } from "./model/characters/Character";
import { Attributes, Skill, Stats } from "./model/characters/CharacterAttributes";
import { Mage } from "./model/characters/Mage";
import { Warrior } from "./model/characters/Warrior";
import { DefaultSkillManager } from "./SkillManager";

class GameSkillManager {
    private characters: Map<string, Character> = new Map();
    private skillManagers: Map<string, DefaultSkillManager> = new Map();

    // 加载角色数据并创建 Character 实例
    async loadCharacter(characterId: string) {
        try {
            const dataFilePath = `/data/characters/${characterId}_data.json`;
            const skillFilePath = `/data/skills/${characterId}_skills.json`;

            // 加载角色数据
            const characterData = await this.loadCharacterDataFromFile(dataFilePath);
            if (!characterData) {
                throw new Error(`Character data for ID ${characterId} not found.`);
            }

            // 使用工厂动态创建角色实例
            const skillManager = new DefaultSkillManager(characterData, skillFilePath);
            const character = CharacterFactory.createCharacter(
                characterData.class,  // 从数据中读取角色类型
                characterData._id,
                characterData.name,
                characterData.attributes,
                characterData.stats,
                skillManager
            );

            this.characters.set(character._id, character);
            this.skillManagers.set(character._id, skillManager);
        } catch (error) {
            console.error(`Failed to load character ${characterId}:`, error);
        }
    }

    private async loadCharacterDataFromFile(filePath: string): Promise<any | null> {
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error loading file ${filePath}:`, error);
            return null;
        }
    }

    // 获取角色实例
    getCharacter(characterId: string): Character | undefined {
        return this.characters.get(characterId);
    }

    // 更新所有角色的冷却时间
    updateAllCooldowns() {
        this.skillManagers.forEach(skillManager => skillManager.updateCooldowns());
    }

    // 处理事件并传递给角色的技能管理器
    handleEvent(eventType: string, characterId: string) {
        const character = this.getCharacter(characterId);
        if (character) {
            character.skillManager.checkPassiveSkills(eventType);
        }
    }

    getInit() {
        // 定义技能的示例
        const fireballSkill: Skill = {
            skill_id: "fireball",
            name: "火球术",
            description: "对敌人造成火焰伤害",
            type: "attack",
            range: { area_type: "single", distance: 3 },
            effects: [
                { effect_id: "fire_damage", name: "火焰伤害", effect_type: "damage", target_attribute: "hp", value: 25, remaining_duration: 1 }
            ],
            requirements: { min_level: 1, required_class: "Mage", required_skills: [] },
            resource_cost: { mp: 10, hp: 0 },
            cooldown: 2,
            upgrade_path: [],
            is_passive: false,
            trigger_conditions: [],
            tags: ["fire"]
        };

        const powerStrikeSkill: Skill = {
            skill_id: "power_strike",
            name: "强力攻击",
            description: "对敌人造成巨大的物理伤害",
            type: "attack",
            range: { area_type: "single", distance: 1 },
            effects: [
                { effect_id: "physical_damage", name: "物理伤害", effect_type: "damage", target_attribute: "hp", value: 30, remaining_duration: 1 }
            ],
            requirements: { min_level: 1, required_class: "Warrior", required_skills: [] },
            resource_cost: { mp: 0, hp: 0, stamina: 5 },
            cooldown: 3,
            upgrade_path: [],
            is_passive: false,
            trigger_conditions: [],
            tags: ["physical"]
        };

        // 初始化角色属性和状态
        const mageAttributes: Attributes = { strength: 5, dexterity: 8, constitution: 8, intelligence: 15, wisdom: 12, charisma: 6 };
        const mageStats: Stats = { hp: { current: 60, max: 60 }, mp: { current: 40, max: 40 }, stamina: { current: 20, max: 20 }, attack: 8, defense: 5, speed: 7, crit_rate: 0.1, evasion: 0.1 };

        const warriorAttributes: Attributes = { strength: 12, dexterity: 10, constitution: 15, intelligence: 5, wisdom: 6, charisma: 4 };
        const warriorStats: Stats = { hp: { current: 100, max: 100 }, mp: { current: 20, max: 20 }, stamina: { current: 30, max: 30 }, attack: 15, defense: 10, speed: 5, crit_rate: 0.15, evasion: 0.05 };

        const mage = new Mage("0001", "Gandalf", 1, mageAttributes, { weapon_bonus: 100, armor_bonus: 100 });
        const warrior = new Warrior("0002", "Arthur", 1, warriorAttributes, { weapon_bonus: 100, armor_bonus: 100 });

        // 创建角色和技能管理器
        const mageSkillManager = new DefaultSkillManager(mage, "./skills/mageSkills.json");
        const warriorSkillManager = new DefaultSkillManager(warrior, "./skills/warriorSkills.json");
        mage.setSkillManager(mageSkillManager);
        warrior.setSkillManager(warriorSkillManager)

        // 执行技能示例
        mage.useFireball(warrior);     // Mage 使用火球术攻击 Warrior
        warrior.usePowerStrike(mage);  // Warrior 使用强力攻击攻击 Mage

    }
}

export default GameSkillManager;
