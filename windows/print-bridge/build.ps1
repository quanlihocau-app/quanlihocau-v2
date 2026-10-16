$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$compilerPath = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$outputPath = Join-Path $taskRoot 'public\downloads\QuanLiHoCau-PrintBridge.exe'
$sourcePath = Join-Path $PSScriptRoot 'PrintBridge.cs'
New-Item -ItemType Directory -Force (Split-Path -Parent $outputPath) | Out-Null
& $compilerPath /nologo /target:winexe /platform:x64 /reference:System.Web.Extensions.dll /reference:System.Windows.Forms.dll "/out:$outputPath" $sourcePath
if ($LASTEXITCODE -ne 0) { throw 'Build PrintBridge failed.' }
Get-FileHash -LiteralPath $outputPath -Algorithm SHA256
