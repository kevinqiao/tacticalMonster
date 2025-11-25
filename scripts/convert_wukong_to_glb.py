"""
将 wukong 目录转换为 GLB 格式
使用方法:
  1. 在Blender中运行（打开Blender -> Scripting -> 粘贴代码 -> Run）
  2. 或命令行: blender --background --python convert_wukong_to_glb.py
"""

import bpy
import os
import sys

# 项目根目录（自动检测）
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# 输入目录（源目录）
INPUT_DIR = os.path.join(PROJECT_ROOT, "src", "component", "battle", "games", "tacticalMonster", "assets", "characters", "wukong")

# 输出目录（目标目录）
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "assets", "3d", "characters", "wukong")

def convert_fbx_to_glb(fbx_path, glb_path):
    """转换单个FBX文件为GLB"""
    print(f"\n处理: {os.path.basename(fbx_path)}")
    
    # 清除场景
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    try:
        # 导入FBX - 尝试多种导入方式以处理兼容性问题
        # 注意：某些FBX文件（如wukong.FBX）在Blender 4.0+中可能有兼容性问题
        import_success = False
        
        # 方法1: 基本导入
        try:
            bpy.ops.import_scene.fbx(filepath=fbx_path)
            import_success = True
            print("  ✓ 使用基本导入方式")
        except Exception as e1:
            print(f"  ⚠ 基本导入失败，尝试兼容模式...")
            
            # 方法2: 使用兼容选项
            try:
                bpy.ops.wm.read_factory_settings(use_empty=True)
                bpy.ops.import_scene.fbx(
                    filepath=fbx_path,
                    ignore_leaf_bones=True,
                    force_connect_children=False,
                    automatic_bone_orientation=False
                )
                import_success = True
                print("  ✓ 使用兼容模式导入")
            except Exception as e2:
                # 方法3: 尝试使用更宽松的设置
                try:
                    bpy.ops.wm.read_factory_settings(use_empty=True)
                    # 尝试只导入网格，忽略骨骼
                    bpy.ops.import_scene.fbx(
                        filepath=fbx_path,
                        ignore_leaf_bones=True,
                        force_connect_children=False,
                        automatic_bone_orientation=False,
                        use_alpha_decals=False,
                        decal_offset=0.0
                    )
                    import_success = True
                    print("  ✓ 使用宽松模式导入")
                except Exception as e3:
                    print(f"  ✗ 所有导入方式都失败")
                    print(f"    错误1: {str(e1)[:200]}")
                    print(f"    错误2: {str(e2)[:200]}")
                    print(f"    错误3: {str(e3)[:200]}")
                    raise e3
        
        if not import_success:
            raise Exception("无法导入FBX文件，请尝试在Blender GUI中手动导入")
        
        # 确保输出目录存在
        os.makedirs(os.path.dirname(glb_path), exist_ok=True)
        
        # 导出GLTF (Blender 5.0+ 兼容)
        bpy.ops.export_scene.gltf(
            filepath=glb_path,
            export_format='GLB',
            export_animations=True,
            export_materials='EXPORT',
            export_yup=True
        )
        
        print(f"  ✓ 成功: {os.path.relpath(glb_path, PROJECT_ROOT)}")
        return True
    except Exception as e:
        print(f"  ✗ 失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("Wukong 模型转换工具 (FBX -> GLB)")
    print("=" * 60)
    print(f"项目根目录: {PROJECT_ROOT}")
    print(f"输入目录: {INPUT_DIR}")
    print(f"输出目录: {OUTPUT_DIR}")
    print("=" * 60)
    
    if not os.path.exists(INPUT_DIR):
        print(f"\n错误: 输入目录不存在: {INPUT_DIR}")
        return
    
    # 确保输出目录存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 需要转换的文件列表
    files_to_convert = [
        {
            'input': os.path.join(INPUT_DIR, "model", "wukong.FBX"),
            'output': os.path.join(OUTPUT_DIR, "wukong.glb")
        },
        {
            'input': os.path.join(INPUT_DIR, "shadow", "wukong_shadow.FBX"),
            'output': os.path.join(OUTPUT_DIR, "shadow", "wukong_shadow.glb")
        }
    ]
    
    success_count = 0
    total_count = len(files_to_convert)
    
    for file_info in files_to_convert:
        fbx_path = file_info['input']
        glb_path = file_info['output']
        
        if not os.path.exists(fbx_path):
            print(f"\n⚠ 跳过: {os.path.basename(fbx_path)} (文件不存在)")
            continue
        
        if convert_fbx_to_glb(fbx_path, glb_path):
            success_count += 1
    
    print()
    print("=" * 60)
    print(f"转换完成: {success_count}/{total_count} 个文件成功转换")
    print("=" * 60)
    
    if success_count > 0:
        print("\n转换后的文件:")
        for file_info in files_to_convert:
            glb_path = file_info['output']
            if os.path.exists(glb_path):
                rel_path = os.path.relpath(glb_path, PROJECT_ROOT)
                file_size = os.path.getsize(glb_path) / 1024  # KB
                print(f"  - {rel_path} ({file_size:.1f} KB)")

if __name__ == "__main__":
    main()

