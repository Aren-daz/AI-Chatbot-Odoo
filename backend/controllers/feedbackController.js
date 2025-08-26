/**
 * Contrôleur pour la gestion du feedback et des métriques d'apprentissage
 * 
 * Ce contrôleur gère :
 * - Collecte du feedback utilisateur
 * - Analyse des performances du chatbot
 * - Métriques d'amélioration continue
 * - Rapports de qualité
 */

const databaseService = require('../services/databaseService');
const odooDocService = require('../services/odooDocService');

/**
 * Enregistre un feedback utilisateur sur une réponse
 * @param {Object} req - Objet de requête Express
 * @param {Object} res - Objet de réponse Express
 */
async function submitFeedback(req, res) {
  try {
    const { messageId, conversationId, rating, comment, feedbackType, suggestions } = req.body;
    const userId = req.user.id;

    // Validation de la requête
    if (!messageId || !conversationId || !rating) {
      return res.status(400).json({
        error: 'Données manquantes',
        message: 'messageId, conversationId et rating sont requis'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating invalide',
        message: 'Le rating doit être entre 1 et 5'
      });
    }

    // Vérifier que la conversation appartient à l'utilisateur
    const conversations = await databaseService.getUserConversations(userId);
    const conversation = conversations.find(c => c.id === parseInt(conversationId));
    
    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation non trouvée',
        message: 'La conversation demandée n\'existe pas ou ne vous appartient pas'
      });
    }

    // Créer le feedback
    const feedback = await databaseService.createFeedback({
      messageId: parseInt(messageId),
      conversationId: parseInt(conversationId),
      userId: userId,
      rating: rating,
      comment: comment || '',
      feedbackType: feedbackType || 'general',
      suggestions: suggestions || [],
      timestamp: new Date(),
      metadata: {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        responseTime: req.body.responseTime || null
      }
    });

    console.log(`📝 Feedback reçu: ${rating}/5 pour message ${messageId}`);

    // Analyser le feedback pour amélioration continue
    await analyzeFeedbackForImprovement(feedback, conversation);

    res.json({
      success: true,
      message: 'Feedback enregistré avec succès',
      feedbackId: feedback.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du feedback:', error);
    
    res.status(500).json({
      error: 'Erreur interne du serveur',
      message: 'Impossible d\'enregistrer le feedback',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Récupère les métriques de performance du chatbot
 * @param {Object} req - Objet de requête Express
 * @param {Object} res - Objet de réponse Express
 */
async function getPerformanceMetrics(req, res) {
  try {
    const { period = '7d', detailed = false } = req.query;
    
    // Calculer la période
    const periodMs = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };

    const startDate = new Date(Date.now() - (periodMs[period] || periodMs['7d']));

    // Récupérer les métriques de base
    const metrics = await databaseService.getPerformanceMetrics(startDate);
    
    // Métriques de feedback
    const feedbackMetrics = await databaseService.getFeedbackMetrics(startDate);
    
    // Métriques de documentation
    const docMetrics = odooDocService.getStats();

    // Analyser les tendances
    const trends = await analyzeTrends(startDate, period);

    const response = {
      success: true,
      period: period,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      overview: {
        totalConversations: metrics.conversationCount,
        totalMessages: metrics.messageCount,
        averageRating: feedbackMetrics.averageRating,
        totalFeedbacks: feedbackMetrics.totalFeedbacks,
        satisfactionRate: feedbackMetrics.satisfactionRate,
        resolutionRate: metrics.resolutionRate
      },
      feedback: {
        ratingDistribution: feedbackMetrics.ratingDistribution,
        topIssues: feedbackMetrics.topIssues,
        improvementSuggestions: feedbackMetrics.suggestions
      },
      documentation: {
        totalDocuments: docMetrics.totalDocuments,
        mostSearchedTopics: feedbackMetrics.popularTopics,
        coverage: docMetrics.sections
      },
      trends: trends
    };

    if (detailed) {
      response.detailed = {
        dailyMetrics: await getDailyMetrics(startDate),
        topQuestions: await getTopQuestions(startDate),
        userBehavior: await getUserBehaviorAnalysis(startDate)
      };
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des métriques:', error);
    
    res.status(500).json({
      error: 'Erreur interne du serveur',
      message: 'Impossible de récupérer les métriques',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Génère un rapport d'amélioration basé sur le feedback
 * @param {Object} req - Objet de requête Express
 * @param {Object} res - Objet de réponse Express
 */
async function generateImprovementReport(req, res) {
  try {
    const { period = '30d' } = req.query;
    
    const periodMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };

    const startDate = new Date(Date.now() - (periodMs[period] || periodMs['30d']));

    // Analyser les feedbacks négatifs
    const negativeFeedbacks = await databaseService.getNegativeFeedbacks(startDate);
    
    // Identifier les patterns de problèmes
    const problemPatterns = await identifyProblemPatterns(negativeFeedbacks);
    
    // Suggestions d'amélioration automatiques
    const improvements = await generateImprovementSuggestions(problemPatterns);
    
    // Questions sans réponse satisfaisante
    const unsolvedQuestions = await getUnsolvedQuestions(startDate);

    const report = {
      success: true,
      period: period,
      generatedAt: new Date().toISOString(),
      summary: {
        totalNegativeFeedbacks: negativeFeedbacks.length,
        criticalIssues: problemPatterns.critical.length,
        mediumIssues: problemPatterns.medium.length,
        unsolvedQuestions: unsolvedQuestions.length
      },
      criticalIssues: problemPatterns.critical,
      recommendations: improvements.priority,
      documentationGaps: improvements.documentationNeeds,
      actionPlan: {
        immediate: improvements.immediate,
        shortTerm: improvements.shortTerm,
        longTerm: improvements.longTerm
      },
      unsolvedQuestions: unsolvedQuestions.slice(0, 10) // Top 10
    };

    res.json(report);

  } catch (error) {
    console.error('❌ Erreur lors de la génération du rapport:', error);
    
    res.status(500).json({
      error: 'Erreur interne du serveur',
      message: 'Impossible de générer le rapport d\'amélioration',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Analyse le feedback pour identifier les améliorations possibles
 * @param {Object} feedback - Feedback utilisateur
 * @param {Object} conversation - Conversation associée
 */
async function analyzeFeedbackForImprovement(feedback, conversation) {
  try {
    // Identifier les patterns de feedback négatif
    if (feedback.rating <= 2) {
      console.log(`⚠️ Feedback négatif détecté: ${feedback.rating}/5`);
      
      // Analyser le type de problème
      const problemType = categorizeProblem(feedback.comment, feedback.feedbackType);
      
      // Logger pour analyse ultérieure
      console.log(`📊 Type de problème: ${problemType}`);
      
      // Si c'est un problème de documentation, l'enregistrer
      if (problemType === 'documentation_gap') {
        await logDocumentationGap(feedback, conversation);
      }
    }

    // Feedback positif : identifier ce qui fonctionne bien
    if (feedback.rating >= 4) {
      await logSuccessPattern(feedback, conversation);
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse du feedback:', error);
  }
}

/**
 * Catégorise le type de problème basé sur le feedback
 * @param {string} comment - Commentaire utilisateur
 * @param {string} feedbackType - Type de feedback
 * @returns {string} Catégorie du problème
 */
function categorizeProblem(comment, feedbackType) {
  if (!comment) return 'unknown';
  
  const commentLower = comment.toLowerCase();
  
  if (commentLower.includes('pas trouvé') || commentLower.includes('manque') || commentLower.includes('incomplet')) {
    return 'documentation_gap';
  }
  
  if (commentLower.includes('erreur') || commentLower.includes('bug') || commentLower.includes('marche pas')) {
    return 'technical_error';
  }
  
  if (commentLower.includes('lent') || commentLower.includes('long') || commentLower.includes('attente')) {
    return 'performance_issue';
  }
  
  if (commentLower.includes('compliqué') || commentLower.includes('difficile') || commentLower.includes('comprend pas')) {
    return 'clarity_issue';
  }
  
  return 'general_dissatisfaction';
}

/**
 * Analyse les tendances sur une période donnée
 * @param {Date} startDate - Date de début
 * @param {string} period - Période d'analyse
 * @returns {Object} Tendances identifiées
 */
async function analyzeTrends(startDate, period) {
  try {
    const previousPeriodStart = new Date(startDate.getTime() - (Date.now() - startDate.getTime()));
    
    const currentMetrics = await databaseService.getPerformanceMetrics(startDate);
    const previousMetrics = await databaseService.getPerformanceMetrics(previousPeriodStart, startDate);

    const trends = {
      conversationGrowth: calculateGrowth(currentMetrics.conversationCount, previousMetrics.conversationCount),
      ratingTrend: calculateGrowth(currentMetrics.averageRating, previousMetrics.averageRating),
      responseTimeTrend: calculateGrowth(previousMetrics.averageResponseTime, currentMetrics.averageResponseTime), // Inversé car moins = mieux
      satisfactionTrend: calculateGrowth(currentMetrics.satisfactionRate, previousMetrics.satisfactionRate)
    };

    return trends;

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse des tendances:', error);
    return {
      conversationGrowth: 0,
      ratingTrend: 0,
      responseTimeTrend: 0,
      satisfactionTrend: 0
    };
  }
}

/**
 * Calcule le pourcentage de croissance
 * @param {number} current - Valeur actuelle
 * @param {number} previous - Valeur précédente
 * @returns {number} Pourcentage de croissance
 */
function calculateGrowth(current, previous) {
  if (!previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Enregistre un manque dans la documentation
 * @param {Object} feedback - Feedback utilisateur
 * @param {Object} conversation - Conversation associée
 */
async function logDocumentationGap(feedback, conversation) {
  try {
    // Extraire la question de l'utilisateur de la conversation
    const userMessages = conversation.messages.filter(m => m.isUser);
    const lastQuestion = userMessages[userMessages.length - 1];
    
    if (lastQuestion) {
      console.log(`📝 Gap documentation identifié: "${lastQuestion.text.substring(0, 100)}..."`);
      
      // TODO: Ajouter à une base de données de gaps à combler
      // Ceci pourrait être utilisé pour prioriser l'ajout de nouvelle documentation
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du gap documentation:', error);
  }
}

/**
 * Enregistre un pattern de succès
 * @param {Object} feedback - Feedback positif
 * @param {Object} conversation - Conversation associée
 */
async function logSuccessPattern(feedback, conversation) {
  try {
    console.log(`✅ Pattern de succès identifié: ${feedback.rating}/5`);
    // TODO: Analyser ce qui a bien fonctionné pour le reproduire
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du pattern de succès:', error);
  }
}

/**
 * Identifie les patterns de problèmes récurrents
 * @param {Array} negativeFeedbacks - Feedbacks négatifs
 * @returns {Object} Patterns identifiés
 */
async function identifyProblemPatterns(negativeFeedbacks) {
  const patterns = {
    critical: [],
    medium: [],
    low: []
  };

  // Grouper par type de problème
  const problemGroups = {};
  negativeFeedbacks.forEach(feedback => {
    const type = categorizeProblem(feedback.comment, feedback.feedbackType);
    if (!problemGroups[type]) problemGroups[type] = [];
    problemGroups[type].push(feedback);
  });

  // Analyser la criticité
  for (const [type, feedbacks] of Object.entries(problemGroups)) {
    const severity = {
      type: type,
      count: feedbacks.length,
      percentage: (feedbacks.length / negativeFeedbacks.length) * 100,
      examples: feedbacks.slice(0, 3).map(f => f.comment)
    };

    if (severity.count >= 5 || severity.percentage >= 20) {
      patterns.critical.push(severity);
    } else if (severity.count >= 2 || severity.percentage >= 10) {
      patterns.medium.push(severity);
    } else {
      patterns.low.push(severity);
    }
  }

  return patterns;
}

/**
 * Génère des suggestions d'amélioration automatiques
 * @param {Object} problemPatterns - Patterns de problèmes identifiés
 * @returns {Object} Suggestions d'amélioration
 */
async function generateImprovementSuggestions(problemPatterns) {
  const suggestions = {
    priority: [],
    immediate: [],
    shortTerm: [],
    longTerm: [],
    documentationNeeds: []
  };

  // Traiter les problèmes critiques
  problemPatterns.critical.forEach(pattern => {
    switch (pattern.type) {
      case 'documentation_gap':
        suggestions.priority.push({
          action: 'Enrichir la documentation',
          description: `${pattern.count} utilisateurs ont signalé des manques de documentation`,
          priority: 'HIGH',
          estimatedEffort: 'Medium'
        });
        suggestions.documentationNeeds.push({
          topic: 'Sujets manquants identifiés',
          urgency: 'HIGH',
          examples: pattern.examples
        });
        break;
        
      case 'technical_error':
        suggestions.immediate.push({
          action: 'Corriger les erreurs techniques',
          description: `${pattern.count} rapports d'erreurs techniques`,
          priority: 'CRITICAL',
          estimatedEffort: 'High'
        });
        break;
        
      case 'performance_issue':
        suggestions.shortTerm.push({
          action: 'Optimiser les performances',
          description: `${pattern.count} plaintes de lenteur`,
          priority: 'HIGH',
          estimatedEffort: 'Medium'
        });
        break;
        
      case 'clarity_issue':
        suggestions.shortTerm.push({
          action: 'Améliorer la clarté des réponses',
          description: `${pattern.count} utilisateurs trouvent les réponses peu claires`,
          priority: 'MEDIUM',
          estimatedEffort: 'Low'
        });
        break;
    }
  });

  return suggestions;
}

/**
 * Récupère les questions non résolues
 * @param {Date} startDate - Date de début
 * @returns {Array} Questions non résolues
 */
async function getUnsolvedQuestions(startDate) {
  try {
    // Questions avec feedback négatif ou sans feedback
    const unsolvedQuestions = await databaseService.getUnsolvedQuestions(startDate);
    
    return unsolvedQuestions.map(q => ({
      question: q.text,
      conversationId: q.conversationId,
      userId: q.userId,
      timestamp: q.timestamp,
      rating: q.rating || 'No rating',
      attempts: q.attempts || 1
    }));
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des questions non résolues:', error);
    return [];
  }
}

/**
 * Récupère les métriques quotidiennes
 * @param {Date} startDate - Date de début
 * @returns {Array} Métriques par jour
 */
async function getDailyMetrics(startDate) {
  try {
    return await databaseService.getDailyMetrics(startDate);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des métriques quotidiennes:', error);
    return [];
  }
}

/**
 * Récupère les questions les plus fréquentes
 * @param {Date} startDate - Date de début
 * @returns {Array} Top questions
 */
async function getTopQuestions(startDate) {
  try {
    return await databaseService.getTopQuestions(startDate);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des top questions:', error);
    return [];
  }
}

/**
 * Analyse le comportement des utilisateurs
 * @param {Date} startDate - Date de début
 * @returns {Object} Analyse comportementale
 */
async function getUserBehaviorAnalysis(startDate) {
  try {
    return await databaseService.getUserBehaviorAnalysis(startDate);
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse comportementale:', error);
    return {};
  }
}

module.exports = {
  submitFeedback,
  getPerformanceMetrics,
  generateImprovementReport
};
