# FBX to GLTF 批量转换工具 (PowerShell版本)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FBX to GLTF 批量转换工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 配置Blender路径
$blenderPaths = @(
    "C:\Program Files\Blender Foundation\Blender 4.0\blender.exe",
    "C:\Program Files\Blender Foundation\Blender 3.6\blender.exe",
    "C:\Program Files\Blender Foundation\Blender 3.5\blender.exe",
    "C:\Program Files\Blender Foundation\Blender 3.4\blender.exe"
)

$blenderPath = $null
foreach ($path in $blenderPaths) {
    if (Test-Path $path) {
        $blenderPath = $path
        break
    }
}

if (-not $blenderPath) {
    Write-Host "错误: 找不到Blender，请安装Blender或修改脚本中的路径" -ForegroundColor Red
    Write-Host "下载地址: https://www.blender.org/download/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按Enter键退出"
    exit 1
}

# 脚本路径
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $scriptDir "convert_fbx_to_gltf.py"

# 项目根目录
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

$inputDir = Join-Path $projectRoot "src\component\battle\games\tacticalMonster\assets\characters"
$outputDir = Join-Path $projectRoot "public\assets\3d\characters"

Write-Host "Blender路径: $blenderPath" -ForegroundColor Green
Write-Host "脚本路径: $scriptPath" -ForegroundColor Green
Write-Host "输入目录: $inputDir" -ForegroundColor Green
Write-Host "输出目录: $outputDir" -ForegroundColor Green
Write-Host ""

if (-not (Test-Path $inputDir)) {
    Write-Host "错误: 输入目录不存在: $inputDir" -ForegroundColor Red
    Read-Host "按Enter键退出"
    exit 1
}

Write-Host "创建输出目录..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Host ""
Write-Host "开始转换..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 执行转换
& $blenderPath --background --python $scriptPath -- $inputDir $outputDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "转换完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "按Enter键退出"
