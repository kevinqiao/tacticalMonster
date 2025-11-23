@echo off
chcp 65001 >nul
echo ========================================
echo FBX to GLTF 批量转换工具
echo ========================================
echo.

REM 配置Blender路径（请根据你的安装路径修改）
set BLENDER_PATH=D:\softwares\blender\blender.exe
if not exist "%BLENDER_PATH%" (
    set BLENDER_PATH=C:\Program Files\Blender Foundation\Blender 3.6\blender.exe
)
if not exist "%BLENDER_PATH%" (
    set BLENDER_PATH=C:\Program Files\Blender Foundation\Blender 3.5\blender.exe
)
if not exist "%BLENDER_PATH%" (
    set BLENDER_PATH=C:\Program Files\Blender Foundation\Blender 3.4\blender.exe
)
if not exist "%BLENDER_PATH%" (
    echo 错误: 找不到Blender，请修改脚本中的BLENDER_PATH路径
    echo.
    echo 请安装Blender: https://www.blender.org/download/
    echo 或者手动设置BLENDER_PATH变量
    pause
    exit /b 1
)

REM 脚本路径
set SCRIPT_DIR=%~dp0
set SCRIPT_PATH=%SCRIPT_DIR%convert_fbx_to_gltf.py

REM 输入输出目录（相对于项目根目录）
set PROJECT_ROOT=%SCRIPT_DIR%..
cd /d %PROJECT_ROOT%

set INPUT_DIR=%CD%\src\component\battle\games\tacticalMonster\assets\characters
set OUTPUT_DIR=%CD%\public\assets\3d\characters

echo Blender路径: %BLENDER_PATH%
echo 脚本路径: %SCRIPT_PATH%
echo 输入目录: %INPUT_DIR%
echo 输出目录: %OUTPUT_DIR%
echo.

if not exist "%INPUT_DIR%" (
    echo 错误: 输入目录不存在: %INPUT_DIR%
    pause
    exit /b 1
)

echo 创建输出目录...
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo.
echo 开始转换...
echo ========================================
echo.

%BLENDER_PATH% --background --python "%SCRIPT_PATH%" -- "%INPUT_DIR%" "%OUTPUT_DIR%"

echo.
echo ========================================
echo 转换完成！
echo ========================================
pause


