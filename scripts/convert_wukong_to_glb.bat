@echo off
chcp 65001 >nul
echo ========================================
echo Wukong 模型转换工具 (FBX -^> GLB)
echo ========================================
echo.

REM 配置Blender路径（请根据你的安装路径修改）
set BLENDER_PATH=D:\softwares\blender3.6\blender.exe
if not exist "%BLENDER_PATH%" (
    set BLENDER_PATH=D:\softwares\blender4\blender.exe
)
if not exist "%BLENDER_PATH%" (
    set BLENDER_PATH=C:\Program Files\Blender Foundation\Blender 4.0\blender.exe
)
if not exist "%BLENDER_PATH%" (
    set BLENDER_PATH=C:\Program Files\Blender Foundation\Blender 3.6\blender.exe
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
set SCRIPT_PATH=%SCRIPT_DIR%convert_wukong_to_glb.py

echo Blender路径: %BLENDER_PATH%
echo 脚本路径: %SCRIPT_PATH%
echo.

echo 开始转换 wukong 模型...
echo ========================================
echo.

%BLENDER_PATH% --background --python "%SCRIPT_PATH%"

echo.
echo ========================================
echo 转换完成！
echo ========================================
pause

