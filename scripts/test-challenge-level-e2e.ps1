# Challenge Level E2E Test Script (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/test-challenge-level-e2e.ps1
# Use existing SSO account: $env:TEST_PLAYER_EMAIL = "kevin1@gmail.com"
# Or set uid directly:      $env:TEST_UID = "0_xxxx"  (from JSON.parse(localStorage.user).uid after login)

$ErrorActionPreference = "Stop"

# Config
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$TournamentDir = Join-Path $ProjectRoot "src\convex\tournament"
$TacticalMonsterDir = Join-Path $ProjectRoot "src\convex\tacticalMonster"

# Test params. Use TEST_PLAYER_EMAIL (e.g. kevin1@gmail.com) to derive uid = "0_"+MD5(email)
$TestUid = if ($env:TEST_UID) {
    $env:TEST_UID
} elseif ($env:TEST_PLAYER_EMAIL) {
    $email = $env:TEST_PLAYER_EMAIL.Trim().ToLower()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($email)
    $hash = [System.Security.Cryptography.MD5]::Create().ComputeHash($bytes)
    $hex = [BitConverter]::ToString($hash).Replace("-", "").ToLower()
    "0_$hex"
} else {
    "test_player_bronze"
}
$TestTournamentType = if ($env:TEST_TOURNAMENT_TYPE) { $env:TEST_TOURNAMENT_TYPE } else { "monster_rumble_challenge_bronze_boss_1" }

# Log helpers
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

# Check command exists
function Test-Command {
    param([string]$Command)
    if (!(Get-Command $Command -ErrorAction SilentlyContinue)) {
        Write-Error "$Command not found or not in PATH"
        exit 1
    }
}

# Check directory exists
function Test-Directory {
    param([string]$Path)
    if (!(Test-Path $Path -PathType Container)) {
        Write-Error "Directory not found: $Path"
        exit 1
    }
}

# Run Convex command
function Invoke-ConvexRun {
    param(
        [string]$ModuleDir,
        [string]$Command,
        [string]$JsonArgs = ""
    )
    
    Write-Info "Running: $Command"
    Push-Location $ModuleDir
    try {
        if ($JsonArgs) {
            Write-Info "Args: $JsonArgs"
            # Pass JSON as single argument (avoid $args conflict; use comma to build array for &)
            & npx convex run $Command $JsonArgs
        } else {
            & npx convex run $Command
        }
    } finally {
        Pop-Location
    }
}

# Main
function Main {
    Write-Step "Challenge Level E2E Test - Full Flow"
    Write-Info "Test UID: $TestUid"
    Write-Info "Tournament Type: $TestTournamentType"
    Write-Info "Project Root: $ProjectRoot"
    
    Write-Step "Check Prerequisites"
    Test-Command "npx"
    Test-Command "node"
    Test-Directory $TournamentDir
    Test-Directory $TacticalMonsterDir
    Write-Success "Prerequisites OK"
    
    Write-Step "Step 1: Setup Tournament Test Data"
    $SetupArgs = "{`"playerIds`": [`"$TestUid`"]}"
    try {
        Invoke-ConvexRun -ModuleDir $TournamentDir `
            -Command "service/tournament/tests/challengeLevel/runTest:setupChallengeLevelTestData" `
            -Args $SetupArgs
        Write-Success "Tournament test data created"
    } catch {
        Write-Error "Tournament test data setup failed: $_"
        exit 1
    }
    
    # Wait for data sync
    Write-Info "Waiting 3 seconds for data sync..."
    Start-Sleep -Seconds 3
    
    # Step 1b: Create TacticalMonster team/game data for test player (Tournament HTTP 404 workaround)
    Write-Step "Step 1b: Setup TacticalMonster Team Data"
    $TmSetupArgs = "{`"uid`": `"$TestUid`", `"teamMonsters`": [{`"monsterId`": `"monster_008`", `"level`": 6, `"stars`": 1}, {`"monsterId`": `"monster_001`", `"level`": 5, `"stars`": 1}, {`"monsterId`": `"monster_002`", `"level`": 5, `"stars`": 1}, {`"monsterId`": `"monster_004`", `"level`": 5, `"stars`": 1}], `"ruleId`": `"$TestTournamentType`"}"
    try {
        Invoke-ConvexRun -ModuleDir $TacticalMonsterDir `
            -Command "service/game/tests/combat/combatTestData:setupCombatTestDataAction" `
            -JsonArgs $TmSetupArgs
        Write-Success "TacticalMonster team data created"
    } catch {
        Write-Warning "TacticalMonster setup had issues (Step 3 may fail): $_"
    }
    Start-Sleep -Seconds 2
    
    Write-Step "Step 2: Validate Tournament Test Data"
    $ValidationArgs = "{`"playerIds`": [`"$TestUid`"], `"tournamentTypeId`": `"$TestTournamentType`"}"
    try {
        Invoke-ConvexRun -ModuleDir $TournamentDir `
            -Command "service/tournament/tests/challengeLevel/runTest:validateChallengeLevelTestData" `
            -Args $ValidationArgs
        Write-Success "Tournament validation done"
    } catch {
        Write-Warning "Tournament validation had issues (continuing): $_"
    }
    
    Write-Step "Step 3: Validate TacticalMonster Test Data"
    $ValidationArgs = "{`"uid`": `"$TestUid`"}"
    try {
        Invoke-ConvexRun -ModuleDir $TacticalMonsterDir `
            -Command "service/game/tests/challengeLevel/endToEndTest:testChallengeLevelDataValidation" `
            -Args $ValidationArgs
        Write-Success "TacticalMonster validation done"
    } catch {
        Write-Warning "TacticalMonster validation had issues (continuing): $_"
    }
    
    Write-Step "Step 4: Run E2E Test"
    $E2EArgs = "{`"uid`": `"$TestUid`", `"tournamentType`": `"$TestTournamentType`"}"
    try {
        Invoke-ConvexRun -ModuleDir $TacticalMonsterDir `
            -Command "service/game/tests/challengeLevel/endToEndTest:testChallengeLevelEndToEnd" `
            -Args $E2EArgs
        Write-Success "E2E test completed"
    } catch {
        Write-Error "E2E test failed: $_"
        exit 1
    }
    
    Write-Step "Test Flow Complete"
    Write-Success "All steps finished!"
    Write-Info ""
    Write-Info "Next: Check Convex Dashboard for logs, Match/PlayerMatch records, and game scores."
}

# Run
Main

