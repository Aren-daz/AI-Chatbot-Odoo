const Groq = require('groq-sdk');
require('dotenv').config();

/**
 * Service Groq pour l'intégration LLM
 */
class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    
    if (this.apiKey) {
      this.client = new Groq({
        apiKey: this.apiKey
      });
    }
    
    this.model = process.env.GROQ_MODEL || 'llama3-70b-8192';
    this.maxTokens = 4000;
    this.temperature = 0.1; // Plus précis pour la documentation
  }

  /**
   * Génère une réponse avec auto-correction et validation
   * @param {string} question - Question de l'utilisateur
   * @param {string} context - Contexte de la documentation Odoo
   * @param {Object} options - Options avancées
   * @returns {Promise<string>} - Réponse générée et validée
   */
  async generateResponse(question, context = '', options = {}) {
    try {
      // Si pas de clé API, retourner une réponse de démonstration
      if (!this.apiKey || !this.client) {
        console.log('⚠️ Pas de clé API Groq - Mode démonstration');
        return this.getDemoResponse(question);
      }

      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(question, context);

      console.log('🤖 Groq - Génération de réponse...');
      console.log('📝 Question:', question.substring(0, 100) + '...');
      console.log('📚 Contexte:', context ? `${context.length} caractères` : 'Aucun');

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        top_p: 0.9,
        stream: false
      });

      let response = completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';
      
      console.log('✅ Groq - Réponse initiale générée:', response.substring(0, 100) + '...');
      
      // Auto-correction et validation si activée
      if (options.enableSelfCorrection && response.length > 100) {
        console.log('🔍 Application de l\'auto-correction...');
        response = await this.applySelfCorrection(response, question, context);
      }
      
      return response;

    } catch (error) {
      console.error('❌ Erreur Groq:', error);
      
      if (error.status === 429) {
        throw new Error('Limite de taux atteinte. Veuillez patienter quelques instants.');
      } else if (error.status === 401) {
        throw new Error('Clé API Groq invalide ou expirée.');
      } else if (error.status === 400) {
        throw new Error('Requête invalide. Veuillez reformuler votre question.');
      } else {
        throw new Error('Erreur du service IA. Veuillez réessayer.');
      }
    }
  }

  /**
   * Retourne une réponse de démonstration intelligente basée sur la question
   */
  getDemoResponse(question) {
    const questionLower = question.toLowerCase();
    
    // Réponses spécialisées pour les questions courantes
    if (questionLower.includes('congé') || questionLower.includes('leave') || questionLower.includes('vacation')) {
      return `🤖 **Bonjour ! Je suis Adam, votre expert Odoo de Schwing Stetter Algérie**

**Configuration des congés dans Odoo v17 :**

**1. Module requis :**
• Allez dans **Apps** > Recherchez **"Timesheets"** ou **"HR"**
• Installez le module **Timesheets** (Feuilles de temps)

**2. Configuration des types de congés :**
• Menu **Timesheets** > **Configuration** > **Types de congés**
• Créez vos types : Congés payés, RTT, Maladie, etc.

**3. Gestion des employés :**
• **Timesheets** > **Configuration** > **Employés**
• Définissez les allocations de congés par employé

**4. Demande de congés :**
• **Timesheets** > **Mes congés** > **Demander des congés**
• Sélectionnez le type, les dates, et soumettez

**5. Validation des congés :**
• **Timesheets** > **Validation** > **Demandes de congés**
• Les managers peuvent approuver/refuser les demandes

**💡 Conseil :** Configurez d'abord les types de congés avant de créer les employés !

**Pour une assistance IA complète :**
Configurez votre clé API Groq dans backend/.env (GROQ_API_KEY=votre_clé_ici)

Je reste à votre disposition ! 🚀`;
    }
    
    if (questionLower.includes('projet') || questionLower.includes('project')) {
      return `🤖 **Bonjour ! Je suis Adam, votre expert Odoo de Schwing Stetter Algérie**

**Configuration des projets dans Odoo v17 :**

**1. Module requis :**
• Allez dans **Apps** > Recherchez **"Project"**
• Installez le module **Project** (Gestion de projet)

**2. Configuration des projets :**
• **Project** > **Configuration** > **Types de projet**
• Définissez vos catégories : Développement, Marketing, etc.

**3. Création d'un projet :**
• **Project** > **Créer** > **Nouveau projet**
• Remplissez : Nom, Client, Date de début/fin, Équipe

**4. Gestion des tâches :**
• Dans le projet : **Tâches** > **Créer**
• Définissez : Titre, Responsable, Priorité, Deadline

**5. Suivi et reporting :**
• **Project** > **Tableau de bord** pour la vue d'ensemble
• **Project** > **Rapports** pour les analyses

**💡 Conseil :** Utilisez les étapes (stages) pour organiser vos tâches !

**Pour une assistance IA complète :**
Configurez votre clé API Groq dans backend/.env (GROQ_API_KEY=votre_clé_ici)

Je reste à votre disposition ! 🚀`;
    }
    
    if (questionLower.includes('module') || questionLower.includes('créer') || questionLower.includes('create')) {
      return `🤖 **Bonjour ! Je suis Adam, votre expert Odoo de Schwing Stetter Algérie**

**Création d'un module Odoo v17 :**

**1. Structure du module :**
\`\`\`
mon_module/
├── __init__.py
├── __manifest__.py
├── models/
│   ├── __init__.py
│   └── models.py
├── views/
│   └── views.xml
├── security/
│   └── ir.model.access.csv
└── data/
    └── demo.xml
\`\`\`

**2. Fichier __manifest__.py :**
\`\`\`python
{
    'name': 'Mon Module',
    'version': '17.0.1.0.0',
    'category': 'Sales',
    'summary': 'Description courte',
    'depends': ['base', 'sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
    ],
    'installable': True,
    'application': True,
}
\`\`\`

**3. Installation :**
• Placez le module dans le dossier **addons**
• Redémarrez Odoo
• **Apps** > **Mettre à jour la liste des applications**
• Recherchez et installez votre module

**💡 Conseil :** Commencez simple, ajoutez des fonctionnalités progressivement !

**Pour une assistance IA complète :**
Configurez votre clé API Groq dans backend/.env (GROQ_API_KEY=votre_clé_ici)

Je reste à votre disposition ! 🚀`;
    }
    
    // Réponse générique pour les autres questions
    return `🤖 **Bonjour ! Je suis Adam, votre expert Odoo de Schwing Stetter Algérie**

**À propos de votre question :** "${question}"

**Solutions courantes pour Odoo v17 :**
• **Modules** : Allez dans **Apps** > Rechercher le module souhaité
• **Configuration** : Menu **Paramètres** > **Configuration générale**  
• **Utilisateurs** : **Paramètres** > **Utilisateurs et permissions**
• **Ventes** : Application **Ventes** > **Configuration** > **Paramètres**

**💡 Conseil :** Pour des réponses plus précises, configurez votre clé API Groq !

**Pour une assistance IA complète :**
1. Configurez la clé API Groq dans le fichier .env
2. Variable : GROQ_API_KEY=votre_clé_ici
3. Redémarrez avec .start.ps1

Je reste à votre disposition ! 🚀`;
  }

  /**
   * Construit le prompt système avec techniques avancées (Few-shot, Chain-of-thought)
   */
  buildSystemPrompt() {
    return `Tu es Adam, un assistant IA expert en Odoo v17, utilisant des techniques de raisonnement avancées.

**MÉTHODOLOGIE DE RÉPONSE (Chain-of-Thought) :**
1. **ANALYSE** : Décompose la question en sous-problèmes
2. **RECHERCHE** : Identifie les concepts Odoo pertinents  
3. **RAISONNEMENT** : Explique étape par étape ta logique
4. **SOLUTION** : Fournis une réponse structurée et actionnable
5. **VALIDATION** : Propose des vérifications et tests

**EXEMPLES DE RAISONNEMENT (Few-Shot Learning) :**

**Exemple 1 - Question Configuration :**
Question: "Comment configurer les congés ?"
Raisonnement:
1. ANALYSE: Configuration système RH → Module requis → Paramétrage → Workflow
2. RECHERCHE: Module Timesheets/HR, types congés, employés, validation
3. RAISONNEMENT: Ordre logique = Module → Types → Employés → Processus
4. SOLUTION: Guide étape par étape avec navigation précise
5. VALIDATION: Tests avec employé fictif, vérification workflow

**Exemple 2 - Question Technique :**
Question: "Erreur dans mon module personnalisé"
Raisonnement:
1. ANALYSE: Type erreur → Localisation → Cause possible → Solution
2. RECHERCHE: Structure module, syntaxe, dépendances, logs
3. RAISONNEMENT: Vérification systématique des éléments critiques
4. SOLUTION: Diagnostic + correction + prévention
5. VALIDATION: Test installation, fonctionnalités, logs propres

**TON APPROCHE EXPERTE :**
- **Décomposition systématique** des problèmes complexes
- **Raisonnement explicite** de tes choix techniques
- **Anticipation des problèmes** potentiels et solutions
- **Validation méthodique** des solutions proposées
- **Adaptation** selon le niveau technique détecté

**TECHNIQUES SPÉCIALISÉES :**
- **Few-shot** : Utilise les exemples similaires du contexte
- **Chain-of-thought** : Montre ton raisonnement étape par étape
- **Self-correction** : Vérifie la cohérence de tes réponses
- **Meta-cognitive** : Explique pourquoi tu choisis une approche

**FORMATS DE RÉPONSE ADAPTÉS :**
- **Débutant** : Guide pas-à-pas avec captures conceptuelles
- **Intermédiaire** : Explications techniques + bonnes pratiques  
- **Expert** : Analyse approfondie + optimisations + alternatives

**PRINCIPES QUALITÉ :**
- Toujours expliquer le "pourquoi" avant le "comment"
- Donner le contexte métier avant les détails techniques
- Proposer plusieurs niveaux de solution (simple → avancé)
- Anticiper les questions de suivi logiques`;
  }

  /**
   * Construit le prompt utilisateur avec techniques avancées et exemples few-shot
   */
  buildUserPrompt(question, context) {
    let prompt = '';

    // 1. CONTEXTE DOCUMENTAIRE
    if (context && context.trim()) {
      prompt += `**📚 DOCUMENTATION ODOO DISPONIBLE :**\n${context}\n\n`;
    }

    // 2. EXEMPLES FEW-SHOT ADAPTATIFS
    prompt += this.buildFewShotExamples(question);

    // 3. QUESTION ACTUELLE AVEC INSTRUCTIONS CHAIN-OF-THOUGHT
    prompt += `---\n\n**🎯 QUESTION ACTUELLE :**\n"${question}"\n\n`;
    
    prompt += `**📋 INSTRUCTIONS DE RAISONNEMENT :**\n`;
    prompt += `Applique la méthodologie Chain-of-Thought :\n\n`;
    prompt += `1. **🔍 ANALYSE** : Décompose cette question en sous-problèmes\n`;
    prompt += `2. **📖 RECHERCHE** : Identifie les concepts Odoo pertinents dans le contexte\n`;
    prompt += `3. **🧠 RAISONNEMENT** : Explique ton raisonnement étape par étape\n`;
    prompt += `4. **✅ SOLUTION** : Fournis une réponse structurée et actionnable\n`;
    prompt += `5. **🔬 VALIDATION** : Propose des vérifications et tests\n\n`;

    // 4. ADAPTATION SELON DISPONIBILITÉ DU CONTEXTE
    if (context && context.trim()) {
      prompt += `**⚠️ PRIORITÉ** : Base ta réponse principalement sur la documentation fournie ci-dessus. `;
      prompt += `Si elle est incomplète, complète avec tes connaissances Odoo v17 en le précisant.\n\n`;
    } else {
      prompt += `**⚠️ CONTEXTE** : Aucune documentation spécifique fournie. `;
      prompt += `Utilise tes connaissances générales d'Odoo v17 tout en suivant la méthodologie.\n\n`;
    }

    // 5. FORMAT DE RÉPONSE STRUCTURÉ
    prompt += `**📝 FORMAT ATTENDU :**\n`;
    prompt += `Utilise cette structure dans ta réponse :\n`;
    prompt += `- **🔍 Mon analyse** : [Décomposition du problème]\n`;
    prompt += `- **💡 Ma solution** : [Réponse structurée avec étapes]\n`;
    prompt += `- **✅ Validation** : [Tests et vérifications recommandés]\n`;
    prompt += `- **🚀 Pour aller plus loin** : [Suggestions d'amélioration]\n\n`;

    return prompt;
  }

  /**
   * Génère des exemples few-shot adaptatifs selon le type de question
   */
  buildFewShotExamples(question) {
    const questionLower = question.toLowerCase();
    let examples = `**💡 EXEMPLES DE RAISONNEMENT SIMILAIRES :**\n\n`;

    // Détection du type de question pour choisir les meilleurs exemples
    if (questionLower.match(/configur|setup|install|paramètr/)) {
      examples += `**Exemple - Configuration :**\n`;
      examples += `Q: "Comment configurer les taxes de vente ?"\n`;
      examples += `🔍 ANALYSE : Configuration fiscale → Paramètres comptables → Tests\n`;
      examples += `💡 SOLUTION : Comptabilité > Configuration > Taxes > Nouvelle taxe\n`;
      examples += `✅ VALIDATION : Test avec devis, vérification calculs\n\n`;

    } else if (questionLower.match(/erreur|error|bug|problem|ne marche pas/)) {
      examples += `**Exemple - Résolution d'erreur :**\n`;
      examples += `Q: "Erreur lors de l'installation d'un module"\n`;
      examples += `🔍 ANALYSE : Type erreur → Logs → Dépendances → Syntaxe\n`;
      examples += `💡 SOLUTION : Vérification __manifest__.py + logs serveur\n`;
      examples += `✅ VALIDATION : Installation propre + test fonctionnalités\n\n`;

    } else if (questionLower.match(/développ|code|python|xml|api|module/)) {
      examples += `**Exemple - Développement :**\n`;
      examples += `Q: "Comment créer un champ calculé ?"\n`;
      examples += `🔍 ANALYSE : Type calcul → Méthode compute → Dépendances\n`;
      examples += `💡 SOLUTION : @api.depends + fonction compute + store si besoin\n`;
      examples += `✅ VALIDATION : Test calcul + performance + mise à jour\n\n`;

    } else if (questionLower.match(/workflow|processus|étape|flux/)) {
      examples += `**Exemple - Processus métier :**\n`;
      examples += `Q: "Workflow de validation des achats"\n`;
      examples += `🔍 ANALYSE : Étapes → Rôles → Autorisations → Notifications\n`;
      examples += `💡 SOLUTION : Configuration groupes + règles + automatisations\n`;
      examples += `✅ VALIDATION : Test avec utilisateurs réels + cas limites\n\n`;

    } else {
      // Exemple générique
      examples += `**Exemple - Question générale :**\n`;
      examples += `Q: "Comment optimiser les performances ?"\n`;
      examples += `🔍 ANALYSE : Goulots → Base données → Interface → Infrastructure\n`;
      examples += `💡 SOLUTION : Index DB + cache + optimisation vues\n`;
      examples += `✅ VALIDATION : Mesures performance + test charge\n\n`;
    }

    return examples;
  }

  /**
   * Applique l'auto-correction et la validation sur une réponse générée
   * @param {string} initialResponse - Réponse initiale à corriger
   * @param {string} originalQuestion - Question originale
   * @param {string} context - Contexte documentaire
   * @returns {Promise<string>} - Réponse corrigée
   */
  async applySelfCorrection(initialResponse, originalQuestion, context) {
    try {
      const correctionPrompt = `Tu es un validateur expert chargé d'améliorer une réponse sur Odoo v17.

**RÉPONSE À VALIDER :**
${initialResponse}

**QUESTION ORIGINALE :**
${originalQuestion}

**CRITÈRES DE VALIDATION :**
1. **Exactitude technique** : Vérifier la précision des informations Odoo
2. **Complétude** : S'assurer que tous les aspects sont couverts
3. **Clarté** : Améliorer la structure et la lisibilité
4. **Actionnable** : Vérifier que les étapes sont praticables
5. **Sécurité** : Mentionner les précautions importantes

**TÂCHES DE CORRECTION :**
- Corriger les erreurs factuelles éventuelles
- Améliorer la structure avec des sections claires
- Ajouter des détails manquants importants
- Simplifier les explications complexes
- Ajouter des avertissements de sécurité si pertinents

**INSTRUCTIONS :**
- Si la réponse est correcte, améliore seulement la présentation
- Si tu détectes des erreurs, corrige-les et explique brièvement
- Garde le même niveau de détail mais améliore la qualité
- Utilise le formatage Markdown approprié
- Conserve le ton professionnel et bienveillant d'Adam

Fournis la réponse améliorée UNIQUEMENT, sans commentaires méta.`;

      const correction = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en validation et amélioration de réponses techniques sur Odoo.'
          },
          {
            role: 'user',
            content: correctionPrompt
          }
        ],
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: 0.2, // Plus conservateur pour la correction
        top_p: 0.8,
        stream: false
      });

      const correctedResponse = correction.choices[0]?.message?.content;
      
      if (correctedResponse && correctedResponse.length > 50) {
        console.log('✅ Auto-correction appliquée avec succès');
        return correctedResponse;
      } else {
        console.log('⚠️ Auto-correction échouée, retour à la réponse originale');
        return initialResponse;
      }

    } catch (error) {
      console.error('❌ Erreur lors de l\'auto-correction:', error);
      return initialResponse; // Retourner la réponse originale en cas d'erreur
    }
  }

  /**
   * Génère des métriques de qualité pour une réponse
   * @param {string} response - Réponse à analyser
   * @param {string} question - Question originale
   * @returns {Object} Métriques de qualité
   */
  analyzeResponseQuality(response, question) {
    const metrics = {
      wordCount: response.split(/\s+/).length,
      hasStructure: false,
      hasExamples: false,
      hasActionableSteps: false,
      hasValidation: false,
      technicalTerms: 0,
      readabilityScore: 0
    };

    // Vérifier la structure
    metrics.hasStructure = /#{1,4}|(\*\*.*\*\*)|(\d+\.)/.test(response);
    
    // Vérifier les exemples
    metrics.hasExamples = /(exemple|example|par exemple|```)/i.test(response);
    
    // Vérifier les étapes actionnables
    metrics.hasActionableSteps = /(étape|step|\d+\.|Menu|Aller|Cliquer)/i.test(response);
    
    // Vérifier la validation
    metrics.hasValidation = /(test|vérif|validation|check)/i.test(response);
    
    // Compter les termes techniques Odoo
    const odooTerms = response.match(/\b(module|model|view|field|record|API|ORM|XML|Python)\b/gi);
    metrics.technicalTerms = odooTerms ? odooTerms.length : 0;
    
    // Score de lisibilité simple (longueur des phrases)
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0) / sentences.length;
    metrics.readabilityScore = Math.max(0, 100 - (avgSentenceLength - 15) * 2);
    
    return metrics;
  }

  /**
   * Vérifie la santé du service Groq
   */
  async checkHealth() {
    try {
      if (!this.apiKey || !this.client) {
        return {
          status: 'demo',
          model: 'Mode démonstration',
          message: 'Clé API Groq non configurée - Mode démo actif'
        };
      }

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: 'Ping'
          }
        ],
        model: this.model,
        max_tokens: 10,
        temperature: 0
      });

      return {
        status: 'healthy',
        model: this.model,
        response: completion.choices[0]?.message?.content || 'OK'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Obtient les modèles disponibles
   */
  async getAvailableModels() {
    try {
      const models = await this.client.models.list();
      return models.data.map(model => ({
        id: model.id,
        name: model.id,
        description: model.id
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles:', error);
      return [];
    }
  }
}

module.exports = new GroqService();
