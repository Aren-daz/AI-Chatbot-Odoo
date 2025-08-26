const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

/**
 * Service de base de données avec Prisma et PostgreSQL
 * Gère toutes les opérations CRUD pour l'application Odoo Chatbot
 */
class DatabaseService {
  constructor() {
    // Initialiser Prisma avec PostgreSQL
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
    
    // Configuration retry
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 seconde
      maxDelay: 10000, // 10 secondes max
      retryableErrors: [
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'P2002', // Prisma unique constraint violation
        'P2024', // Prisma timeout
        'P2028', // Prisma transaction timeout
      ],
    };
    
    console.log('🗄️ Service de base de données initialisé');
  }

  /**
   * Initialise la connexion à la base de données
   */
  async initialize() {
    try {
      await this.prisma.$connect();
      console.log('✅ Connexion PostgreSQL établie');
    } catch (error) {
      console.error('❌ Erreur connexion PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Ferme la connexion à la base de données
   */
  async disconnect() {
    try {
      await this.prisma.$disconnect();
      console.log('🔌 Connexion PostgreSQL fermée');
    } catch (error) {
      console.error('❌ Erreur fermeture PostgreSQL:', error);
    }
  }

  // ===============================
  // MÉCANISME DE RETRY ET FALLBACK
  // ===============================

  /**
   * Wrapper avec retry automatique pour les opérations critiques
   * @param {Function} operation - Opération à exécuter
   * @param {string} operationName - Nom de l'opération pour les logs
   * @param {Object} fallbackValue - Valeur de fallback en cas d'échec total
   * @returns {Promise} Résultat de l'opération ou fallback
   */
  async executeWithRetry(operation, operationName, fallbackValue = null) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Vérifier si l'erreur est retryable
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || attempt >= this.retryConfig.maxRetries) {
          console.error(`❌ Échec définitif ${operationName} après ${attempt} tentative(s):`, error.message);
          
          // Retourner la valeur de fallback si fournie
          if (fallbackValue !== null) {
            console.warn(`🔄 Utilisation valeur fallback pour ${operationName}`);
            return fallbackValue;
          }
          
          throw error;
        }
        
        // Calculer le délai avec backoff exponentiel
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelay
        );
        
        console.warn(`⚠️ Tentative ${attempt}/${this.retryConfig.maxRetries} échec ${operationName}: ${error.message}`);
        console.warn(`🔄 Retry dans ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Vérifie si une erreur est retryable
   * @param {Error} error - Erreur à analyser
   * @returns {boolean} True si l'erreur est retryable
   */
  isRetryableError(error) {
    const errorCode = error.code || error.meta?.code;
    const errorMessage = error.message.toLowerCase();
    
    // Codes d'erreur Prisma retryables
    if (this.retryConfig.retryableErrors.includes(errorCode)) {
      return true;
    }
    
    // Messages d'erreur réseau retryables
    const networkErrors = [
      'connection refused',
      'connection timeout',
      'connection lost',
      'server is not ready',
      'pool is closed',
      'query timeout',
    ];
    
    return networkErrors.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Fonction utilitaire pour temporiser
   * @param {number} ms - Millisecondes à attendre
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===============================
  // GESTION DES UTILISATEURS
  // ===============================

  /**
   * Crée un nouvel utilisateur
   */
  async createUser(userData) {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: userData.email,
          pseudonyme: userData.pseudonyme,
          passwordHash: userData.passwordHash,
        },
        include: {
          settings: true,
        },
      });

      // Créer les paramètres par défaut
      await this.prisma.userSettings.create({
        data: {
          userId: user.id,
        },
      });

      console.log(`👤 Utilisateur créé: ${user.email}`);
      return user;
    } catch (error) {
      console.error('❌ Erreur création utilisateur:', error);
      throw error;
    }
  }

  /**
   * Trouve un utilisateur par email (avec retry)
   */
  async findUserByEmail(email) {
    return this.executeWithRetry(
      () => this.prisma.user.findUnique({
        where: { email },
        include: {
          settings: true,
        },
      }),
      'findUserByEmail',
      null
    );
  }

  /**
   * Met à jour un utilisateur
   */
  async updateUser(userId, updateData) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          settings: true,
        },
      });
      console.log(`📝 Utilisateur mis à jour: ${user.email}`);
      return user;
    } catch (error) {
      console.error('❌ Erreur mise à jour utilisateur:', error);
      throw error;
    }
  }

  // ===============================
  // GESTION DES CONVERSATIONS
  // ===============================

  /**
   * Récupère toutes les conversations d'un utilisateur (sans messages, avec retry)
   */
  async getUserConversations(userId) {
    return this.executeWithRetry(
      () => this.prisma.conversation.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
            select: {
              id: true,
              text: true,
              timestamp: true,
              isUser: true,
              sources: true,
              isError: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      'getUserConversations',
      [] // Fallback: liste vide
    );
  }

  /**
   * Récupère les messages d'une conversation avec pagination
   * @param {number} conversationId - ID de la conversation
   * @param {Object} options - Options de pagination
   * @param {number} options.page - Numéro de page (défaut: 1)
   * @param {number} options.limit - Limite par page (défaut: 50)
   * @param {string} options.cursor - Curseur pour pagination cursor-based (optionnel)
   * @returns {Promise<Object>} Messages paginés avec métadonnées
   */
  async getConversationMessages(conversationId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        cursor = null,
        orderBy = 'desc' // 'asc' ou 'desc'
      } = options;

      // Utiliser cursor-based pagination si fourni, sinon offset-based
      const queryOptions = {
        where: { conversationId },
        take: limit,
        orderBy: { timestamp: orderBy },
        select: {
          id: true,
          text: true,
          isUser: true,
          timestamp: true,
          sources: true,
          isError: true,
        },
      };

      if (cursor) {
        // Pagination cursor-based (plus efficace pour grandes datasets)
        queryOptions.cursor = { id: parseInt(cursor) };
        queryOptions.skip = 1; // Ignorer le curseur lui-même
      } else {
        // Pagination offset-based
        queryOptions.skip = (page - 1) * limit;
      }

      const messages = await this.prisma.message.findMany(queryOptions);

      // Obtenir le total pour les métadonnées (seulement pour offset-based)
      const totalCount = cursor ? null : await this.prisma.message.count({
        where: { conversationId },
      });

      const hasMore = messages.length === limit;
      const nextCursor = hasMore ? messages[messages.length - 1].id.toString() : null;

      return {
        messages: orderBy === 'desc' ? messages.reverse() : messages, // Ordre chronologique pour l'affichage
        pagination: {
          page: cursor ? null : page,
          limit,
          total: totalCount,
          hasMore,
          nextCursor,
          totalPages: totalCount ? Math.ceil(totalCount / limit) : null,
        },
      };
    } catch (error) {
      console.error('❌ Erreur récupération messages paginés:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle conversation
   */
  async createConversation(userId, title = 'Nouvelle conversation') {
    try {
      const conversation = await this.prisma.conversation.create({
        data: {
          userId,
          title,
        },
        include: {
          messages: true,
        },
      });
      console.log(`💬 Conversation créée: ${conversation.title}`);
      return conversation;
    } catch (error) {
      console.error('❌ Erreur création conversation:', error);
      throw error;
    }
  }

  /**
   * Met à jour une conversation
   */
  async updateConversation(conversationId, updateData) {
    try {
      const conversation = await this.prisma.conversation.update({
        where: { id: conversationId },
        data: updateData,
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });
      console.log(`📝 Conversation mise à jour: ${conversation.title}`);
      return conversation;
    } catch (error) {
      console.error('❌ Erreur mise à jour conversation:', error);
      throw error;
    }
  }

  /**
   * Supprime une conversation
   */
  async deleteConversation(conversationId) {
    try {
      await this.prisma.conversation.delete({
        where: { id: conversationId },
      });
      console.log(`🗑️ Conversation supprimée: ${conversationId}`);
    } catch (error) {
      console.error('❌ Erreur suppression conversation:', error);
      throw error;
    }
  }

  // ===============================
  // GESTION DES MESSAGES
  // ===============================

  /**
   * Ajoute un message à une conversation (avec retry)
   */
  async addMessage(conversationId, messageData) {
    return this.executeWithRetry(
      async () => {
        const message = await this.prisma.message.create({
          data: {
            conversationId,
            text: messageData.text,
            isUser: messageData.isUser,
            sources: messageData.sources || null,
            isError: messageData.isError || false,
          },
        });

        // Met à jour la date de modification de la conversation
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        console.log(`💬 Message ajouté à la conversation ${conversationId}`);
        return message;
      },
      'addMessage',
      null
    );
  }

  /**
   * Récupère l'historique des messages d'une conversation pour la mémoire contextuelle
   * @param {number} conversationId - ID de la conversation
   * @param {number} limit - Nombre maximum de messages à récupérer (défaut: 10)
   * @returns {Array} Historique des messages formaté pour le contexte LLM
   */
  async getConversationHistory(conversationId, limit = 10) {
    try {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
          text: true,
          isUser: true,
          timestamp: true,
          sources: true,
          isError: true,
        },
      });

      // Inverser l'ordre pour avoir les messages chronologiquement
      return messages.reverse().map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text,
        timestamp: msg.timestamp,
        sources: msg.sources,
        isError: msg.isError,
      }));
    } catch (error) {
      console.error('❌ Erreur récupération historique conversation:', error);
      return [];
    }
  }

  /**
   * Récupère les conversations récentes d'un utilisateur pour le contexte global
   * @param {number} userId - ID de l'utilisateur
   * @param {number} limit - Nombre de conversations récentes (défaut: 3)
   * @returns {Array} Résumé des conversations récentes
   */
  async getRecentConversationsSummary(userId, limit = 3) {
    try {
      const conversations = await this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
            take: 2, // Premier et dernier message
          },
        },
      });

      return conversations.map(conv => {
        const firstMessage = conv.messages[0];
        const lastMessage = conv.messages[conv.messages.length - 1];
        
        return {
          title: conv.title,
          firstQuestion: firstMessage?.isUser ? firstMessage.text.substring(0, 100) : null,
          lastInteraction: lastMessage?.text.substring(0, 100),
          updatedAt: conv.updatedAt,
          messageCount: conv.messages.length,
        };
      });
    } catch (error) {
      console.error('❌ Erreur récupération résumé conversations:', error);
      return [];
    }
  }

  /**
   * Analyse les patterns de questions de l'utilisateur pour la personnalisation
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} Analyse des patterns d'utilisation
   */
  async analyzeUserPatterns(userId) {
    try {
      const conversations = await this.prisma.conversation.findMany({
        where: { userId },
        include: {
          messages: {
            where: { isUser: true },
            select: { text: true },
          },
        },
        take: 20, // Analyser les 20 dernières conversations
      });

      const allQuestions = conversations.flatMap(conv => 
        conv.messages.map(msg => msg.text.toLowerCase())
      );

      // Extraire des mots-clés fréquents
      const keywords = new Map();
      const odooModules = ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'hr', 'project', 'manufacturing', 'website', 'ecommerce'];
      
      allQuestions.forEach(question => {
        // Analyser les modules Odoo mentionnés
        odooModules.forEach(module => {
          if (question.includes(module)) {
            keywords.set(module, (keywords.get(module) || 0) + 1);
          }
        });
        
        // Analyser les actions fréquentes
        const actions = ['configurer', 'installer', 'créer', 'modifier', 'supprimer', 'exporter', 'importer'];
        actions.forEach(action => {
          if (question.includes(action)) {
            keywords.set(action, (keywords.get(action) || 0) + 1);
          }
        });
      });

      // Trier par fréquence
      const sortedKeywords = Array.from(keywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      return {
        totalQuestions: allQuestions.length,
        topKeywords: sortedKeywords,
        preferredModules: sortedKeywords
          .filter(([keyword]) => odooModules.includes(keyword))
          .map(([keyword]) => keyword),
        questionComplexity: allQuestions.reduce((acc, q) => acc + q.length, 0) / allQuestions.length || 0,
      };
    } catch (error) {
      console.error('❌ Erreur analyse patterns utilisateur:', error);
      return {
        totalQuestions: 0,
        topKeywords: [],
        preferredModules: [],
        questionComplexity: 0,
      };
    }
  }

  // ===============================
  // GESTION DES PARAMÈTRES
  // ===============================

  /**
   * Récupère les paramètres d'un utilisateur
   */
  async getUserSettings(userId) {
    try {
      let settings = await this.prisma.userSettings.findUnique({
        where: { userId },
      });

      // Créer les paramètres par défaut s'ils n'existent pas
      if (!settings) {
        settings = await this.prisma.userSettings.create({
          data: { userId },
        });
      }

      return settings;
    } catch (error) {
      console.error('❌ Erreur récupération paramètres:', error);
      throw error;
    }
  }

  /**
   * Met à jour les paramètres d'un utilisateur
   */
  async updateUserSettings(userId, settingsData) {
    try {
      const settings = await this.prisma.userSettings.upsert({
        where: { userId },
        update: settingsData,
        create: {
          userId,
          ...settingsData,
        },
      });
      console.log(`⚙️ Paramètres mis à jour pour l'utilisateur ${userId}`);
      return settings;
    } catch (error) {
      console.error('❌ Erreur mise à jour paramètres:', error);
      throw error;
    }
  }

  // ===============================
  // STATISTIQUES ET MONITORING
  // ===============================

  /**
   * Récupère les statistiques de l'application
   */
  async getStats() {
    try {
      const [userCount, conversationCount, messageCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.conversation.count(),
        this.prisma.message.count(),
      ]);

      return {
        users: userCount,
        conversations: conversationCount,
        messages: messageCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      throw error;
    }
  }

  /**
   * Vérifie la santé de la base de données
   */
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const userCount = await this.prisma.user.count();
      const conversationCount = await this.prisma.conversation.count();
      const feedbackCount = await this.prisma.feedback.count();
      
      // Détecter le provider de base de données
      const databaseProvider = process.env.DATABASE_URL?.includes('postgresql') ? 'PostgreSQL' : 'SQLite';
      
      return { 
        status: 'healthy', 
        database: databaseProvider, 
        stats: {
          users: userCount,
          conversations: conversationCount,
          feedbacks: feedbackCount
        },
        version: await this.getDatabaseVersion()
      };
    } catch (error) {
      console.error('❌ Erreur health check database:', error);
      return { status: 'error', error: error.message };
    }
  }
  
  /**
   * Récupère la version de la base de données
   */
  async getDatabaseVersion() {
    try {
      if (process.env.DATABASE_URL?.includes('postgresql')) {
        const result = await this.prisma.$queryRaw`SELECT version()`;
        return result[0]?.version?.split(' ')[1] || 'Unknown';
      }
      return 'N/A';
    } catch {
      return 'Unknown';
    }
  }

  // ===============================
  // GESTION DU FEEDBACK ET MÉTRIQUES
  // ===============================

  /**
   * Crée un feedback utilisateur
   * @param {Object} feedbackData - Données du feedback
   * @returns {Promise<Object>} Feedback créé
   */
  async createFeedback(feedbackData) {
    try {
      const feedback = await this.prisma.feedback.create({
        data: {
          messageId: feedbackData.messageId,
          conversationId: feedbackData.conversationId,
          userId: feedbackData.userId,
          rating: feedbackData.rating,
          comment: feedbackData.comment || null,
          feedbackType: feedbackData.feedbackType || 'general',
          suggestions: feedbackData.suggestions || null,
          metadata: feedbackData.metadata || null,
        },
        include: {
          message: true,
          conversation: true,
          user: {
            select: {
              id: true,
              email: true,
              pseudonyme: true
            }
          }
        }
      });

      console.log(`📝 Feedback créé: ${feedback.rating}/5`);
      
      // Enregistrer l'événement analytics
      await this.createAnalyticsEvent({
        eventType: 'feedback_given',
        userId: feedbackData.userId,
        conversationId: feedbackData.conversationId,
        metadata: {
          rating: feedback.rating,
          feedbackType: feedback.feedbackType
        }
      });
      
      return feedback;
    } catch (error) {
      console.error('❌ Erreur création feedback:', error);
      throw error;
    }
  }

  /**
   * Récupère les métriques de performance
   * @param {Date} startDate - Date de début
   * @param {Date} endDate - Date de fin (optionnel)
   * @returns {Promise<Object>} Métriques de performance
   */
  async getPerformanceMetrics(startDate, endDate = new Date()) {
    try {
      const [conversationCount, messageCount] = await Promise.all([
        this.prisma.conversation.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        this.prisma.message.count({
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      ]);

      // Simulation des métriques de feedback (à remplacer par de vraies données)
      const simulatedMetrics = {
        conversationCount,
        messageCount,
        averageRating: 4.2,
        satisfactionRate: 85,
        resolutionRate: Math.round((messageCount > 0 ? 75 : 0)),
        averageResponseTime: 1500,
      };

      return simulatedMetrics;
    } catch (error) {
      console.error('❌ Erreur récupération métriques performance:', error);
      throw error;
    }
  }

  /**
   * Récupère les métriques de feedback
   * @param {Date} startDate - Date de début
   * @returns {Promise<Object>} Métriques de feedback
   */
  async getFeedbackMetrics(startDate) {
    try {
      // Récupérer les vraies données de feedback
      const feedbacks = await this.prisma.feedback.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        include: {
          message: true
        }
      });

      const totalFeedbacks = feedbacks.length;
      
      if (totalFeedbacks === 0) {
        return {
          totalFeedbacks: 0,
          averageRating: 0,
          satisfactionRate: 0,
          ratingDistribution: [],
          topIssues: [],
          suggestions: [],
          popularTopics: []
        };
      }

      // Calculer la moyenne des ratings
      const averageRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks;
      
      // Calculer le taux de satisfaction (ratings >= 4)
      const satisfiedCount = feedbacks.filter(f => f.rating >= 4).length;
      const satisfactionRate = (satisfiedCount / totalFeedbacks) * 100;
      
      // Distribution des ratings
      const ratingCounts = {};
      for (let i = 1; i <= 5; i++) {
        ratingCounts[i] = feedbacks.filter(f => f.rating === i).length;
      }
      
      const ratingDistribution = Object.entries(ratingCounts).map(([rating, count]) => ({
        rating: parseInt(rating),
        count,
        percentage: (count / totalFeedbacks) * 100
      }));
      
      // Analyser les problèmes fréquents dans les commentaires
      const issueKeywords = {};
      feedbacks.forEach(f => {
        if (f.comment && f.rating <= 3) {
          const words = f.comment.toLowerCase().split(' ');
          ['lent', 'compliqué', 'erreur', 'bug', 'problème'].forEach(keyword => {
            if (words.some(w => w.includes(keyword))) {
              issueKeywords[keyword] = (issueKeywords[keyword] || 0) + 1;
            }
          });
        }
      });
      
      const topIssues = Object.entries(issueKeywords)
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Extraire les suggestions
      const suggestions = feedbacks
        .filter(f => f.suggestions)
        .map(f => f.suggestions)
        .flat()
        .slice(0, 5);
      
      // Analyser les sujets populaires
      const topics = {};
      feedbacks.forEach(f => {
        if (f.message?.text) {
          ['congés', 'ventes', 'comptabilité', 'stock', 'crm', 'rh'].forEach(topic => {
            if (f.message.text.toLowerCase().includes(topic)) {
              topics[topic] = (topics[topic] || 0) + 1;
            }
          });
        }
      });
      
      const popularTopics = Object.entries(topics)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([topic]) => topic);

      return {
        totalFeedbacks,
        averageRating: Math.round(averageRating * 10) / 10,
        satisfactionRate: Math.round(satisfactionRate),
        ratingDistribution,
        topIssues,
        suggestions,
        popularTopics
      };
    } catch (error) {
      console.error('❌ Erreur récupération métriques feedback:', error);
      throw error;
    }
  }

  /**
   * Récupère les feedbacks négatifs
   * @param {Date} startDate - Date de début
   * @returns {Promise<Array>} Feedbacks négatifs
   */
  async getNegativeFeedbacks(startDate) {
    try {
      return await this.prisma.feedback.findMany({
        where: {
          createdAt: { gte: startDate },
          rating: { lte: 2 } // Feedbacks avec rating 1 ou 2
        },
        include: {
          message: true,
          user: {
            select: {
              id: true,
              pseudonyme: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('❌ Erreur récupération feedbacks négatifs:', error);
      return [];
    }
  }

  /**
   * Récupère les questions non résolues
   * @param {Date} startDate - Date de début
   * @returns {Promise<Array>} Questions non résolues
   */
  async getUnsolvedQuestions(startDate) {
    try {
      const recentMessages = await this.prisma.message.findMany({
        where: {
          isUser: true,
          timestamp: { gte: startDate },
        },
        include: {
          conversation: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 20,
      });

      // Simulation - marquer certaines questions comme non résolues
      return recentMessages.slice(0, 5).map(msg => ({
        text: msg.text,
        conversationId: msg.conversationId,
        userId: msg.conversation.userId,
        timestamp: msg.timestamp,
        rating: null,
        attempts: 1,
      }));
    } catch (error) {
      console.error('❌ Erreur récupération questions non résolues:', error);
      return [];
    }
  }

  /**
   * Récupère les métriques quotidiennes
   * @param {Date} startDate - Date de début
   * @returns {Promise<Array>} Métriques par jour
   */
  async getDailyMetrics(startDate) {
    try {
      const days = [];
      const currentDate = new Date(startDate);
      const endDate = new Date();

      while (currentDate <= endDate && days.length < 30) {
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const [conversations, messages] = await Promise.all([
          this.prisma.conversation.count({
            where: {
              createdAt: { gte: dayStart, lte: dayEnd },
            },
          }),
          this.prisma.message.count({
            where: {
              timestamp: { gte: dayStart, lte: dayEnd },
            },
          }),
        ]);

        days.push({
          date: dayStart.toISOString().split('T')[0],
          conversations,
          messages,
          feedbacks: Math.floor(Math.random() * 10), // Simulation
          averageRating: 4 + Math.random(), // Simulation
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return days;
    } catch (error) {
      console.error('❌ Erreur récupération métriques quotidiennes:', error);
      return [];
    }
  }

  /**
   * Récupère les questions les plus fréquentes
   * @param {Date} startDate - Date de début
   * @returns {Promise<Array>} Top questions
   */
  async getTopQuestions(startDate) {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          isUser: true,
          timestamp: { gte: startDate },
        },
        select: {
          text: true,
        },
        take: 100,
      });

      // Analyser les questions similaires (simplification)
      const questionGroups = {};
      messages.forEach(msg => {
        const key = msg.text.toLowerCase().substring(0, 30); // Grouper par début de question
        questionGroups[key] = (questionGroups[key] || 0) + 1;
      });

      return Object.entries(questionGroups)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([question, count]) => ({ question: question + '...', count }));
    } catch (error) {
      console.error('❌ Erreur récupération top questions:', error);
      return [];
    }
  }

  /**
   * Analyse le comportement des utilisateurs
   * @param {Date} startDate - Date de début
   * @returns {Promise<Object>} Analyse comportementale
   */
  async getUserBehaviorAnalysis(startDate) {
    try {
      const activeUsers = await this.prisma.user.count({
        where: {
          conversations: {
            some: {
              createdAt: { gte: startDate },
            },
          },
        },
      });

      return {
        activeUsers,
        avgSessionLength: 300, // 5 minutes - simulation
        returnUsers: Math.floor(activeUsers * 0.6), // 60% reviennent - simulation
        engagement: {
          daily: Math.floor(activeUsers * 0.3), // 30% quotidien - simulation
          weekly: Math.floor(activeUsers * 0.7), // 70% hebdomadaire - simulation
        },
      };
    } catch (error) {
      console.error('❌ Erreur analyse comportementale:', error);
      return {
        activeUsers: 0,
        avgSessionLength: 0,
        returnUsers: 0,
        engagement: { daily: 0, weekly: 0 },
      };
    }
  }
  
  // ===============================
  // GESTION DES ANALYTICS
  // ===============================
  
  /**
   * Crée un événement analytics
   * @param {Object} eventData - Données de l'événement
   * @returns {Promise<Object>} Événement créé
   */
  async createAnalyticsEvent(eventData) {
    try {
      return await this.prisma.analytics.create({
        data: {
          eventType: eventData.eventType,
          userId: eventData.userId || null,
          conversationId: eventData.conversationId || null,
          metadata: eventData.metadata || null,
        }
      });
    } catch (error) {
      console.error('❌ Erreur création événement analytics:', error);
      // Ne pas lancer l'erreur pour ne pas bloquer le flux principal
      return null;
    }
  }
  
  /**
   * Crée ou met à jour un snapshot de métriques
   * @param {Date} date - Date du snapshot
   * @returns {Promise<Object>} Snapshot créé ou mis à jour
   */
  async createMetricsSnapshot(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const [totalUsers, activeUsers, totalConversations, totalMessages, feedbackMetrics] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: {
            conversations: {
              some: {
                updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Actif dans les 7 derniers jours
              }
            }
          }
        }),
        this.prisma.conversation.count(),
        this.prisma.message.count(),
        this.getFeedbackMetrics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Métriques des 30 derniers jours
      ]);
      
      // Calculer le taux d'erreur
      const errorEvents = await this.prisma.analytics.count({
        where: {
          eventType: 'error',
          timestamp: { gte: startOfDay }
        }
      });
      
      const totalEvents = await this.prisma.analytics.count({
        where: {
          timestamp: { gte: startOfDay }
        }
      });
      
      const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;
      
      // Top questions du jour
      const topQuestions = await this.getTopQuestions(startOfDay);
      
      return await this.prisma.metricsSnapshot.upsert({
        where: { date: startOfDay },
        update: {
          totalUsers,
          activeUsers,
          totalConversations,
          totalMessages,
          avgResponseTime: 1500, // TODO: Calculer depuis les analytics
          avgRating: feedbackMetrics.averageRating,
          topQuestions,
          errorRate,
          metadata: {
            feedbackMetrics,
            timestamp: new Date()
          }
        },
        create: {
          date: startOfDay,
          totalUsers,
          activeUsers,
          totalConversations,
          totalMessages,
          avgResponseTime: 1500,
          avgRating: feedbackMetrics.averageRating,
          topQuestions,
          errorRate,
          metadata: {
            feedbackMetrics,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur création snapshot métriques:', error);
      throw error;
    }
  }
  
  // ===============================
  // GESTION DES SESSIONS
  // ===============================
  
  /**
   * Crée une nouvelle session
   * @param {Object} sessionData - Données de la session
   * @returns {Promise<Object>} Session créée
   */
  async createSession(sessionData) {
    try {
      // Désactiver les anciennes sessions de l'utilisateur
      await this.prisma.session.updateMany({
        where: {
          userId: sessionData.userId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });
      
      // Créer la nouvelle session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours
      
      return await this.prisma.session.create({
        data: {
          userId: sessionData.userId,
          token: sessionData.token,
          ipAddress: sessionData.ipAddress || null,
          userAgent: sessionData.userAgent || null,
          expiresAt
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              pseudonyme: true,
              isPremium: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur création session:', error);
      throw error;
    }
  }
  
  /**
   * Vérifie et met à jour une session
   * @param {string} token - Token de session
   * @returns {Promise<Object|null>} Session mise à jour ou null si invalide
   */
  async validateSession(token) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { token },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              pseudonyme: true,
              isPremium: true,
              settings: true
            }
          }
        }
      });
      
      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return null;
      }
      
      // Mettre à jour la dernière activité
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastActivity: new Date() }
      });
      
      return session;
    } catch (error) {
      console.error('❌ Erreur validation session:', error);
      return null;
    }
  }
}

module.exports = new DatabaseService();
