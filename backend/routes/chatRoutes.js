const express = require('express');
const router = express.Router();

// Import des contrôleurs
const chatController = require('../controllers/chatController');
const authController = require('../controllers/authController');
const authService = require('../services/authService');

/**
 * Routes d'authentification (non protégées)
 */
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);

/**
 * Route du profil utilisateur (protégée)
 */
router.use('/auth/profile', authService.authMiddleware());
router.get('/auth/profile', authController.getProfile);

/**
 * Routes de chat (protégées par authentification JWT)
 */
router.use('/chat', authService.authMiddleware());
router.post('/chat', chatController.sendMessage);

/**
 * Routes de gestion des conversations (protégées)
 */
router.use('/conversations', authService.authMiddleware());
router.get('/conversations', chatController.getConversations);
router.put('/conversations/:conversationId', chatController.updateConversation);
router.delete('/conversations/:conversationId', chatController.deleteConversation);

/**
 * Routes de statut/santé de l'API (non protégées)
 */
router.get('/health', async (req, res) => {
  try {
    const databaseService = require('../services/databaseService');
    const groqService = require('../services/groqService');
    const packageInfo = require('../package.json');
    
    const dbHealth = await databaseService.healthCheck();
    const groqHealth = await groqService.checkHealth();
    
    res.json({
      status: 'healthy',
      service: `${packageInfo.name} v${packageInfo.version} - Adam Expert`,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      services: {
        database: dbHealth,
        ai: groqHealth
      },
      features: {
        authentication: 'JWT Bearer Token',
        database: `${dbHealth.database} with Prisma ORM`,
        groqIntegration: groqHealth.status === 'healthy',
        documentationService: true,
        odooVersion: '17.0',
        persistentConversations: true,
        markdownSupport: true,
        realTimeChat: true
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'Odoo Chatbot API - Adam Expert',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

router.get('/status', chatController.getHealthStatus);

module.exports = router;
