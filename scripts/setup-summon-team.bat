@echo off
REM 召唤测试队伍一键准备（避免 PowerShell 执行策略导致 npx 报错）
REM 用法（在 CMD 中执行）：
REM   scripts\setup-summon-team.bat
REM   set TEST_UID=0_6d5e97b67a8279310f303bcfe4991dba && scripts\setup-summon-team.bat

setlocal
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "TM_DIR=%PROJECT_ROOT%\src\convex\tacticalMonster"

if not defined TEST_UID set "TEST_UID=test_player_bronze"
set "ARGS={\"uid\": \"%TEST_UID%\", \"teamMonsters\": [{\"monsterId\": \"monster_008\", \"level\": 6, \"stars\": 1}, {\"monsterId\": \"monster_001\", \"level\": 5, \"stars\": 1}, {\"monsterId\": \"monster_002\", \"level\": 5, \"stars\": 1}, {\"monsterId\": \"monster_004\", \"level\": 5, \"stars\": 1}], \"ruleId\": \"monster_rumble_challenge_bronze_boss_1\"}"

echo [INFO] 准备召唤测试队伍，UID=%TEST_UID%
echo [INFO] 执行目录: %TM_DIR%
cd /d "%TM_DIR%"
call npx convex run service/game/tests/combat/combatTestData:setupCombatTestDataAction "%ARGS%"
if errorlevel 1 (
    echo [ERROR] 准备队伍失败
    exit /b 1
)
echo [SUCCESS] 队伍已设置（monster_008 在第一位）
endlocal
