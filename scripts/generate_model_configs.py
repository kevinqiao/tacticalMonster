#!/usr/bin/env python3
"""
生成所有模型的配置文件
根据模型名称智能判断配置参数
"""

import json
import os

# 所有模型列表（从 GLB_MODELS_LIST.md 提取）
ALL_MODELS = [
    "/assets/3d/characters/akedia/model/akedia.glb",
    "/assets/3d/characters/alien/model/alien.glb",
    "/assets/3d/characters/apollo/model/apollo.glb",
    "/assets/3d/characters/arcanewitch_redhat/model/arcanewitch_redhat.glb",
    "/assets/3d/characters/archer/model/archer.glb",
    "/assets/3d/characters/arcticshaman/model/arcticshaman.glb",
    "/assets/3d/characters/arctictotem/model/arctictotem.glb",
    "/assets/3d/characters/ares/model/ares.glb",
    "/assets/3d/characters/ares_darkwarrior/model/ares_darkwarrior.glb",
    "/assets/3d/characters/assassin/model/assassin.glb",
    "/assets/3d/characters/athena/model/athena.glb",
    "/assets/3d/characters/azar/model/azar.glb",
    "/assets/3d/characters/bajie/model/bajie.glb",
    "/assets/3d/characters/batory/model/batory.glb",
    "/assets/3d/characters/bearwarrior/model/bearwarrior.glb",
    "/assets/3d/characters/bearwarrior_cook/model/bearwarrior_cook.glb",
    "/assets/3d/characters/boar/model/boar.glb",
    "/assets/3d/characters/boar_punk/model/boar_punk.glb",
    "/assets/3d/characters/bombcrag/model/bombcrag.glb",
    "/assets/3d/characters/bunny/model/bunny.glb",
    "/assets/3d/characters/bunny_hat/model/bunny_hat.glb",
    "/assets/3d/characters/bunnybig/model/bunnybig.glb",
    "/assets/3d/characters/bunnybig_hat/model/bunnybig_hat.glb",
    "/assets/3d/characters/centaur/model/centaur.glb",
    "/assets/3d/characters/cervitaur/model/cervitaur.glb",
    "/assets/3d/characters/change/model/change.glb",
    "/assets/3d/characters/change_icy/model/change_icy.glb",
    "/assets/3d/characters/chineselion/model/chineselion.glb",
    "/assets/3d/characters/chomper/model/chomper.glb",
    "/assets/3d/characters/christmastree/model/christmastree.glb",
    "/assets/3d/characters/clownbox/model/clownbox.glb",
    "/assets/3d/characters/crocodile/model/crocodile.glb",
    "/assets/3d/characters/cupid/model/cupid.glb",
    "/assets/3d/characters/death/model/death.glb",
    "/assets/3d/characters/death_pumpkin/model/death_pumpkin.glb",
    "/assets/3d/characters/earthelement/model/earthelement.glb",
    "/assets/3d/characters/egg/model/egg.glb",
    "/assets/3d/characters/elephant/model/elephant.glb",
    "/assets/3d/characters/ent/model/ent.glb",
    "/assets/3d/characters/faeriedragon/model/faeriedragon.glb",
    "/assets/3d/characters/fairy/model/fairy.glb",
    "/assets/3d/characters/fairy_flower/model/fairy_flower.glb",
    "/assets/3d/characters/fiammetta/model/fiammetta.glb",
    "/assets/3d/characters/firedragon/model/firedragon.glb",
    "/assets/3d/characters/firedragon_bonedragon/model/firedragon_bonedragon.glb",
    "/assets/3d/characters/forestdrummer/model/forestdrummer.glb",
    "/assets/3d/characters/frankenstein/model/frankenstein.glb",
    "/assets/3d/characters/ginger/model/ginger.glb",
    "/assets/3d/characters/goblingamer/model/goblingamer.glb",
    "/assets/3d/characters/griffin/model/griffin.glb",
    "/assets/3d/characters/griffin_machine/model/griffin_machine.glb",
    "/assets/3d/characters/harpy/model/harpy.glb",
    "/assets/3d/characters/heliantos/model/heliantos.glb",
    "/assets/3d/characters/heliantos_dandelion/model/heliantos_dandelion.glb",
    "/assets/3d/characters/hellboy/model/hellboy.glb",
    "/assets/3d/characters/hellboy_general/model/hellboy_general.glb",
    "/assets/3d/characters/hitalot/model/hitalot.glb",
    "/assets/3d/characters/hopper/model/hopper.glb",
    "/assets/3d/characters/icecart/model/icecart.glb",
    "/assets/3d/characters/icecommonder/model/icecommonder.glb",
    "/assets/3d/characters/icecommonder_hammerfrost/model/icecommonder_hammerfrost.glb",
    "/assets/3d/characters/icesucker/model/icesucker.glb",
    "/assets/3d/characters/icesucker_hammerfrost/model/icesucker_hammerfrost.glb",
    "/assets/3d/characters/icesuckerplus/model/icesuckerplus.glb",
    "/assets/3d/characters/icesuckerplus_hammerfrost/model/icesuckerplus_hammerfrost.glb",
    "/assets/3d/characters/icesuckerspecial/model/icesuckerspecial.glb",
    "/assets/3d/characters/icesuckerspecial_hammerfrost/model/icesuckerspecial_hammerfrost.glb",
    "/assets/3d/characters/infantry/model/infantry.glb",
    "/assets/3d/characters/jackal/model/jackal.glb",
    "/assets/3d/characters/jackmouse/model/jackmouse.glb",
    "/assets/3d/characters/jungleshaman/model/jungleshaman.glb",
    "/assets/3d/characters/kabuto/model/kabuto.glb",
    "/assets/3d/characters/karasu/model/karasu.glb",
    "/assets/3d/characters/knight/model/knight.glb",
    "/assets/3d/characters/knight_motor/model/knight_motor.glb",
    "/assets/3d/characters/lamp/model/lamp.glb",
    "/assets/3d/characters/lavadolphin/model/lavadolphin.glb",
    "/assets/3d/characters/liberty/model/liberty.glb",
    "/assets/3d/characters/lion/model/lion.glb",
    "/assets/3d/characters/littlecentaur/model/littlecentaur.glb",
    "/assets/3d/characters/longicorn/model/longicorn.glb",
    "/assets/3d/characters/madrobot/model/madrobot.glb",
    "/assets/3d/characters/marmotminer/model/marmotminer.glb",
    "/assets/3d/characters/marmotminer_rich/model/marmotminer_rich.glb",
    "/assets/3d/characters/matryoshka1/model/matryoshka1.glb",
    "/assets/3d/characters/matryoshka/skill/matryoshka2/model/matryoshka2.glb",
    "/assets/3d/characters/mechadoctor/model/mechadoctor.glb",
    "/assets/3d/characters/medusa/model/medusa.glb",
    "/assets/3d/characters/medusa_lava/model/medusa_lava.glb",
    "/assets/3d/characters/mulan/model/mulan.glb",
    "/assets/3d/characters/orc/model/orc.glb",
    "/assets/3d/characters/orcwarrior/model/orcwarrior.glb",
    "/assets/3d/characters/orcwarrior_blackarmor/model/orcwarrior_blackarmor.glb",
    "/assets/3d/characters/paladin/model/paladin.glb",
    "/assets/3d/characters/paladin_darkknight/model/paladin_darkknight.glb",
    "/assets/3d/characters/panda/model/panda.glb",
    "/assets/3d/characters/panda_mecha/model/panda_mecha.glb",
    "/assets/3d/characters/panda_monk/model/panda_monk.glb",
    "/assets/3d/characters/pastor/model/pastor.glb",
    "/assets/3d/characters/patrick/model/patrick.glb",
    "/assets/3d/characters/phobos/model/phobos.glb",
    "/assets/3d/characters/pukak/model/pukak.glb",
    "/assets/3d/characters/puppetboxer/model/puppetboxer.glb",
    "/assets/3d/characters/santa/model/santa.glb",
    "/assets/3d/characters/shadowminion/model/shadowminion.glb",
    "/assets/3d/characters/shadowminion_pumpkin/model/shadowminion_pumpkin.glb",
    "/assets/3d/characters/shaman/model/shaman.glb",
    "/assets/3d/characters/sharpshooter/model/sharpshooter.glb",
    "/assets/3d/characters/skincupidnurse/model/skincupidnurse.glb",
    "/assets/3d/characters/snowmaiden/model/snowmaiden.glb",
    "/assets/3d/characters/sumo/model/sumo.glb",
    "/assets/3d/characters/surrender/model/surrender.glb",
    "/assets/3d/characters/talis/model/talis.glb",
    "/assets/3d/characters/talis_cat/model/talis_cat.glb",
    "/assets/3d/characters/tauren/model/tauren.glb",
    "/assets/3d/characters/thor/model/thor.glb",
    "/assets/3d/characters/tiger/model/tiger.glb",
    "/assets/3d/characters/timemaster/model/timemaster.glb",
    "/assets/3d/characters/timemaster_green/model/timemaster_green.glb",
    "/assets/3d/characters/trapaddap/model/trapaddap.glb",
    "/assets/3d/characters/trapspeedinc/model/trapspeedinc.glb",
    "/assets/3d/characters/traptakedamage/model/traptakedamage.glb",
    "/assets/3d/characters/turkey/model/turkey.glb",
    "/assets/3d/characters/turtulecaptain/model/turtulecaptain.glb",
    "/assets/3d/characters/turtulecaptain_diamond/model/turtulecaptain_diamond.glb",
    "/assets/3d/characters/turtulecaptain_koopa/model/turtulecaptain_koopa.glb",
    "/assets/3d/characters/valkyrie/model/valkyrie.glb",
    "/assets/3d/characters/werewolf/model/werewolf.glb",
    "/assets/3d/characters/wildreferee/model/wildreferee.glb",
    "/assets/3d/characters/wujing/model/wujing.glb",
    "/assets/3d/characters/yeti/model/yeti.glb",
]

def get_model_name(path):
    """从路径提取模型名称"""
    parts = path.split('/')
    if 'model' in parts:
        model_idx = parts.index('model')
        if model_idx > 0:
            return parts[model_idx - 1]
    return parts[-1].replace('.glb', '').replace('.GLB', '')

def should_mirror(model_name):
    """判断是否应该镜像（小怪通常需要镜像）"""
    minion_keywords = ['minion', 'goblin', 'orc', 'bunny', 'egg', 'hopper', 'marmot', 'jackal', 'akedia']
    return any(keyword in model_name.lower() for keyword in minion_keywords)

def get_scale(model_name, path):
    """根据模型名称和路径判断缩放比例"""
    name_lower = model_name.lower()
    
    # 特殊模型（已有配置）
    if 'akedia' in name_lower:
        return 0.2
    if 'yeti' in name_lower:
        return 1.5
    
    # 小型模型
    if any(kw in name_lower for kw in ['minion', 'bunny', 'egg', 'hopper', 'jackal', 'little']):
        return 1.2
    
    # 大型模型
    if any(kw in name_lower for kw in ['dragon', 'elephant', 'ent', 'bear', 'tauren', 'sumo']):
        return 1.8
    
    # 中等模型
    if any(kw in name_lower for kw in ['warrior', 'knight', 'paladin', 'chineselion', 'lion', 'tiger']):
        return 1.5
    
    # 默认
    return 1.0

def get_vertical_offset(model_name):
    """根据模型类型判断垂直偏移"""
    name_lower = model_name.lower()
    
    # 小型模型需要更大的向下偏移
    if any(kw in name_lower for kw in ['minion', 'bunny', 'egg', 'hopper', 'jackal', 'akedia']):
        return -15.0
    
    # 大型模型可能需要更小的偏移
    if any(kw in name_lower for kw in ['dragon', 'elephant', 'ent']):
        return -3.0
    
    # 默认
    return -5.0

def generate_config_for_model(path):
    """为单个模型生成配置"""
    model_name = get_model_name(path)
    
    config = {
        "scale": get_scale(model_name, path),
        "mirror": should_mirror(model_name),
        "animationExtraction": {
            "strategy": "auto",
            "useFullClip": False,
            "useCachedSegments": True,
            "fps": 30
        },
        "positionOffset": {
            "horizontal": 0.2,
            "vertical": get_vertical_offset(model_name)
        },
        "camera": {
            "lookAtHeight": 0.25,
            "baseDistanceMultiplier": 2.0
        },
        "animationSegments": {}
    }
    
    return config

def main():
    """主函数：生成完整配置文件"""
    # 读取现有配置
    config_path = "public/assets/3d/characters/model_config.json"
    
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
    else:
        # 如果文件不存在，创建默认结构
        config = {
            "version": "1.0.0",
            "default": {
                "scale": 1.0,
                "mirror": False,
                "animationExtraction": {
                    "strategy": "auto",
                    "useFullClip": False,
                    "useCachedSegments": True,
                    "fps": 30,
                    "autoExtractionThresholds": {
                        "minDuration": 5.0,
                        "minTracks": 50,
                        "defaultStandEnd": 2.0,
                        "defaultStandEndPercent": 0.1,
                        "minFrameCount": 10
                    }
                },
                "positionOffset": {
                    "horizontal": 0.2,
                    "vertical": -5.0
                },
                "camera": {
                    "lookAtHeight": 0.25,
                    "baseDistanceMultiplier": 2.0
                }
            },
            "models": {}
        }
    
    # 确保 models 字典存在
    if "models" not in config:
        config["models"] = {}
    
    # 为每个模型生成配置（保留已有配置）
    existing_models = set(config["models"].keys())
    
    for model_path in ALL_MODELS:
        if model_path not in existing_models:
            config["models"][model_path] = generate_config_for_model(model_path)
            print(f"[+] Generated config for: {get_model_name(model_path)}")
        else:
            print(f"[*] Kept existing config: {get_model_name(model_path)}")
    
    # 保存配置文件
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"\n[SUCCESS] Config file generated: {config_path}")
    print(f"   Total: {len(config['models'])} model configurations")

if __name__ == "__main__":
    main()

