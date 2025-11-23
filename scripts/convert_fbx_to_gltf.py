"""
FBX to GLTF批量转换脚本
使用方法: 
  1. 在Blender中运行（打开Blender -> Scripting -> 粘贴代码 -> Run）
  2. 或命令行: blender --background --python convert_fbx_to_gltf.py -- input_dir output_dir
"""

import bpy
import os
import sys

def get_args():
    """从命令行参数获取输入输出目录"""
    argv = sys.argv
    if "--" not in argv:
        # 默认路径（相对于脚本位置）
        script_dir = os.path.dirname(os.path.abspath(__file__))
        input_dir = os.path.join(script_dir, "..", "src", "component", "battle", "games", "tacticalMonster", "assets", "characters")
        output_dir = os.path.join(script_dir, "..", "public", "assets", "3d", "characters")
    else:
        argv = argv[argv.index("--") + 1:]
        if len(argv) >= 2:
            input_dir = argv[0]
            output_dir = argv[1]
        else:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            input_dir = os.path.join(script_dir, "..", "src", "component", "battle", "games", "tacticalMonster", "assets", "characters")
            output_dir = os.path.join(script_dir, "..", "public", "assets", "3d", "characters")
    
    return os.path.abspath(input_dir), os.path.abspath(output_dir)

def convert_fbx_to_glb(fbx_path, glb_path):
    """转换单个FBX文件为GLB"""
    # 清除场景
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    try:
        # 导入FBX
        bpy.ops.import_scene.fbx(filepath=fbx_path)
        
        # 确保输出目录存在
        os.makedirs(os.path.dirname(glb_path), exist_ok=True)
        
        # 导出GLTF
        # Blender 5.0移除了许多参数，使用最小兼容参数集
        bpy.ops.export_scene.gltf(
            filepath=glb_path,
            export_format='GLB',
            export_animations=True,
            export_materials='EXPORT',
            export_yup=True
        )
        
        print(f"✓ 成功: {os.path.basename(fbx_path)} -> {os.path.basename(glb_path)}")
        return True
    except Exception as e:
        print(f"✗ 失败: {os.path.basename(fbx_path)} - {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    input_dir, output_dir = get_args()
    
    print("=" * 60)
    print("FBX to GLTF 批量转换工具")
    print("=" * 60)
    print(f"输入目录: {input_dir}")
    print(f"输出目录: {output_dir}")
    print("=" * 60)
    print()
    
    if not os.path.exists(input_dir):
        print(f"错误: 输入目录不存在: {input_dir}")
        return
    
    count = 0
    success = 0
    
    # 遍历所有FBX文件
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            if file.lower().endswith('.fbx'):
                count += 1
                fbx_path = os.path.join(root, file)
                
                # 计算相对路径，保持目录结构
                try:
                    rel_path = os.path.relpath(root, input_dir)
                    if rel_path == '.':
                        output_subdir = output_dir
                    else:
                        output_subdir = os.path.join(output_dir, rel_path)
                except:
                    output_subdir = output_dir
                
                # 输出文件路径
                glb_name = os.path.splitext(file)[0] + '.glb'
                glb_path = os.path.join(output_subdir, glb_name)
                
                if convert_fbx_to_glb(fbx_path, glb_path):
                    success += 1
    
    print()
    print("=" * 60)
    print(f"转换完成: {success}/{count} 个文件成功转换")
    print("=" * 60)

if __name__ == "__main__":
    main()


