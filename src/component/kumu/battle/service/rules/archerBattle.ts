import { Engine } from 'json-rules-engine';
// 数据模型定义
interface Character {
    name: string;
    hp: number;
    max_hp: number;
    attack: number;
    defense: number;
    critChance: number;  // 暴击率
    cooldowns: Record<string, number>;
}

interface Enemy {
    name: string;
    hp: number;
    max_hp: number;
    defense: number;
}

// 弓箭手和敌人初始状态
const archer: Character = {
    name: "Archer",
    hp: 50,
    max_hp: 50,
    attack: 20,
    defense: 8,
    critChance: 0.25,  // 25% 的暴击率
    cooldowns: { piercing_shot: 0, multi_shot: 0, headshot: 0, evasion: 0 }
};

const enemy: Enemy = {
    name: "Orc Warrior",
    hp: 260,
    max_hp: 260,
    defense: 10
};

// 初始化规则引擎
const engine = new Engine();

// 穿透射击（Piercing Shot）规则
engine.addRule({
    conditions: {
        all: [
            { fact: 'cooldown', path: 'piercing_shot', operator: 'equal', value: 0 }
        ]
    },
    event: {
        type: 'piercing_shot',
        params: { damage: 15, ignoreDefense: 0.3 }
    },
    priority: 3
});

// 多重射击（Multi-Shot）规则
engine.addRule({
    conditions: {
        all: [
            { fact: 'cooldown', path: 'multi_shot', operator: 'equal', value: 0 }
        ]
    },
    event: {
        type: 'multi_shot',
        params: { hits: 2, damage: 10 }
    },
    priority: 2
});

// 爆头（Headshot）规则
engine.addRule({
    conditions: {
        all: [
            { fact: 'critChance', operator: 'greaterThan', value: Math.random() },
            { fact: 'cooldown', path: 'headshot', operator: 'equal', value: 0 }
        ]
    },
    event: {
        type: 'headshot',
        params: { multiplier: 2 }
    },
    priority: 4
});

// 闪避（Evasion）规则
engine.addRule({
    conditions: {
        all: [
            { fact: 'incoming_damage', operator: 'greaterThan', value: 0 },
            { fact: 'cooldown', path: 'evasion', operator: 'equal', value: 0 }
        ]
    },
    event: {
        type: 'evasion',
        params: { evadeChance: 0.4 }
    },
    priority: 1
});

// 攻击函数
async function attack(archer: Character, enemy: Enemy, incomingDamage = 0): Promise<void> {
    let baseDamage = archer.attack - enemy.defense;
    if (baseDamage < 0) baseDamage = 0;

    const facts = {
        critChance: archer.critChance,
        cooldown: archer.cooldowns,
        incoming_damage: incomingDamage
    };

    const { events } = await engine.run(facts);

    events.forEach((event: any) => {
        switch (event.type) {
            case 'piercing_shot':
                baseDamage += event.params.damage;
                baseDamage += enemy.defense * event.params.ignoreDefense;
                archer.cooldowns.piercing_shot = 3;
                console.log(`Piercing Shot activated! Damage: ${event.params.damage}. Ignored defense: ${event.params.ignoreDefense * 100}%`);
                break;

            case 'multi_shot': {
                let totalDamage = 0;
                for (let i = 0; i < event.params.hits; i++) {
                    totalDamage += event.params.damage;
                }
                baseDamage += totalDamage;
                archer.cooldowns.multi_shot = 2;
                console.log(`Multi-Shot activated! Total damage: ${totalDamage}`);
            }
                break;

            case 'headshot':
                baseDamage *= event.params.multiplier;
                archer.cooldowns.headshot = 4;
                console.log(`Headshot activated! Damage multiplier: ${event.params.multiplier}`);
                break;

            case 'evasion':
                if (Math.random() < event.params.evadeChance) {
                    console.log("Evasion activated! Attack missed.");
                    return;
                }
                break;
        }
    });

    enemy.hp -= baseDamage;
    console.log(`Archer attacks! Damage dealt: ${baseDamage}. Enemy HP: ${enemy.hp}`);

    if (enemy.hp <= 0) {
        console.log("Enemy defeated!");
    }
}

// 冷却时间更新函数
function updateCooldowns(character: Character): void {
    for (const skill in character.cooldowns) {
        if (character.cooldowns[skill] > 0) {
            character.cooldowns[skill]--;
        }
    }
}

// 战斗模拟
async function simulateBattle(archer: Character, enemy: Enemy, turns: number): Promise<void> {
    for (let turn = 1; turn <= turns; turn++) {
        console.log(`\n--- Turn ${turn} ---`);
        const incomingDamage = enemy.defense - archer.defense > 0 ? enemy.defense - archer.defense : 0;
        await attack(archer, enemy, incomingDamage);
        updateCooldowns(archer);

        console.log(`Archer status after Turn ${turn}:`, archer);
        console.log(`Enemy status after Turn ${turn}:`, enemy);

        if (enemy.hp <= 0) {
            console.log("Enemy defeated!");
            break;
        }
    }
}

// 执行战斗模拟
simulateBattle(archer, enemy, 5);
