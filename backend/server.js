// Charger les variables d'environnement EN PREMIER
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import des services et routes APRÈS dotenv
const databaseService = require('./services/databaseService');
const chatRoutes = require('./routes/chatRoutes');

// Configuration de l'application
const app = express();
const PORT = 3001; // Forcé pour correspondre au frontend
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_DEV = NODE_ENV !== 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// CORS doit être configuré le plus tôt possible (avant rate limiting et routes)
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    if (NODE_ENV === 'development') {
      const allowedDevPorts = [5173, 3000];
      try {
        const originUrl = new URL(origin);
        const isLocalHost = originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1';
        if (isLocalHost && allowedDevPorts.includes(parseInt(originUrl.port))) {
          return callback(null, true);
        }
      } catch (e) {}
    }
    callback(new Error('Non autorisé par CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Configuration du rate limiting
const limiter = IS_DEV
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limite de 100 requêtes par fenêtre
      message: {
        error: 'Trop de requêtes',
        message: 'Veuillez patienter avant de faire une nouvelle demande',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

// Rate limiting plus strict pour les endpoints de chat
const chatLimiter = IS_DEV
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // 30 messages par minute max
      message: {
        error: 'Trop de messages',
        message: 'Vous envoyez trop de messages. Veuillez patienter.',
        retryAfter: 60
      }
    });

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// Compression des réponses
const compression = require('compression');
app.use(compression());

// Logging des requêtes
if (NODE_ENV !== 'test') {
  const morgan = require('morgan');
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Application du rate limiting global
app.use(limiter);

// (CORS est déjà appliqué plus haut)

// Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));


app.get('/favicon.ico', (req, res) => res.status(204));
app.use(express.urlencoded({ extended: true }));

// Routes de base
app.get('/', (req, res) => {
  res.json({
    message: '🤖 Odoo Chatbot API',
    status: 'Active',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/chat'
    }
  });
});

// Routes API
const authRoutes = require('./routes/authRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

// Appliquer le rate limiting avant les routes
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api', chatRoutes);

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  // Log de l'erreur
  console.error('Erreur serveur:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined
  });
  
  // Gestion spécifique des erreurs CORS
  if (err.message === 'Non autorisé par CORS') {
    return res.status(403).json({
      error: 'Accès interdit',
      message: 'Cette origine n\'est pas autorisée à accéder à l\'API'
    });
  }
  
  // Réponse d'erreur
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Erreur interne du serveur' : err.message,
    message: NODE_ENV === 'development' ? err.message : 'Une erreur s\'est produite',
    timestamp: new Date().toISOString(),
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: `La route ${req.originalUrl} n'existe pas`
  });
});

// Initialisation de la base de données et démarrage du serveur
async function startServer() {
  try {
    // Initialiser la connexion à la base de données
    await databaseService.initialize();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`
🚀 Serveur Odoo Chatbot démarré !
📍 URL: http://localhost:${PORT}
🌍 CORS autorisé pour: ${FRONTEND_URL}
🗄️ Base de données: PostgreSQL connectée
🔐 Authentification: JWT activée
⏰ Démarré le: ${new Date().toLocaleString('fr-FR')}
      `);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();

// Gestion des arrêts propres
process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu, arrêt du serveur...');
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT reçu, arrêt du serveur...');
  await databaseService.disconnect();
  process.exit(0);
});

module.exports = app;
