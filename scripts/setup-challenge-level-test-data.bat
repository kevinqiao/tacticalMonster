@echo off
chcp 65001 >nul
REM 挑战关卡测试数据创建脚本 (Windows Batch)
REM 用于创建挑战关卡端到端测试所需的所有测试数据
REM
REM 使用方法:
REM   scripts\setup-challenge-level-test-data.bat
REM
REM 注意:
REM   - 需要先启动 Convex 开发服务器 (npx convex dev)
REM   - 如果两个模块是分离部署的，可能需要分别运行

echo ==========================================
echo 挑战关卡测试数据创建
echo ==========================================
echo.

REM 检查是否在正确的目录
if not exist "src\convex" (
    echo 错误: 请在项目根目录运行此脚本
    pause
    exit /b 1
)

echo [步骤1] 检查 Convex 是否可用...
npx convex --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 找不到 npx 或 convex CLI
    echo 请确保已安装 Node.js 和 Convex CLI
    pause
    exit /b 1
)
echo ✓ Convex CLI 可用
echo.

REM 选择模块
echo ==========================================
echo 选择要创建的测试数据模块:
echo ==========================================
echo.
echo   1. Tournament 模块 (完整测试数据)
echo      包括: 玩家、资源、关卡配置
echo.
echo   2. TacticalMonster 模块 (游戏相关数据)
echo      包括: 怪物、队伍、地图配置
echo.
echo   3. 两个模块都创建 (推荐)
echo.
echo ==========================================
echo.
echo 请输入选项 (1/2/3，默认为1): 
set /p choice=
if "%choice%"=="" set choice=1
echo.
echo 您选择了选项: %choice%
echo.

if "%choice%"=="1" goto tournament
if "%choice%"=="2" goto tactical
if "%choice%"=="3" goto both
goto tournament

:tournament
echo.
echo ==========================================
echo [步骤2] 创建 Tournament 模块测试数据
echo ==========================================
echo 正在运行: service/tournament/tests/challengeLevel/runTest:setupChallengeLevelTestData
cd src\convex\tournament
npx convex run service/tournament/tests/challengeLevel/runTest:setupChallengeLevelTestData
if errorlevel 1 (
    echo.
    echo ❌ Tournament 模块测试数据创建失败
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo.
echo ✅ Tournament 模块测试数据创建成功
goto end

:tactical
echo.
echo ==========================================
echo [步骤2] 创建 TacticalMonster 模块测试数据
echo ==========================================
echo 正在运行: service/game/tests/challengeLevel/setupTestData:setupGameTestData
cd src\convex\tacticalMonster
npx convex run service/game/tests/challengeLevel/setupTestData:setupGameTestData "{\"playerIds\": [\"test_player_bronze\", \"test_player_silver\", \"test_player_gold\"], \"tier\": \"bronze\", \"bossId\": \"boss_bronze_1\"}"
if errorlevel 1 (
    echo.
    echo ❌ TacticalMonster 模块测试数据创建失败
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo.
echo ✅ TacticalMonster 模块测试数据创建成功
goto end

:both
echo.
echo ==========================================
echo [步骤2] 创建 Tournament 模块测试数据
echo ==========================================
cd src\convex\tournament
npx convex run service/tournament/tests/challengeLevel/runTest:setupChallengeLevelTestData
if errorlevel 1 (
    echo.
    echo ❌ Tournament 模块测试数据创建失败
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo.
echo ✅ Tournament 模块测试数据创建成功
echo.
echo ==========================================
echo [步骤3] 创建 TacticalMonster 模块测试数据
echo ==========================================
cd src\convex\tacticalMonster
npx convex run service/game/tests/challengeLevel/setupTestData:setupGameTestData "{\"playerIds\": [\"test_player_bronze\", \"test_player_silver\", \"test_player_gold\"], \"tier\": \"bronze\", \"bossId\": \"boss_bronze_1\"}"
if errorlevel 1 (
    echo.
    echo ❌ TacticalMonster 模块测试数据创建失败
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo.
echo ✅ TacticalMonster 模块测试数据创建成功
goto end

:end
echo.
echo ==========================================
echo 测试数据创建完成！
echo ==========================================
echo.
echo 下一步: 运行端到端测试
echo   脚本: scripts\test-challenge-level-e2e.bat
echo.
pause

