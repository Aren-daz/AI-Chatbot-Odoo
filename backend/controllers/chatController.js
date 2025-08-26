/**
 * Contrôleur pour la gestion des conversations avec le chatbot Odoo
 * 
 * Ce contrôleur intègre :
 * - Base de données SQLite avec Prisma pour la persistance
 * - Groq Cloud pour l'IA conversationnelle  
 * - Service de documentation Odoo v17 pour le contexte
 * - Authentification JWT pour sécuriser les conversations
 */

const groqService = require('../services/groqService');
const databaseService = require('../services/databaseService');
const odooDocService = require('../services/odooDocService');

/**
 * Traite un message utilisateur et génère une réponse du chatbot
 * 
 * @param {Object} req - Objet de requête Express
 * @param {Object} res - Objet de réponse Express
 */
async function sendMessage(req, res) {
  const startTime = Date.now();
  
  try {
    const { message, conversationId = null } = req.body;
    const userId = req.user.id; // Récupéré du middleware d'auth
    
    // Validation de la requête
    if (!message) {
      return res.status(400).json({
        error: 'Message manquant',
        message: 'Le champ "message" est requis dans le body de la requête'
      });
    }
    
    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message invalide',
        message: 'Le message doit être une chaîne de caractères non vide'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: 'Message trop long',
        message: 'Le message ne peut pas dépasser 2000 caractères'
      });
    }
    
    console.log(`📩 Question reçue de l'utilisateur ${userId}: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    
    // 1. RÉCUPÉRER OU CRÉER LA CONVERSATION
    let conversation;
    if (conversationId) {
      // Vérifier que la conversation appartient à l'utilisateur
      const conversations = await databaseService.getUserConversations(userId);
      conversation = conversations.find(c => c.id === parseInt(conversationId));
      
      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation non trouvée',
          message: 'La conversation demandée n\'existe pas ou ne vous appartient pas'
        });
      }
    } else {
      // Créer une nouvelle conversation
      const title = message.length > 50 ? message.substring(0, 47) + '...' : message;
      conversation = await databaseService.createConversation(userId, title);
    }

    // 1.1. RÉCUPÉRER LE CONTEXTE CONVERSATIONNEL
    console.log('🧠 Récupération du contexte conversationnel...');
    const conversationHistory = await databaseService.getConversationHistory(conversation.id, 8);
    const recentConversations = await databaseService.getRecentConversationsSummary(userId, 3);
    const userPatterns = await databaseService.analyzeUserPatterns(userId);

    console.log(`📚 Contexte: ${conversationHistory.length} messages précédents, ${userPatterns.preferredModules.length} modules préférés`);

    // Ajouter le message utilisateur à la base de données
    await databaseService.addMessage(conversation.id, {
      text: message,
      isUser: true,
    });
    
    // 2. RECHERCHE AMÉLIORÉE DANS LA DOCUMENTATION ODOO
    console.log('🔍 Recherche améliorée dans la documentation Odoo...');
    let docSearchResult = null;
    let relevantDocs = [];
    let sourcesSummary = [];
    
    try {
      // Utiliser la recherche améliorée avec contexte et synonymes
      docSearchResult = await enhancedDocumentationSearch(message, conversationHistory, userPatterns);
      
      if (Array.isArray(docSearchResult)) {
        // Ancien format: la fonction renvoie directement un tableau de documents
        relevantDocs = docSearchResult;
      } else if (docSearchResult && Array.isArray(docSearchResult.results)) {
        // Nouveau format: { results: [...], sourcesSummary: [...] }
        relevantDocs = docSearchResult.results;
        if (Array.isArray(docSearchResult.sourcesSummary)) {
          sourcesSummary = docSearchResult.sourcesSummary;
        }
      } else {
        console.warn("⚠️ searchDocumentation n'a pas retourné un format attendu:", typeof docSearchResult);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la recherche documentation:', error);
      relevantDocs = [];
    }

    console.log(`🔎 Documents pertinents trouvés: ${relevantDocs.length}`);
    
    // Log des modules préférés pour le debug
    if (userPatterns.preferredModules.length > 0) {
      console.log(`🎯 Modules préférés de l'utilisateur: ${userPatterns.preferredModules.join(', ')}`);
    }
    
    // 3. SYSTÈME DE FALLBACK INTELLIGENT
    let useGeneralKnowledge = false;
    let fallbackReason = '';
    
    if (relevantDocs.length === 0) {
      console.log('⚠️ Aucune documentation spécifique trouvée - Utilisation des connaissances générales');
      
      // Vérifier si la question concerne Odoo d'une manière générale
      const odooKeywords = ['odoo', 'erp', 'crm', 'sales', 'purchase', 'inventory', 'accounting', 'hr', 'project', 'vente', 'achat', 'stock', 'comptabilité', 'paie', 'rh'];
      const isOdooRelated = odooKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      
      // Vérifier si l'utilisateur fait référence au contexte précédent
      const contextualPhrases = ['comme avant', 'précédemment', 'comme on a vu', 'suite', 'continue', 'aussi', 'en plus'];
      const isContextual = contextualPhrases.some(phrase => 
        message.toLowerCase().includes(phrase)
      ) && conversationHistory.length > 1;
      
      // Utiliser les connaissances générales si la question concerne Odoo ou est contextuelle
      if (isOdooRelated || isContextual || userPatterns.totalQuestions > 5) {
        useGeneralKnowledge = true;
        fallbackReason = isContextual 
          ? 'Réponse basée sur le contexte conversationnel'
          : 'Réponse basée sur les connaissances générales d\'Odoo';
        console.log('✅ Fallback activé: Utilisation des connaissances générales d\'Odoo');
      } else {
        // Seulement rejeter si vraiment pas lié à Odoo
        const responseTime = Date.now() - startTime;
        
        const friendlyResponse = buildRejectionResponse(userPatterns, conversationHistory);

        // Ajouter la réponse de rejet à la base de données
        await databaseService.addMessage(conversation.id, {
          text: friendlyResponse,
          isUser: false,
          isError: false,
        });

        return res.json({
          success: true,
          message: friendlyResponse,
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
          responseTime: responseTime,
          sources: [],
          contextUsed: false,
          rejected: true,
          reason: 'Question non liée à Odoo selon l\'analyse contextuelle'
        });
      }
    }
    
    if (!useGeneralKnowledge) {
      console.log(`✅ ${relevantDocs.length} documents pertinents trouvés - Recherche réussie`);
    }
    
    // 4. CONSTRUCTION DU CONTEXTE
    const context = relevantDocs.length > 0 
      ? relevantDocs.map(doc => `${doc.title || 'Titre non disponible'}\n${doc.excerpt || 'Contenu non disponible'}`).join('\n\n')
      : ''; // Contexte vide si utilisation des connaissances générales
    
    // 5. GÉNÉRATION DE LA RÉPONSE AVEC MÉMOIRE CONVERSATIONNELLE
    const systemPrompt = buildEnhancedSystemPrompt(userPatterns, conversationHistory, recentConversations);
    const userPrompt = buildContextualUserPrompt(message, context, conversationHistory, userPatterns);

    // Options avancées pour la génération
    const advancedOptions = {
      enableSelfCorrection: relevantDocs.length > 0 || userPatterns.totalQuestions > 5, // Auto-correction pour utilisateurs expérimentés
      useChainOfThought: true,
      fewShotExamples: true
    };

    const reply = await groqService.generateResponse(userPrompt, systemPrompt, advancedOptions);
    
    const responseTime = Date.now() - startTime;
    
    // Analyser la qualité de la réponse
    const qualityMetrics = groqService.analyzeResponseQuality(reply, message);
    
    console.log(`✅ Réponse générée en ${responseTime}ms - Qualité: ${Math.round(qualityMetrics.readabilityScore)}%`);
    
    // Ajouter la réponse du bot à la base de données
    await databaseService.addMessage(conversation.id, {
      text: reply,
      isUser: false,
      sources: relevantDocs.map(doc => ({
        title: doc.title || 'Titre non disponible',
        filePath: doc.filePath || '',
        section: doc.section || '',
        subsection: doc.subsection || '',
        excerpt: doc.excerpt || 'Contenu non disponible'
      })),
      isError: false,
    });
    
    // 6. Enrichir la réponse avec des métadonnées améliorées
    const response = {
      success: true,
      message: reply,
      conversationId: conversation.id,
      timestamp: new Date().toISOString(),
      responseTime: responseTime,
      sources: relevantDocs.map(doc => ({
        title: doc.title || 'Titre non disponible',
        filePath: doc.filePath || '',
        section: doc.section || '',
        subsection: doc.subsection || '',
        excerpt: doc.excerpt || 'Contenu non disponible'
      })),
      contextUsed: relevantDocs.length > 0,
      memoryUsed: conversationHistory.length > 1,
      fallbackUsed: useGeneralKnowledge,
      fallbackReason: fallbackReason,
      rejected: false,
      userContext: {
        preferredModules: userPatterns.preferredModules,
        totalQuestions: userPatterns.totalQuestions,
        conversationLength: conversationHistory.length
      },
      qualityMetrics: qualityMetrics,
      advancedFeatures: {
        selfCorrectionUsed: advancedOptions.enableSelfCorrection,
        chainOfThoughtUsed: advancedOptions.useChainOfThought,
        fewShotExamplesUsed: advancedOptions.fewShotExamples
      }
    };

    // Ajouter les informations de debug en développement
    if (process.env.NODE_ENV === 'development') {
      response.debug = {
        searchTerms: message.toLowerCase().split(' ').slice(0, 5),
        documentsFound: relevantDocs.length,
        contextLength: context.length,
        processingSteps: [
          'Validation sujet Odoo',
          'Recherche documentation GitHub',
          'Vérification sources',
          'Construction contexte',
          'Génération IA avec personnalité Adam',
          'Formatage réponse Markdown'
        ]
      };
    }
    
    res.json(response);
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('❌ Erreur lors du traitement du message:', error);
    
    // Réponse d'erreur avec la personnalité d'Adam
    const errorResponse = `Désolé, j'ai rencontré une difficulté technique. 😔

**Ce qui s'est passé :**
• Une erreur s'est produite lors du traitement de votre question
• Je n'ai pas pu accéder à la documentation Odoo

**Ce que vous pouvez faire :**
• Reformulez votre question différemment
• Vérifiez votre connexion internet
• Contactez l'équipe technique si le problème persiste

Je reste à votre disposition pour vous aider avec Odoo ! 🚀

*Erreur technique : ${error.message}*`;

    res.status(500).json({
      error: 'Erreur interne du serveur',
      message: errorResponse,
      timestamp: new Date().toISOString(),
      responseTime: responseTime,
      sources: [],
      contextUsed: false,
      model: 'groq-llama3-70b',
      messageLength: 0,
      rejected: true,
      reason: 'Erreur technique'
    });
  }
}

/**
 * Récupère toutes les conversations d'un utilisateur
 */
async function getConversations(req, res) {
  try {
    const userId = req.user.id;
    const conversations = await databaseService.getUserConversations(userId);

    // Formatter les conversations pour le frontend
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      messages: conv.messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        isUser: msg.isUser,
        timestamp: msg.timestamp,
        sources: msg.sources || [],
        isError: msg.isError || false,
      })),
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error('❌ Erreur récupération conversations:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de récupérer les conversations',
    });
  }
}

/**
 * Met à jour une conversation (titre, etc.)
 */
async function updateConversation(req, res) {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    // Vérifier que la conversation appartient à l'utilisateur
    const conversations = await databaseService.getUserConversations(userId);
    const conversation = conversations.find(c => c.id === parseInt(conversationId));
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation non trouvée',
        message: 'La conversation demandée n\'existe pas ou ne vous appartient pas'
      });
    }

    // Mettre à jour la conversation
    const updatedConversation = await databaseService.updateConversation(
      parseInt(conversationId),
      { title }
    );

    return res.status(200).json({
      success: true,
      conversation: {
        id: updatedConversation.id,
        title: updatedConversation.title,
        messages: updatedConversation.messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          isUser: msg.isUser,
          timestamp: msg.timestamp,
          sources: msg.sources || [],
          isError: msg.isError || false,
        })),
        updatedAt: updatedConversation.updatedAt,
      },
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour conversation:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de mettre à jour la conversation',
    });
  }
}

/**
 * Supprime une conversation
 */
async function deleteConversation(req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Vérifier que la conversation appartient à l'utilisateur
    const conversations = await databaseService.getUserConversations(userId);
    const conversation = conversations.find(c => c.id === parseInt(conversationId));
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation non trouvée',
        message: 'La conversation demandée n\'existe pas ou ne vous appartient pas'
      });
    }

    // Supprimer la conversation
    await databaseService.deleteConversation(parseInt(conversationId));

    return res.status(200).json({
      success: true,
      message: 'Conversation supprimée avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur suppression conversation:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: 'Impossible de supprimer la conversation',
    });
  }
}

/**
 * Vérifie le statut de l'API
 */
async function getHealthStatus(req, res) {
  try {
    const uptime = process.uptime();
    const groqStatus = await groqService.checkHealth();
    const dbStatus = await databaseService.healthCheck();
    
    res.json({
      success: true,
      status: 'healthy',
      service: 'Odoo Chatbot API - Adam Expert',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      version: '2.0.0',
      developer: 'Adam - Schwing Stetter Algérie',
      services: {
        groq: groqStatus,
        database: dbStatus,
      },
      features: [
        'Authentification JWT sécurisée',
        'Base de données SQLite persistante',
        'Chat intelligent avec personnalité Adam',
        'Documentation Odoo v17 intégrée',
        'Formatage Markdown avancé',
        'Gestion complète des conversations'
      ]
    });
  } catch (error) {
    console.error('❌ Erreur health check:', error);
    
    return res.status(500).json({
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Construit une réponse de rejet personnalisée et contextuelle
 * @param {Object} userPatterns - Patterns d'utilisation de l'utilisateur
 * @param {Array} conversationHistory - Historique de la conversation
 * @returns {string} Réponse de rejet personnalisée
 */
function buildRejectionResponse(userPatterns, conversationHistory) {
  let response = `Bonjour ! Je suis **Adam**, votre expert Odoo chez **Schwing Stetter Algérie**. 🚀\n\n`;
  
  // Personnaliser selon l'historique
  if (userPatterns.totalQuestions > 0) {
    response += `Je vois que nous avons déjà discuté de sujets Odoo ensemble. `;
    
    if (userPatterns.preferredModules.length > 0) {
      response += `Vous semblez particulièrement intéressé(e) par : **${userPatterns.preferredModules.join(', ')}**.\n\n`;
    }
  }
  
  response += `Je suis spécialisé dans **Odoo v17** et je peux vous aider avec :\n\n`;
  response += `• **Modules Odoo** : CRM, Comptabilité, Ventes, Achats, Stock, RH, Projets, etc.\n`;
  response += `• **Développement** : API, ORM, Vues, Templates, Extensions personnalisées\n`;
  response += `• **Administration** : Installation, Configuration, Maintenance\n`;
  response += `• **Utilisation** : Workflows, Rapports, Intégrations, Bonnes pratiques\n\n`;
  
  // Suggestions personnalisées
  if (userPatterns.preferredModules.length > 0) {
    response += `**Suggestions basées sur vos intérêts :**\n`;
    userPatterns.preferredModules.forEach(module => {
      switch(module) {
        case 'crm':
          response += `• Comment optimiser votre processus commercial dans le CRM ?\n`;
          break;
        case 'hr':
        case 'rh':
          response += `• Configuration des congés et gestion RH avancée ?\n`;
          break;
        case 'sales':
          response += `• Automatisation des ventes et devis intelligents ?\n`;
          break;
        case 'project':
          response += `• Gestion de projets et suivi des tâches efficace ?\n`;
          break;
        default:
          response += `• Questions avancées sur le module ${module} ?\n`;
      }
    });
    response += `\n`;
  }
  
  response += `Votre question actuelle ne semble pas directement liée à Odoo. Pourriez-vous la reformuler pour que je puisse vous aider au mieux ?\n\n`;
  response += `**Exemples de questions que je peux traiter :**\n`;
  response += `• "Comment configurer les congés dans Odoo ?"\n`;
  response += `• "Création d'un module personnalisé"\n`;
  response += `• "Intégration de l'API Odoo"\n`;
  response += `• "Optimisation des performances"\n\n`;
  response += `Je reste à votre entière disposition ! 🚀`;
  
  return response;
}

/**
 * Construit un prompt système amélioré avec personnalisation et mémoire
 * @param {Object} userPatterns - Patterns d'utilisation de l'utilisateur
 * @param {Array} conversationHistory - Historique de la conversation
 * @param {Array} recentConversations - Résumé des conversations récentes
 * @returns {string} Prompt système personnalisé
 */
function buildEnhancedSystemPrompt(userPatterns, conversationHistory, recentConversations) {
  let systemPrompt = `Tu es **Adam**, l'expert Odoo chez **Schwing Stetter Algérie**.

**Ta personnalité :**
- Tu es confiant dans tes connaissances car elles proviennent de la documentation officielle Odoo
- Tu es toujours prêt à aider et tu proposes ton aide à chaque fois
- Tu es professionnel mais chaleureux
- Tu utilises le formatage Markdown pour structurer tes réponses
- Tu donnes des exemples concrets quand c'est possible
- **IMPORTANT**: Tu as une mémoire des conversations précédentes et tu peux faire référence au contexte

**Tes réponses doivent :**
- Être claires et structurées avec des titres, listes et exemples
- Utiliser le formatage Markdown (gras, italique, listes, code)
- Citer tes sources quand c'est possible
- **Tenir compte du contexte conversationnel** pour éviter les répétitions
- **Référencer les échanges précédents** quand c'est pertinent
- Proposer ton aide pour d'autres questions
- Rester focalisé sur Odoo v17`;

  // Personnalisation basée sur les patterns utilisateur
  if (userPatterns.preferredModules.length > 0) {
    systemPrompt += `\n\n**Contexte utilisateur :**\n- Modules Odoo fréquemment utilisés : ${userPatterns.preferredModules.join(', ')}`;
    systemPrompt += `\n- Nombre total de questions précédentes : ${userPatterns.totalQuestions}`;
    
    if (userPatterns.topKeywords.length > 0) {
      const topKeywords = userPatterns.topKeywords.slice(0, 5).map(([keyword]) => keyword).join(', ');
      systemPrompt += `\n- Sujets fréquents : ${topKeywords}`;
    }
  }

  // Contexte des conversations récentes
  if (recentConversations.length > 0) {
    systemPrompt += `\n\n**Conversations récentes de l'utilisateur :**`;
    recentConversations.forEach((conv, index) => {
      if (conv.firstQuestion) {
        systemPrompt += `\n- ${conv.title}: "${conv.firstQuestion.substring(0, 60)}..."`;
      }
    });
  }

  systemPrompt += `\n\n**Consignes spéciales :**
- Si l'utilisateur fait référence à "comme on a vu avant" ou à des éléments antérieurs, utilise l'historique conversationnel
- Évite de répéter des informations déjà expliquées dans la conversation
- Si l'utilisateur pose une question de suivi, construis ta réponse en t'appuyant sur le contexte
- Utilise des phrases comme "Comme nous avons vu précédemment" ou "Pour continuer sur ce sujet" quand approprié
- Réponds UNIQUEMENT sur la base de la documentation fournie, mais utilise le contexte pour personnaliser ta réponse`;

  return systemPrompt;
}

/**
 * Construit un prompt utilisateur contextuel avec mémoire
 * @param {string} message - Message actuel de l'utilisateur
 * @param {string} context - Contexte de la documentation
 * @param {Array} conversationHistory - Historique de la conversation
 * @param {Object} userPatterns - Patterns d'utilisation
 * @returns {string} Prompt utilisateur enrichi
 */
function buildContextualUserPrompt(message, context, conversationHistory, userPatterns) {
  let userPrompt = '';

  // Ajouter l'historique conversationnel si présent
  if (conversationHistory.length > 1) { // Plus d'un message (le message actuel)
    userPrompt += `**Historique de la conversation actuelle :**\n`;
    
    // Prendre les derniers messages (exclure le message actuel qui vient d'être ajouté)
    const previousMessages = conversationHistory.slice(-6, -1); // 5 derniers messages
    
    previousMessages.forEach(msg => {
      const role = msg.role === 'user' ? 'Utilisateur' : 'Adam';
      const preview = msg.content.substring(0, 150) + (msg.content.length > 150 ? '...' : '');
      userPrompt += `- **${role}** : ${preview}\n`;
    });
    
    userPrompt += `\n---\n\n`;
  }

  // Ajouter le contexte de documentation
  if (context && context.trim()) {
    userPrompt += `**Documentation Odoo v17 pertinente :**\n\n${context}\n\n---\n\n`;
  }

  // Question actuelle
  userPrompt += `**Question actuelle :**\n${message}\n\n`;
  
  // Instructions contextuelles
  if (conversationHistory.length > 1) {
    userPrompt += `**Instructions :**\nRéponds en tant qu'Adam en tenant compte de l'historique de notre conversation. `;
    userPrompt += `Si cette question fait référence à des éléments mentionnés précédemment, utilise ce contexte pour donner une réponse plus précise et personnalisée. `;
    userPrompt += `Évite de répéter des informations déjà expliquées sauf si une clarification est demandée.`;
  } else {
    userPrompt += `**Instructions :**\nRéponds en tant qu'Adam, l'expert Odoo de Schwing Stetter Algérie, avec une personnalité chaleureuse et professionnelle.`;
  }

  if (context && context.trim()) {
    userPrompt += ` Utilise la documentation fournie ci-dessus pour répondre de manière précise.`;
  } else {
    userPrompt += ` Bien qu'aucune documentation spécifique ne soit fournie, utilise tes connaissances générales d'Odoo v17 tout en étant clair sur les limites.`;
  }

  userPrompt += ` Utilise le formatage Markdown pour structurer ta réponse.`;

  return userPrompt;
}

/**
 * Améliore la recherche dans la documentation avec des synonymes et contexte
 * @param {string} query - Requête de recherche
 * @param {Array} conversationHistory - Historique pour le contexte
 * @param {Object} userPatterns - Patterns utilisateur
 * @returns {Promise<Object>} Résultats de recherche améliorés
 */
async function enhancedDocumentationSearch(query, conversationHistory, userPatterns) {
  // Synonymes et termes liés pour améliorer la recherche
  const synonymMap = {
    'congé': ['leave', 'vacation', 'time off', 'absence', 'timesheet', 'hr'],
    'projet': ['project', 'task', 'tache', 'planning'],
    'vente': ['sales', 'sell', 'customer', 'client'],
    'achat': ['purchase', 'vendor', 'supplier', 'fournisseur'],
    'stock': ['inventory', 'warehouse', 'location'],
    'comptabilité': ['accounting', 'finance', 'invoice', 'facture'],
    'paie': ['payroll', 'salary', 'salaire', 'hr'],
    'utilisateur': ['user', 'employee', 'employé'],
    'configuration': ['config', 'setup', 'paramètre', 'setting'],
    'rapport': ['report', 'reporting', 'dashboard'],
  };

  // Enrichir la requête avec des synonymes
  let enrichedQuery = query;
  for (const [french, synonyms] of Object.entries(synonymMap)) {
    if (query.toLowerCase().includes(french)) {
      enrichedQuery += ' ' + synonyms.join(' ');
    }
  }

  // Ajouter le contexte des modules préférés
  if (userPatterns.preferredModules.length > 0) {
    enrichedQuery += ' ' + userPatterns.preferredModules.join(' ');
  }

  // Extraire des mots-clés de l'historique conversationnel
  if (conversationHistory.length > 1) {
    const recentQuestions = conversationHistory
      .filter(msg => msg.role === 'user')
      .slice(-3)
      .map(msg => msg.content)
      .join(' ');
    
    // Extraire des mots-clés techniques d'Odoo de l'historique
    const odooKeywords = recentQuestions.match(/\b(module|model|view|field|record|wizard|report|dashboard|workflow|api|orm)\b/gi);
    if (odooKeywords) {
      enrichedQuery += ' ' + odooKeywords.join(' ');
    }
  }

  console.log(`🔍 Recherche enrichie: "${query}" -> "${enrichedQuery}"`);
  
  return await odooDocService.searchDocumentation(enrichedQuery);
}

module.exports = {
  sendMessage,
  getConversations,
  updateConversation,
  deleteConversation,
  getHealthStatus,
  buildEnhancedSystemPrompt,
  buildContextualUserPrompt,
  enhancedDocumentationSearch,
  buildRejectionResponse
};