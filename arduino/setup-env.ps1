# Setup script for Arduino port environment variable
# Run this in PowerShell: .\setup-env.ps1

$env:ARDUINO_PORT = "COM10"
Write-Host "✓ ARDUINO_PORT set to COM10" -ForegroundColor Green
Write-Host ""
Write-Host "To use it, run:" -ForegroundColor Yellow
Write-Host "  npm run watch" -ForegroundColor Cyan
Write-Host "  or" -ForegroundColor Yellow
Write-Host "  node send_routes.js --watch" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: This only sets it for this PowerShell session." -ForegroundColor Gray
Write-Host "To make it permanent, add to your PowerShell profile." -ForegroundColor Gray

