@echo off
chcp 65001 >nul
REM 挑战关卡测试数据创建脚本 (简化版 - 自动创建所有数据)
REM 用于创建挑战关卡端到端测试所需的所有测试数据
REM
REM 使用方法:
REM   scripts\setup-challenge-level-test-data-simple.bat
REM
REM 注意:
REM   - 需要先启动 Convex 开发服务器 (npx convex dev)
REM   - 此脚本会自动创建两个模块的测试数据

echo ==========================================
echo 挑战关卡测试数据创建 (自动模式)
echo ==========================================
echo.
echo 将自动创建以下测试数据:
echo   - Tournament 模块 (玩家、资源、关卡配置)
echo   - TacticalMonster 模块 (怪物、队伍、地图配置)
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

REM 创建 Tournament 模块测试数据
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
echo.

REM 等待一下确保数据同步
timeout /t 2 /nobreak >nul

REM 创建 TacticalMonster 模块测试数据
echo ==========================================
echo [步骤3] 创建 TacticalMonster 模块测试数据
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
echo.

echo ==========================================
echo 测试数据创建完成！
echo ==========================================
echo.
echo 下一步: 运行端到端测试
echo   脚本: scripts\test-challenge-level-e2e.bat
echo.
pause

