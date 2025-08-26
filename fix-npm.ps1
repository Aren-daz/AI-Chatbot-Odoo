# Script de réparation automatique de npm
Write-Host "🔧 Réparation automatique de npm..." -ForegroundColor Green

# 1. Vérifier l'installation actuelle
Write-Host "📋 Vérification de l'installation actuelle..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non trouvé" -ForegroundColor Red
    exit 1
}

# 2. Désinstaller npm corrompu
Write-Host "🗑️ Suppression de npm corrompu..." -ForegroundColor Yellow
try {
    # Supprimer le dossier npm corrompu
    $npmPath = "C:\Program Files\nodejs\node_modules\npm"
    if (Test-Path $npmPath) {
        Remove-Item -Path $npmPath -Recurse -Force
        Write-Host "✅ Dossier npm supprimé" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Erreur lors de la suppression: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Réinstaller npm proprement
Write-Host "📥 Réinstallation de npm..." -ForegroundColor Cyan
try {
    # Utiliser node pour installer npm
    node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install -g npm@latest
    Write-Host "✅ npm réinstallé avec succès" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Méthode alternative de réinstallation..." -ForegroundColor Yellow
    
    # Méthode alternative : télécharger et installer npm manuellement
    $npmUrl = "https://registry.npmjs.org/npm/-/npm-10.2.4.tgz"
    $npmTemp = "$env:TEMP\npm-fix.tgz"
    
    Write-Host "📥 Téléchargement de npm..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $npmUrl -OutFile $npmTemp
    
    Write-Host "🔧 Installation de npm..." -ForegroundColor Cyan
    # Créer le dossier npm
    $npmDir = "C:\Program Files\nodejs\node_modules\npm"
    New-Item -ItemType Directory -Path $npmDir -Force | Out-Null
    
    # Extraire et installer
    # Note: Cette partie nécessiterait des outils d'extraction
    Write-Host "⚠️ Installation manuelle requise" -ForegroundColor Yellow
    Write-Host "Veuillez réinstaller Node.js depuis https://nodejs.org/" -ForegroundColor Red
}

# 4. Vérifier la réparation
Write-Host "🔍 Vérification de la réparation..." -ForegroundColor Cyan
try {
    $npmVersion = npm --version
    Write-Host "✅ npm fonctionne: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm toujours défaillant" -ForegroundColor Red
    Write-Host "💡 Solution: Réinstaller Node.js complètement" -ForegroundColor Yellow
}

Write-Host "🎯 Instructions de réparation manuelle:" -ForegroundColor Cyan
Write-Host "1. Désinstaller Node.js depuis 'Programmes et fonctionnalités'" -ForegroundColor White
Write-Host "2. Redémarrer l'ordinateur" -ForegroundColor White
Write-Host "3. Télécharger Node.js LTS depuis https://nodejs.org/" -ForegroundColor White
Write-Host "4. Installer en tant qu'administrateur" -ForegroundColor White

Read-Host "Appuyez sur Entrée pour continuer..."
