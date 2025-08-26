const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authService = require('../services/authService');

/**
 * Routes pour la gestion du feedback et des métriques
 */

// Middleware d'authentification pour toutes les routes
router.use(authService.authMiddleware());

/**
 * @route POST /api/feedback
 * @desc Soumet un feedback utilisateur sur une réponse
 * @access Private
 * @body {
 *   messageId: number,
 *   conversationId: number,
 *   rating: number (1-5),
 *   comment?: string,
 *   feedbackType?: string,
 *   suggestions?: Array<string>
 * }
 */
router.post('/', feedbackController.submitFeedback);

/**
 * @route GET /api/feedback/metrics
 * @desc Récupère les métriques de performance du chatbot
 * @access Private (Admin only)
 * @query {
 *   period?: string ('1d', '7d', '30d', '90d'),
 *   detailed?: boolean
 * }
 */
router.get('/metrics', feedbackController.getPerformanceMetrics);

/**
 * @route GET /api/feedback/improvement-report
 * @desc Génère un rapport d'amélioration basé sur le feedback
 * @access Private (Admin only)
 * @query {
 *   period?: string ('7d', '30d', '90d')
 * }
 */
router.get('/improvement-report', feedbackController.generateImprovementReport);

module.exports = router;
