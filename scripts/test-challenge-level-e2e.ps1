# 挑战关卡端到端测试自动化脚本 (PowerShell)
# 适用于 Windows PowerShell 和 PowerShell Core
#
# 使用方法:
#   powershell -ExecutionPolicy Bypass -File scripts/test-challenge-level-e2e.ps1
#   或
#   pwsh scripts/test-challenge-level-e2e.ps1

$ErrorActionPreference = "Stop"

# 配置
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$TournamentDir = Join-Path $ProjectRoot "src\convex\tournament"
$TacticalMonsterDir = Join-Path $ProjectRoot "src\convex\tacticalMonster"

# 测试参数
$TestUid = if ($env:TEST_UID) { $env:TEST_UID } else { "test_player_bronze" }
$TestTournamentType = if ($env:TEST_TOURNAMENT_TYPE) { $env:TEST_TOURNAMENT_TYPE } else { "monster_rumble_challenge_bronze_boss_1" }

# 日志函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}

# 检查命令是否存在
function Test-Command {
    param([string]$Command)
    if (!(Get-Command $Command -ErrorAction SilentlyContinue)) {
        Write-Error "$Command 未安装或不在 PATH 中"
        exit 1
    }
}

# 检查目录是否存在
function Test-Directory {
    param([string]$Path)
    if (!(Test-Path $Path -PathType Container)) {
        Write-Error "目录不存在: $Path"
        exit 1
    }
}

# 运行 Convex 命令
function Invoke-ConvexRun {
    param(
        [string]$ModuleDir,
        [string]$Command,
        [string]$Args = ""
    )
    
    Write-Info "执行: $Command"
    if ($Args) {
        Write-Info "参数: $Args"
        Push-Location $ModuleDir
        try {
            if ($Args) {
                npx convex run $Command $Args
            } else {
                npx convex run $Command
            }
        } finally {
            Pop-Location
        }
    } else {
        Push-Location $ModuleDir
        try {
            npx convex run $Command
        } finally {
            Pop-Location
        }
    }
}

# 主函数
function Main {
    Write-Step "挑战关卡端到端测试 - 完整流程"
    Write-Info "测试玩家: $TestUid"
    Write-Info "测试关卡: $TestTournamentType"
    Write-Info "项目根目录: $ProjectRoot"
    
    # 检查前置条件
    Write-Step "检查前置条件"
    Test-Command "npx"
    Test-Command "node"
    Test-Directory $TournamentDir
    Test-Directory $TacticalMonsterDir
    Write-Success "前置条件检查通过"
    
    # 步骤1: 准备测试数据（Tournament模块）
    Write-Step "步骤1: 准备 Tournament 模块测试数据"
    try {
        Invoke-ConvexRun -ModuleDir $TournamentDir `
            -Command "service/tournament/tests/challengeLevel/runTest:setupChallengeLevelTestData"
        Write-Success "Tournament 模块测试数据创建成功"
    } catch {
        Write-Error "Tournament 模块测试数据创建失败: $_"
        exit 1
    }
    
    # 等待数据创建完成
    Write-Info "等待 3 秒以确保数据同步..."
    Start-Sleep -Seconds 3
    
    # 步骤2: 验证测试数据（Tournament模块）
    Write-Step "步骤2: 验证 Tournament 模块测试数据"
    $ValidationArgs = "{`"playerIds`": [`"$TestUid`"], `"tournamentTypeId`": `"$TestTournamentType`"}"
    try {
        Invoke-ConvexRun -ModuleDir $TournamentDir `
            -Command "service/tournament/tests/challengeLevel/runTest:validateChallengeLevelTestData" `
            -Args $ValidationArgs
        Write-Success "Tournament 模块数据验证完成"
    } catch {
        Write-Warning "Tournament 模块数据验证出现问题（继续执行）: $_"
    }
    
    # 步骤3: 验证测试数据（TacticalMonster模块）
    Write-Step "步骤3: 验证 TacticalMonster 模块测试数据"
    $ValidationArgs = "{`"uid`": `"$TestUid`"}"
    try {
        Invoke-ConvexRun -ModuleDir $TacticalMonsterDir `
            -Command "service/game/tests/challengeLevel/endToEndTest:testChallengeLevelDataValidation" `
            -Args $ValidationArgs
        Write-Success "TacticalMonster 模块数据验证完成"
    } catch {
        Write-Warning "TacticalMonster 模块数据验证出现问题（继续执行）: $_"
    }
    
    # 步骤4: 运行端到端测试（TacticalMonster模块）
    Write-Step "步骤4: 运行端到端测试"
    $E2EArgs = "{`"uid`": `"$TestUid`", `"tournamentType`": `"$TestTournamentType`"}"
    try {
        Invoke-ConvexRun -ModuleDir $TacticalMonsterDir `
            -Command "service/game/tests/challengeLevel/endToEndTest:testChallengeLevelEndToEnd" `
            -Args $E2EArgs
        Write-Success "端到端测试执行完成"
    } catch {
        Write-Error "端到端测试执行失败: $_"
        exit 1
    }
    
    Write-Step "测试流程完成"
    Write-Success "所有步骤执行完毕！"
    Write-Info ""
    Write-Info "下一步："
    Write-Info "1. 查看 Convex Dashboard 中的日志以获取详细信息"
    Write-Info "2. 验证 Match 和 PlayerMatch 记录"
    Write-Info "3. 验证游戏实例和分数提交"
}

# 运行主函数
Main

