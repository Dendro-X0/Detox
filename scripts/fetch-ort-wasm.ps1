$ErrorActionPreference = "Stop"

$repoRoot = Join-Path $PSScriptRoot ".."
$destDir = Join-Path $repoRoot "public\ort"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

$nodeModulesDir = Join-Path $repoRoot "node_modules"
if (!(Test-Path $nodeModulesDir)) {
  throw "node_modules not found. Run pnpm install first."
}

$matches = Get-ChildItem -Path $nodeModulesDir -Recurse -Filter "ort-wasm*.wasm" -ErrorAction SilentlyContinue
if ($null -eq $matches -or $matches.Count -eq 0) {
  $fallback = Get-ChildItem -Path $nodeModulesDir -Recurse -Filter "*.wasm" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "ort-wasm*" }
  $matches = $fallback
}

if ($null -eq $matches -or $matches.Count -eq 0) {
  throw "onnxruntime-web wasm files not found under node_modules. Ensure onnxruntime-web is installed."
}

# Prefer files from the onnxruntime-web dist folder if multiple matches exist.
$preferred = $matches | Where-Object { $_.FullName -match "onnxruntime-web\\dist" }
if ($preferred.Count -gt 0) {
  $matches = $preferred
}

$copied = @{}
foreach ($m in $matches) {
  if (-not $copied.ContainsKey($m.Name)) {
    $target = Join-Path $destDir $m.Name
    Copy-Item -Force -Path $m.FullName -Destination $target
    $copied[$m.Name] = $true
  }
}

Write-Host "Copied ORT wasm files to: $destDir"
Get-ChildItem -Path $destDir -Filter "ort-wasm*.wasm" | ForEach-Object { Write-Host " - $($_.Name)" }
