
import { CharacterFactory } from "./model/CharacterFactory";
import { Character } from "./model/characters/Character";
import { DefaultSkillManager } from "./SkillManager";

import fs from 'fs/promises';

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

    // 从文件中加载角色数据
    private async loadCharacterDataFromFile(filePath: string): Promise<any | null> {
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
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
}

export default GameSkillManager;
