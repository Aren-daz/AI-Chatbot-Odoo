#!/bin/bash

# Script de démarrage pour Odoo Chatbot
# Lance le backend et le frontend simultanément

echo "🚀 Démarrage de Odoo Chatbot..."

# Fonction pour nettoyer les processus en arrière-plan
cleanup() {
    echo "🛑 Arrêt des services..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Capturer Ctrl+C pour nettoyer proprement
trap cleanup INT

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/"
    exit 1
fi

# Vérifier que npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez l'installer avec Node.js"
    exit 1
fi

echo "📦 Installation des dépendances..."

# Installer les dépendances du backend
echo "   - Backend..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

# Installer les dépendances du frontend
echo "   - Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

echo "✅ Dépendances installées!"

# Démarrer le backend en arrière-plan
echo "🔧 Démarrage du backend (port 3001)..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Attendre que le backend soit prêt
sleep 3

# Démarrer le frontend en arrière-plan
echo "🌐 Démarrage du frontend (port 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 Odoo Chatbot démarré avec succès!"
echo ""
echo "📍 Accès:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:3001"
echo ""
echo "💡 Conseils:"
echo "   - Ctrl+C pour arrêter les services"
echo "   - Consultez README.md pour plus d'informations"
echo ""

# Attendre que les processus se terminent
wait
