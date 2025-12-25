# Restart Quant Platform
# Usage: .\restart_project.ps1

Write-Host "Checking for existing processes on ports 8000 and 5173..." -ForegroundColor Yellow

# Kill Port 8000 (Backend)
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "   Killing process on port 8000 (PID: $($port8000.OwningProcess))..." -ForegroundColor Red
    Stop-Process -Id $port8000.OwningProcess -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "   Port 8000 is free." -ForegroundColor Green
}

# Kill Port 5173 (Frontend)
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "   Killing process on port 5173 (PID: $($port5173.OwningProcess))..." -ForegroundColor Red
    Stop-Process -Id $port5173.OwningProcess -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "   Port 5173 is free." -ForegroundColor Green
}

Write-Host "Starting Backend Server (Uvicorn)..." -ForegroundColor Cyan
# Launch new PowerShell window, cd to backend, and run uvicorn
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --reload --port 8000"

Write-Host "Starting Frontend Server (Vite)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nProject Restarted! Check the new terminal windows." -ForegroundColor Green
