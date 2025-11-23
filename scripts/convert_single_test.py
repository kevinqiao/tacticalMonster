"""
单个FBX文件转换测试脚本
在Blender中直接运行，修改下面的路径即可
"""

import bpy
import os

# ========== 配置路径（修改这里） ==========
# 项目根目录
PROJECT_ROOT = r"D:\selfhome\projects\tacticalMonster\develop"

# FBX输入路径（相对于assets/characters目录）
FBX_RELATIVE_PATH = r"wukong\model\wukong.FBX"

# GLB输出路径（相对于public/assets/3d/characters目录）
GLB_NAME = "wukong_test.glb"
# =========================================

# 构建完整路径
FBX_PATH = os.path.join(PROJECT_ROOT, "src", "component", "battle", "games", "tacticalMonster", "assets", "characters", FBX_RELATIVE_PATH)
GLB_PATH = os.path.join(PROJECT_ROOT, "public", "assets", "3d", "characters", GLB_NAME)

print("=" * 60)
print("单个文件转换测试")
print("=" * 60)
print(f"输入: {FBX_PATH}")
print(f"输出: {GLB_PATH}")
print("=" * 60)

# 清除场景
bpy.ops.wm.read_factory_settings(use_empty=True)

# 导入FBX
print("\n导入FBX...")
try:
    bpy.ops.import_scene.fbx(filepath=FBX_PATH)
    print("✓ FBX导入成功")
except Exception as e:
    print(f"✗ FBX导入失败: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# 确保输出目录存在
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)

# 导出GLTF
print("\n导出GLB...")
try:
bpy.ops.export_scene.gltf(
    filepath=GLB_PATH,
    export_format='GLB',
    export_animations=True,
    export_materials='EXPORT',
    export_yup=True
)
    print(f"✓ GLB导出成功: {GLB_PATH}")
except Exception as e:
    print(f"✗ GLB导出失败: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n" + "=" * 60)
print("转换完成！")
print("=" * 60)


