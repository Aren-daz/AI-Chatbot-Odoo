# Configuration de la Base de Données PostgreSQL

## 1. Installation de PostgreSQL

### Windows :
1. Téléchargez PostgreSQL depuis https://www.postgresql.org/download/windows/
2. Installez avec les paramètres par défaut
3. Notez le mot de passe de l'utilisateur `postgres`

### Ou avec Docker (plus simple) :
```bash
docker run --name odoo-chatbot-db -e POSTGRES_PASSWORD=odoo_password -e POSTGRES_USER=odoo_user -e POSTGRES_DB=odoo_chatbot -p 5432:5432 -d postgres:15
```

## 2. Configuration du fichier .env

Créez un fichier `backend/.env` avec :

```env
# Configuration du serveur
NODE_ENV=development
PORT=3001

# URL du frontend
FRONTEND_URL=http://localhost:3000

# Origins autorisées pour CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Configuration Groq AI
GROQ_API_KEY=your_groq_api_key_here

# Base de données PostgreSQL
DATABASE_URL="postgresql://odoo_user:odoo_password@localhost:5432/odoo_chatbot?schema=public"

# JWT Secret pour l'authentification (générez une clé sécurisée)
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here_make_it_at_least_32_characters
```

## 3. Création de la base de données

```bash
# Depuis le dossier backend/
npm run db:migrate
npm run db:generate
```

## 4. Scripts disponibles

- `npm run db:migrate` - Applique les migrations
- `npm run db:generate` - Génère le client Prisma
- `npm run db:reset` - Remet à zéro la base de données
- `npm run db:studio` - Ouvre l'interface graphique Prisma Studio
