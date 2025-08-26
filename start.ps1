# Script PowerShell de démarrage pour Odoo Chatbot
# Lance le backend et le frontend simultanément

Write-Host "Demarrage de Odoo Chatbot..." -ForegroundColor Green

# Fonction de nettoyage
function Cleanup {
    Write-Host "Arret des services..." -ForegroundColor Yellow
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    exit 0
}

# Capturer Ctrl+C
$null = Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version 2>$null
    Write-Host "Node.js detecte: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js n'est pas installe. Veuillez l'installer depuis https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Vérifier que npm est installé
try {
    $npmVersion = npm --version 2>$null
    Write-Host "npm detecte: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm n'est pas installe. Veuillez l'installer avec Node.js" -ForegroundColor Red
    exit 1
}

Write-Host "Installation des dependances..." -ForegroundColor Cyan

# Installer les dépendances du backend
Write-Host "   - Backend..." -ForegroundColor Yellow
Set-Location backend
if (!(Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur lors de l'installation des dependances backend" -ForegroundColor Red
        exit 1
    }
}
Set-Location ..

# Installer les dépendances du frontend
Write-Host "   - Frontend..." -ForegroundColor Yellow
Set-Location frontend
if (!(Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur lors de l'installation des dependances frontend" -ForegroundColor Red
        exit 1
    }
}
Set-Location ..

Write-Host "Dependances installees!" -ForegroundColor Green

# Démarrer le backend en arrière-plan
Write-Host "Demarrage du backend (port 3001)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\backend
    npm start
}

# Attendre que le backend soit prêt
Start-Sleep -Seconds 3

# Démarrer le frontend en arrière-plan
Write-Host "Demarrage du frontend (port 3000)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm run dev
}

Write-Host ""
Write-Host "Odoo Chatbot demarre avec succes!" -ForegroundColor Green
Write-Host ""
Write-Host "Acces:" -ForegroundColor White
Write-Host "   - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   - Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Conseils:" -ForegroundColor White
Write-Host "   - Ctrl+C pour arreter les services" -ForegroundColor White
Write-Host "   - Consultez README.md pour plus d'informations" -ForegroundColor White
Write-Host ""

# Surveiller les jobs
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Vérifier si les jobs sont toujours en cours
        $runningJobs = Get-Job | Where-Object { $_.State -eq "Running" }
        if ($runningJobs.Count -eq 0) {
            Write-Host "Tous les services se sont arretes" -ForegroundColor Red
            break
        }
    }
} catch {
    Write-Host "Arret demande" -ForegroundColor Yellow
} finally {
    Cleanup
}
