# Quick script to run send_routes.js in watch mode
# Run this from the arduino folder: .\run-watch.ps1

$env:ARDUINO_PORT = "COM10"
Write-Host "Starting route watcher on COM10..." -ForegroundColor Green
node send_routes.js --watch

