# ==========================================================================
# COMPETITION MANAGEMENT SYSTEM - NETLIFY DIRECT DEPLOYMENT (deploy.ps1)
# ==========================================================================

$distPath = Join-Path $PSScriptRoot "dist"
$zipPath = Join-Path $PSScriptRoot "dist.zip"

Write-Host "Building fresh dist output..." -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "build.ps1")

Write-Host "Creating zip archive dist.zip..." -ForegroundColor Cyan
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$distPath\*" -DestinationPath $zipPath -Force

Write-Host "Deploying dist.zip to Netlify cloud API..." -ForegroundColor Cyan
$bytes = [System.IO.File]::ReadAllBytes($zipPath)

try {
    $res = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites" -Method Post -Body $bytes -ContentType "application/zip"
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "🎉 DEPLOYMENT SUCCESSFUL TO NETLIFY 24/7!" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Live Site URL: $($res.ssl_url)" -ForegroundColor Cyan
    Write-Host "Site Admin URL: $($res.admin_url)" -ForegroundColor White
    Write-Host "Site ID: $($res.id)" -ForegroundColor Gray
    
    $info = @{
        url = $res.ssl_url
        admin_url = $res.admin_url
        site_id = $res.id
        deployed_at = (Get-Date).ToString("o")
    }
    $info | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot "deploy_info.json")
} catch {
    Write-Host "Error during deployment: $_" -ForegroundColor Red
}
