# ==========================================================================
# COMPETITION MANAGEMENT SYSTEM - POWERSHELL BUILD SCRIPT (build.ps1)
# ==========================================================================

$publicDir = Join-Path $PSScriptRoot "public"
if (Test-Path $publicDir) {
    Remove-Item $publicDir -Recurse -Force
}
New-Item -ItemType Directory -Path $publicDir -Force | Out-Null

$items = @("index.html", "css", "js", "lib", "src", "manifest.json", "sw.js", "supabase_schema.sql", "vercel.json")
foreach ($item in $items) {
    $src = Join-Path $PSScriptRoot $item
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $publicDir -Recurse -Force
        Write-Host "Copied $item -> public/$item"
    }
}
Write-Host "Build completed successfully! Public folder generated for Vercel deployment."
