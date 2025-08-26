@echo off
echo 🔧 Réparation automatique de npm...
echo.

echo 📋 Vérification de Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js non trouvé
    pause
    exit /b 1
)

echo ✅ Node.js fonctionne
echo.

echo 🗑️ Suppression de npm corrompu...
if exist "C:\Program Files\nodejs\node_modules\npm" (
    rmdir /s /q "C:\Program Files\nodejs\node_modules\npm"
    echo ✅ Dossier npm supprimé
) else (
    echo ℹ️ Dossier npm non trouvé
)

echo.
echo 🔧 Tentative de réparation...
echo.

echo 📥 Téléchargement de npm de réparation...
powershell -Command "Invoke-WebRequest -Uri 'https://registry.npmjs.org/npm/-/npm-10.2.4.tgz' -OutFile '%TEMP%\npm-fix.tgz'"

if exist "%TEMP%\npm-fix.tgz" (
    echo ✅ npm téléchargé
    echo.
    echo 🎯 Instructions de réparation:
    echo 1. Désinstaller Node.js depuis 'Programmes et fonctionnalités'
    echo 2. Redémarrer l'ordinateur
    echo 3. Télécharger Node.js LTS depuis https://nodejs.org/
    echo 4. Installer en tant qu'administrateur
    echo.
    echo 💡 Le fichier npm-fix.tgz est dans %TEMP%
) else (
    echo ❌ Échec du téléchargement
)

echo.
echo 🔍 Test de npm...
npm --version
if %errorlevel% equ 0 (
    echo ✅ npm fonctionne maintenant!
) else (
    echo ❌ npm toujours défaillant
    echo 💡 Réinstallation complète requise
)

echo.
pause
