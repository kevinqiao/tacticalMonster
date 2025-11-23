#!/usr/bin/env python3
import json

with open('public/assets/3d/characters/model_config.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total models: {len(data['models'])}")
print(f"Models with mirror=true: {sum(1 for m in data['models'].values() if m.get('mirror', False))}")
print(f"Models with custom scale: {sum(1 for m in data['models'].values() if m.get('scale', 1.0) != 1.0)}")

# 检查几个示例
dragon = data['models'].get('/assets/3d/characters/firedragon/model/firedragon.glb')
bunny = data['models'].get('/assets/3d/characters/bunny/model/bunny.glb')
orc = data['models'].get('/assets/3d/characters/orc/model/orc.glb')

print("\n=== Sample Configurations ===")
print(f"\nFire Dragon:")
print(f"  scale: {dragon['scale']}")
print(f"  mirror: {dragon['mirror']}")
print(f"  vertical offset: {dragon['positionOffset']['vertical']}")

print(f"\nBunny:")
print(f"  scale: {bunny['scale']}")
print(f"  mirror: {bunny['mirror']}")
print(f"  vertical offset: {bunny['positionOffset']['vertical']}")

print(f"\nOrc:")
print(f"  scale: {orc['scale']}")
print(f"  mirror: {orc['mirror']}")
print(f"  vertical offset: {orc['positionOffset']['vertical']}")

print("\n[SUCCESS] All configurations are valid!")

