# 🤖 Odoo Chatbot - Expert Adam

Chatbot intelligent spécialisé pour les questions Odoo v17, développé par Adam pour **Schwing Stetter Algérie**.

![Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Odoo](https://img.shields.io/badge/Odoo-v17-purple)

## 🏗️ Architecture

```
Odoo Chatbot/
├── frontend/          # Application React + TailwindCSS + Framer Motion
├── backend/           # Serveur Node.js + Express + Sécurité renforcée
├── README.md         # Ce fichier
└── SECURITY.md       # Sécurité et bonnes pratiques
```

## ✨ Fonctionnalités Principales

### Interface Moderne (Style ChatGPT)
- 🎨 **Interface ChatGPT-like** avec sidebar et layout moderne
- 📱 **Responsive design** adaptatif (mobile, tablette, desktop)
- 🌓 **Mode clair/sombre** avec transitions fluides
- 🌍 **Multilingue** : Français et Arabe avec support RTL complet
- ⚡ **Animations fluides** avec Framer Motion
- 🎯 **Raccourcis clavier** pour une navigation rapide

### Chat Avancé
- 💬 **Messages avec Markdown** et coloration syntaxique
- 🔄 **Historique des conversations** avec sidebar navigable
- 📝 **Suggestions de messages** contextuelles
- 🎤 **Support audio** (préparé pour l'enregistrement vocal)
- 📎 **Upload de fichiers** (interface prête)
- 💾 **Sauvegarde automatique** des conversations
- 🔍 **Recherche** dans l'historique

### Backend Renforcé
- 🚀 **Node.js + Express** avec middleware de sécurité
- 🛡️ **Rate limiting** et protection CORS avancée
- 📊 **Logging structuré** et monitoring des erreurs
- 🗜️ **Compression** automatique des réponses
- 🔒 **Helmet.js** pour la sécurité des headers
- 🌐 **CORS intelligent** avec gestion des origines
- ⚡ **API optimisée** pour les performances

## 🚀 Installation et Lancement

### Prérequis
- **Node.js** version 16 ou supérieure
- **npm** ou **yarn**
- **Git** pour le clonage du projet

### Installation Rapide

1. **Cloner le projet**
```bash
git clone [votre-repo-url]
cd odoo-chatbot
```

2. **Démarrage automatique** (recommandé)
```bash
# Sur Linux/macOS
chmod +x start.sh
./start.sh

# Sur Windows
start.ps1
```

### Installation Manuelle

**1. Backend**
```bash
cd backend
npm install
npm run dev  # Mode développement avec nodemon
# ou
npm start    # Mode production
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev  # Démarre sur http://localhost:3000
```

### 🐳 Docker (Option Alternative)
```bash
# À venir : support Docker pour déploiement facile
docker-compose up -d
```

## ⚙️ Configuration

### Variables d'Environnement

**Backend (`backend/.env`)**
```env
# Serveur
PORT=3001
NODE_ENV=development

# CORS et Sécurité
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Chat
CHAT_MAX_MESSAGE_LENGTH=2000
CHAT_SIMULATION_DELAY_MIN=500
CHAT_SIMULATION_DELAY_MAX=2000
```

**Frontend (`frontend/.env`)**
```env
# API
REACT_APP_API_URL=http://localhost:3001
REACT_APP_API_TIMEOUT=30000

# Application
REACT_APP_APP_NAME=Odoo Chatbot
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=development

# Fonctionnalités
REACT_APP_MAX_MESSAGE_LENGTH=2000
REACT_APP_MAX_CONVERSATIONS=50
REACT_APP_ANIMATION_ENABLED=true
```

### Personnalisation

- **Thème** : Modifiez `tailwind.config.js` pour les couleurs
- **Traductions** : Ajoutez des langues dans `frontend/src/context/LanguageContext.js`
- **API** : Intégrez votre LLM dans `backend/controllers/chatController.js`

## 🔧 Développement

### Structure Backend Complète
```
backend/
├── server.js              # Point d'entrée avec sécurité renforcée
├── routes/
│   └── chatRoutes.js      # Routes API REST
├── controllers/
│   └── chatController.js  # Logique métier + simulation LLM
├── package.json           # Dépendances avec sécurité
└── .env.example          # Template de configuration
```

### Structure Frontend Moderne
```
frontend/
├── src/
│   ├── components/
│   │   ├── Sidebar.js           # Navigation conversations
│   │   ├── ChatLayout.js        # Layout principal
│   │   ├── ChatMessage.v2.js    # Messages avec Markdown
│   │   ├── ChatInput.v2.js      # Input avancé
│   │   └── Header.js            # Header responsive
│   ├── hooks/
│   │   ├── useChat.js           # Gestion état chat
│   │   └── useLocalStorage.js   # Persistance données
│   ├── context/
│   │   ├── ThemeContext.js      # Thème clair/sombre
│   │   └── LanguageContext.js   # I18n + RTL
│   ├── utils/
│   │   ├── constants.js         # Configuration
│   │   ├── classNames.js        # Utilitaires CSS
│   │   └── api.js               # Client API
│   └── styles/
│       └── index.css            # Styles modernes
└── package.json                 # Dépendances React + animations
```

### Technologies Utilisées

**Frontend**
- React 18 + Hooks
- TailwindCSS + PostCSS
- Framer Motion (animations)
- React Markdown + Syntax Highlighting
- Lucide React (icônes)
- PropTypes (validation)

**Backend**
- Express.js + middleware
- Helmet.js (sécurité)
- CORS + Rate Limiting
- Morgan (logging)
- Compression

## 🔮 Intégration LLM

### Préparation pour LLM

Le projet est **prêt pour l'intégration** d'un LLM spécialisé Odoo :

**1. Remplacement du Controller**
```javascript
// backend/controllers/chatController.js
const { LlamaIndex } = require('llamaindex');

async function handleChatMessage(req, res) {
  const { message } = req.body;
  
  // Votre logique LLM ici
  const vectorStore = await loadOdooDocumentation();
  const context = await vectorStore.similaritySearch(message);
  const response = await llm.invoke(message, context);
  
  res.json({ reply: response });
}
```

**2. Intégrations Suggérées**
- **LlamaIndex** : RAG sur documentation Odoo
- **LangChain** : Chaînes de traitement complexes
- **OpenAI API** : GPT-4 avec contexte Odoo
- **Ollama** : LLM local (Llama 2, Mistral)

**3. Extensions Possibles**
- 🔍 **Recherche vectorielle** dans la doc Odoo
- 📊 **Analytics** des conversations
- 🔗 **Intégration directe** avec instances Odoo
- 🎯 **Suggestions contextuelles** intelligentes

## 🔒 Sécurité

✅ **Toutes les vulnérabilités de sécurité ont été corrigées**
- Frontend : 0 vulnérabilité
- Backend : 0 vulnérabilité
- Voir [SECURITY.md](SECURITY.md) pour les détails

## 📝 API Documentation

### Endpoints Disponibles

#### `POST /api/chat`
Envoie un message au chatbot et reçoit une réponse.

**Requête :**
```json
{
  "message": "Comment configurer les ventes dans Odoo ?"
}
```

**Réponse :**
```json
{
  "reply": "Pour configurer les ventes dans Odoo...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "responseTime": 1250,
  "questionType": "ventes",
  "messageLength": 45
}
```

#### `GET /api/health`
Vérifie le statut de l'API.

**Réponse :**
```json
{
  "status": "healthy",
  "service": "Odoo Chatbot API",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600
}
```

### Rate Limiting
- **Global** : 100 requêtes / 15 minutes
- **Chat** : 30 messages / minute
- **Headers** : `X-RateLimit-*` dans les réponses

### Gestion d'Erreurs
```json
{
  "error": "Type d'erreur",
  "message": "Description détaillée",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🐛 Dépannage

- **Erreur CORS**: Vérifier que le backend tourne sur le bon port
- **Module non trouvé**: Exécuter `npm install` dans les deux dossiers
- **Port occupé**: Changer le port dans les fichiers de configuration

## 🎯 Fonctionnalités Avancées

### Interface
- ⌨️ **Raccourcis clavier** : `Ctrl+Shift+O` (nouveau chat), `Ctrl+L` (focus input)
- 🔍 **Recherche** dans l'historique des conversations
- 📱 **Mode mobile** optimisé avec sidebar responsive
- 🎨 **Animations fluides** et transitions modernes
- 🌍 **Support RTL** complet pour l'arabe

### Développement
- 🔧 **Variables d'environnement** pour la configuration
- 📊 **Logging structuré** et monitoring d'erreurs
- 🛡️ **Sécurité renforcée** (Helmet, CORS, Rate Limiting)
- ♿ **Accessibilité** (ARIA labels, navigation clavier)
- 🎭 **PropTypes** pour la validation des composants

## 👨‍💻 Stack Technologique

### Frontend
- **React 18** + Hooks modernes
- **TailwindCSS 3** + configuration personnalisée
- **Framer Motion** pour les animations
- **React Markdown** + coloration syntaxique
- **Lucide React** pour les icônes
- **PropTypes** pour la validation

### Backend
- **Node.js + Express.js**
- **Helmet.js** pour la sécurité
- **Express Rate Limit** anti-spam
- **CORS** intelligent et configurable
- **Morgan** pour le logging
- **Compression** des réponses

## 🚀 Performance

- ⚡ **Lazy loading** des composants
- 🗜️ **Compression** automatique (gzip)
- 💾 **Cache** localStorage intelligent
- 📱 **Bundle optimisé** pour mobile
- 🎯 **Code splitting** automatique
