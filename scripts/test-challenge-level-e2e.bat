@echo off
REM 挑战关卡端到端测试自动化脚本 (Windows Batch)
REM 适用于 Windows CMD
REM
REM 使用方法:
REM   scripts\test-challenge-level-e2e.bat

REM 设置代码页为 UTF-8 以正确显示中文
chcp 65001 >nul

setlocal enabledelayedexpansion

REM 配置
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "TOURNAMENT_DIR=%PROJECT_ROOT%\src\convex\tournament"
set "TACTICAL_MONSTER_DIR=%PROJECT_ROOT%\src\convex\tacticalMonster"

REM 测试参数
if defined TEST_UID (
    set "TEST_UID=%TEST_UID%"
) else (
    set "TEST_UID=test_player_bronze"
)
if defined TEST_TOURNAMENT_TYPE (
    set "TEST_TOURNAMENT_TYPE=%TEST_TOURNAMENT_TYPE%"
) else (
    set "TEST_TOURNAMENT_TYPE=monster_rumble_challenge_bronze_boss_1"
)

echo.
echo ========================================
echo 挑战关卡端到端测试 - 完整流程
echo ========================================
echo [INFO] 测试玩家: %TEST_UID%
echo [INFO] 测试关卡: %TEST_TOURNAMENT_TYPE%
echo [INFO] 项目根目录: %PROJECT_ROOT%
echo.

REM 检查前置条件
echo ========================================
echo 检查前置条件
echo ========================================
where npx >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npx 未安装或不在 PATH 中
    exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] node 未安装或不在 PATH 中
    exit /b 1
)
if not exist "%TOURNAMENT_DIR%" (
    echo [ERROR] 目录不存在: %TOURNAMENT_DIR%
    exit /b 1
)
if not exist "%TACTICAL_MONSTER_DIR%" (
    echo [ERROR] 目录不存在: %TACTICAL_MONSTER_DIR%
    exit /b 1
)
echo [SUCCESS] 前置条件检查通过
echo.

REM 步骤1: 准备测试数据（Tournament模块）
echo ========================================
echo 步骤1: 准备 Tournament 模块测试数据
echo ========================================
cd /d "%TOURNAMENT_DIR%"
echo [INFO] 执行: setupChallengeLevelTestData
call npx convex run service/tournament/tests/challengeLevel/runTest:setupChallengeLevelTestData
if errorlevel 1 (
    echo [ERROR] Tournament 模块测试数据创建失败
    exit /b 1
)
echo [SUCCESS] Tournament 模块测试数据创建成功
echo.

REM 等待数据创建完成
echo [INFO] 等待 3 秒以确保数据同步...
timeout /t 3 /nobreak >nul
echo.

REM 步骤2: 验证测试数据（Tournament模块）
echo ========================================
echo 步骤2: 验证 Tournament 模块测试数据
echo ========================================
cd /d "%TOURNAMENT_DIR%"
set "VALIDATION_ARGS={\"playerIds\": [\"%TEST_UID%\"], \"tournamentTypeId\": \"%TEST_TOURNAMENT_TYPE%\"}"
echo [INFO] 执行: validateChallengeLevelTestData
echo [INFO] 参数: %VALIDATION_ARGS%
call npx convex run service/tournament/tests/challengeLevel/runTest:validateChallengeLevelTestData "%VALIDATION_ARGS%"
if errorlevel 1 (
    echo [WARNING] Tournament 模块数据验证出现问题（继续执行）
) else (
    echo [SUCCESS] Tournament 模块数据验证完成
)
echo.

REM 步骤3: 验证测试数据（TacticalMonster模块）
echo ========================================
echo 步骤3: 验证 TacticalMonster 模块测试数据
echo ========================================
cd /d "%TACTICAL_MONSTER_DIR%"
set "VALIDATION_ARGS={\"uid\": \"%TEST_UID%\"}"
echo [INFO] 执行: testChallengeLevelDataValidation
echo [INFO] 参数: %VALIDATION_ARGS%
call npx convex run service/game/tests/challengeLevel/endToEndTest:testChallengeLevelDataValidation "%VALIDATION_ARGS%"
if errorlevel 1 (
    echo [WARNING] TacticalMonster 模块数据验证出现问题（继续执行）
) else (
    echo [SUCCESS] TacticalMonster 模块数据验证完成
)
echo.

REM 步骤4: 运行端到端测试（TacticalMonster模块）
echo ========================================
echo 步骤4: 运行端到端测试
echo ========================================
cd /d "%TACTICAL_MONSTER_DIR%"
set "E2E_ARGS={\"uid\": \"%TEST_UID%\", \"tournamentType\": \"%TEST_TOURNAMENT_TYPE%\"}"
echo [INFO] 执行: testChallengeLevelEndToEnd
echo [INFO] 参数: %E2E_ARGS%
call npx convex run service/game/tests/challengeLevel/endToEndTest:testChallengeLevelEndToEnd "%E2E_ARGS%"
if errorlevel 1 (
    echo [ERROR] 端到端测试执行失败
    exit /b 1
)
echo [SUCCESS] 端到端测试执行完成
echo.

echo ========================================
echo 测试流程完成
echo ========================================
echo [SUCCESS] 所有步骤执行完毕！
echo.
echo [INFO] 下一步：
echo [INFO] 1. 查看 Convex Dashboard 中的日志以获取详细信息
echo [INFO] 2. 验证 Match 和 PlayerMatch 记录
echo [INFO] 3. 验证游戏实例和分数提交
echo.

endlocal

