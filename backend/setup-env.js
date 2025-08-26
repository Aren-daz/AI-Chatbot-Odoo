const fs = require('fs');
const crypto = require('crypto');

// Génération d'une clé JWT sécurisée
const jwtSecret = crypto.randomBytes(64).toString('hex');

const envContent = `# Configuration du serveur
NODE_ENV=development
PORT=3001

# URL du frontend
FRONTEND_URL=http://localhost:3000

# Origins autorisées pour CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Configuration Groq AI
GROQ_API_KEY=your_groq_api_key_here

# Configuration de cache
CACHE_DURATION=3600000

# Configuration de logging
LOG_LEVEL=info

# Base de données SQLite (plus simple pour le développement)
DATABASE_URL="file:./dev.db"

# JWT Secret pour l'authentification (généré automatiquement)
JWT_SECRET=${jwtSecret}
`;

try {
  fs.writeFileSync('.env', envContent);
  console.log('✅ Fichier .env créé avec succès!');
  console.log('🔐 JWT_SECRET générée automatiquement');
  console.log('📄 Vous pouvez maintenant modifier GROQ_API_KEY dans le fichier .env');
} catch (error) {
  console.error('❌ Erreur lors de la création du fichier .env:', error);
}
