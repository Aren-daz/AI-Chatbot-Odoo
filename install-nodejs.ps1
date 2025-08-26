# Script d'installation automatique de Node.js et des dépendances
Write-Host "🚀 Installation automatique du chatbot Odoo..." -ForegroundColor Green

# 1. Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js déjà installé: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "📥 Node.js non trouvé, téléchargement en cours..." -ForegroundColor Yellow
    
    # Télécharger Node.js
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $installerPath = "$env:TEMP\nodejs-installer.msi"
    
    Write-Host "📥 Téléchargement de Node.js..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath
    
    Write-Host "🔧 Installation de Node.js..." -ForegroundColor Cyan
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$installerPath`" /quiet"
    
    # Nettoyer
    Remove-Item $installerPath -Force
    
    Write-Host "✅ Node.js installé avec succès!" -ForegroundColor Green
    
    # Recharger les variables d'environnement
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# 2. Vérifier npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm disponible: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm non disponible après installation de Node.js" -ForegroundColor Red
    Write-Host "Veuillez redémarrer votre terminal et relancer le script" -ForegroundColor Yellow
    exit 1
}

# 3. Installer les dépendances du backend
Write-Host "📦 Installation des dépendances backend..." -ForegroundColor Cyan
Set-Location ".\backend"
npm install

# 4. Installer les dépendances du frontend
Write-Host "📦 Installation des dépendances frontend..." -ForegroundColor Cyan
Set-Location "..\frontend"
npm install

# 5. Retour au répertoire racine
Set-Location ".."

Write-Host "🎉 Installation terminée avec succès!" -ForegroundColor Green
Write-Host "🚀 Pour démarrer le chatbot:" -ForegroundColor Cyan
Write-Host "   Backend: cd backend; npm run dev" -ForegroundColor White
Write-Host "   Frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "   Ou utilisez le script start.ps1" -ForegroundColor White

# Pause pour voir les résultats
Read-Host "Appuyez sur Entrée pour continuer..."
