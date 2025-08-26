const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

/**
 * Service GITHUB-BASED pour récupérer TOUTE la documentation Odoo v17
 * Lit directement les fichiers RST locaux clonés depuis GitHub
 */
class OdooDocumentationService {
  constructor() {
    // Chemin vers la documentation GitHub clonée
    this.githubDocPath = path.join(__dirname, '..', '..', 'documentation', 'content');
    this.cacheDir = process.env.ODOO_DOC_CACHE_DIR || './cache/odoo-docs';
    this.version = process.env.ODOO_VERSION || '17.0';
    this.updateInterval = parseInt(process.env.DOC_UPDATE_INTERVAL) || 86400000; // 24h
    
    this.documentationIndex = new Map();
    this.lastUpdate = null;
    this.processedFiles = new Set();
    
    // Configuration pour le parsing RST et Markdown
    this.supportedExtensions = ['.rst', '.md'];
    this.maxFileSize = 1024 * 1024; // 1MB max par fichier
    
    // Initialiser les parsers
    this.initializeParsers();
    
    // Métriques et monitoring
    this.metrics = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      totalBytesProcessed: 0,
      averageProcessingTime: 0,
      startTime: Date.now()
    };
    
    this.initializeCache();
  }

  /**
   * Initialise les parsers pour différents formats de fichiers
   */
  initializeParsers() {
    try {
      // Essayer d'importer le parser Markdown
      this.markdownParser = require('marked');
      console.log('✅ Parser Markdown (marked) initialisé');
    } catch (error) {
      console.warn('⚠️ Parser Markdown non disponible - installation recommandée: npm install marked');
      this.markdownParser = null;
    }
  }

  /**
   * Initialise le cache de documentation de manière asynchrone
   */
  async initializeCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      // Vérifier que la documentation GitHub existe
      if (!await this.checkGitHubDocExists()) {
        console.error('❌ Documentation GitHub non trouvée !');
        console.error(`   Vérifiez que le dossier existe: ${this.githubDocPath}`);
        console.error('   Exécutez: git clone --branch 17.0 https://github.com/odoo/documentation.git');
        return;
      }
      
      // Charger le cache existant immédiatement (synchrone)
      await this.loadIndexFromCache();
      
      // Démarrer l'indexation en arrière-plan si nécessaire (asynchrone)
      if (this.shouldUpdate()) {
        console.log('🔄 Indexation de la documentation démarrée en arrière-plan...');
        
        // Exécuter l'indexation de manière asynchrone sans bloquer
        this.backgroundIndexing()
          .then(() => {
            console.log(`✅ Indexation terminée - ${this.documentationIndex.size} documents disponibles`);
          })
          .catch(error => {
            console.error('❌ Erreur lors de l\'indexation en arrière-plan:', error.message);
          });
      }
      
      // Service prêt immédiatement avec le cache existant
      const docCount = this.documentationIndex.size;
      if (docCount > 0) {
        console.log(`📚 Service de documentation prêt (${docCount} documents en cache)`);
      } else {
        console.log(`📚 Service de documentation prêt (indexation en cours...)`);
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de la documentation:', error);
    }
  }

  /**
   * Exécute l'indexation en arrière-plan sans bloquer le démarrage du serveur
   */
  async backgroundIndexing() {
    try {
      console.log('🔄 Début de l\'indexation asynchrone...');
      
      // Exécuter l'indexation complète
      await this.indexGitHubDocumentation();
      
      // Enrichir avec des documents synthétiques
      await this.enrichDocumentationSources();
      
      console.log('✅ Indexation asynchrone terminée avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation asynchrone:', error);
      throw error;
    }
  }

  /**
   * Vérifie que la documentation GitHub existe
   */
  async checkGitHubDocExists() {
    try {
      const stats = await fs.stat(this.githubDocPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Indexe TOUTE la documentation GitHub
   */
  async indexGitHubDocumentation() {
    console.log('🔍 Indexation GITHUB de la documentation Odoo...');
    
    try {
      const startTime = Date.now();
      
      // 1. Scanner récursivement tous les fichiers
      const allFiles = await this.scanAllRstFiles(this.githubDocPath);
      console.log(`📁 ${allFiles.length} fichiers de documentation trouvés (RST + Markdown)`);
      
      // 2. Traiter chaque fichier
      let processedCount = 0;
      let totalBytes = 0;
      
      for (let i = 0; i < allFiles.length; i++) {
        const filePath = allFiles[i];
        
        try {
          console.log(`📖 Traitement (${i + 1}/${allFiles.length}): ${path.relative(this.githubDocPath, filePath)}`);
          
          const doc = await this.processRstFile(filePath);
          if (doc) {
            this.documentationIndex.set(doc.id, doc);
            processedCount++;
            totalBytes += doc.content.length;
            
            // Sauvegarde progressive
            if (processedCount % 50 === 0) {
              await this.saveIndexToCache();
              console.log(`💾 Sauvegarde progressive: ${processedCount} documents`);
            }
          }
          
        } catch (error) {
          console.warn(`⚠️ Erreur lors du traitement de ${filePath}:`, error.message);
          this.metrics.failedFiles++;
        }
      }
      
      // 3. Sauvegarde finale
      await this.saveIndexToCache();
      this.lastUpdate = Date.now();
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ Indexation GITHUB terminée en ${totalTime}ms`);
      console.log(`📊 ${processedCount} documents indexés (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
      
      // 4. Afficher les statistiques
      await this.displayIndexStats();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation GITHUB:', error);
    }
  }

  /**
   * Scanne récursivement tous les fichiers RST
   */
  async scanAllRstFiles(dirPath) {
    const files = [];
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          // Récursion pour les sous-dossiers
          const subFiles = await this.scanAllRstFiles(fullPath);
          files.push(...subFiles);
        } else if (stats.isFile() && this.isRstFile(item)) {
          // Vérifier la taille du fichier
          if (stats.size <= this.maxFileSize) {
            files.push(fullPath);
          } else {
            console.log(`⚠️ Fichier trop volumineux ignoré: ${item} (${(stats.size / 1024).toFixed(1)} KB)`);
          }
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ Erreur lors du scan de ${dirPath}:`, error.message);
    }
    
    return files;
  }

  /**
   * Vérifie si un fichier est supporté (RST ou Markdown)
   */
  isRstFile(filename) {
    return this.supportedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  /**
   * Traite un fichier (RST ou Markdown) et extrait le contenu
   */
  async processRstFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(this.githubDocPath, filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      
      let metadata, cleanContent;
      
      // Traitement selon le type de fichier
      if (fileExtension === '.md') {
        metadata = this.extractMarkdownMetadata(content, relativePath);
        cleanContent = this.cleanMarkdownContent(content);
      } else {
        // Traitement RST par défaut
        metadata = this.extractRstMetadata(content, relativePath);
        cleanContent = this.cleanRstContent(content);
      }
      
      if (cleanContent.length < 100) {
        return null; // Fichier trop court
      }
      
      // Créer l'objet document
      const doc = {
        id: this.generateDocumentId(relativePath),
        filePath: relativePath,
        fullPath: filePath,
        title: metadata.title,
        description: metadata.description,
        content: cleanContent,
        section: metadata.section,
        subsection: metadata.subsection,
        keywords: metadata.keywords,
        lastUpdated: new Date().toISOString(),
        wordCount: cleanContent.split(/\s+/).length,
        readingTime: Math.ceil(cleanContent.split(/\s+/).length / 200),
        fileSize: content.length,
        fileType: fileExtension,
        metadata: {
          ...metadata,
          fileType: fileExtension,
          parser: fileExtension === '.md' ? 'markdown' : 'rst'
        }
      };
      
      this.metrics.processedFiles++;
      this.metrics.totalBytesProcessed += content.length;
      
      return doc;
      
    } catch (error) {
      console.warn(`⚠️ Erreur lors du traitement de ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Extrait les métadonnées d'un fichier RST
   */
  extractRstMetadata(content, relativePath) {
    const metadata = {
      title: '',
      description: '',
      keywords: [],
      section: '',
      subsection: ''
    };
    
    // Extraire la section et sous-section depuis le chemin
    const pathParts = relativePath.split(path.sep);
    if (pathParts.length >= 1) {
      metadata.section = pathParts[0];
    }
    if (pathParts.length >= 2) {
      metadata.subsection = pathParts[1];
    }
    
    // Extraire le titre (première ligne avec =)
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && line.match(/^=+$/) && i > 0) {
        metadata.title = lines[i - 1].trim();
        break;
      }
    }
    
    // Si pas de titre trouvé, utiliser le nom du fichier
    if (!metadata.title) {
      metadata.title = path.basename(relativePath, path.extname(relativePath))
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Extraire la description (première phrase après le titre)
    const contentAfterTitle = content.substring(content.indexOf(metadata.title) + metadata.title.length);
    const sentences = contentAfterTitle.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length > 0) {
      metadata.description = sentences[0].trim().substring(0, 200);
    }
    
    // Extraire les mots-clés (titre + section)
    metadata.keywords = [
      metadata.title.toLowerCase(),
      metadata.section.toLowerCase(),
      ...(metadata.subsection ? [metadata.subsection.toLowerCase()] : [])
    ];
    
    return metadata;
  }

  /**
   * Extrait les métadonnées d'un fichier Markdown
   */
  extractMarkdownMetadata(content, relativePath) {
    const metadata = {
      title: '',
      description: '',
      keywords: [],
      section: '',
      subsection: ''
    };
    
    // Extraire la section et sous-section depuis le chemin
    const pathParts = relativePath.split(path.sep);
    if (pathParts.length >= 1) {
      metadata.section = pathParts[0];
    }
    if (pathParts.length >= 2) {
      metadata.subsection = pathParts[1];
    }
    
    const lines = content.split('\n');
    
    // Chercher le front matter YAML (optionnel)
    let frontMatterEnd = 0;
    if (lines[0] && lines[0].trim() === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          frontMatterEnd = i + 1;
          break;
        }
      }
    }
    
    // Extraire le titre depuis le front matter ou le premier heading
    if (frontMatterEnd > 0) {
      // Parser le front matter basique
      for (let i = 1; i < frontMatterEnd - 1; i++) {
        const line = lines[i];
        if (line.startsWith('title:')) {
          metadata.title = line.substring(6).trim().replace(/["']/g, '');
        }
        if (line.startsWith('description:')) {
          metadata.description = line.substring(12).trim().replace(/["']/g, '');
        }
      }
    }
    
    // Si pas de titre dans le front matter, chercher le premier H1
    if (!metadata.title) {
      for (let i = frontMatterEnd; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('# ')) {
          metadata.title = line.substring(2).trim();
          break;
        }
      }
    }
    
    // Si toujours pas de titre, utiliser le nom du fichier
    if (!metadata.title) {
      metadata.title = path.basename(relativePath, path.extname(relativePath))
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Extraire la description si pas déjà définie
    if (!metadata.description) {
      const contentAfterTitle = content.substring(content.indexOf(metadata.title) + metadata.title.length);
      const sentences = contentAfterTitle.split(/[.!?]+/).filter(s => s.trim().length > 20);
      if (sentences.length > 0) {
        metadata.description = sentences[0].trim().substring(0, 200);
      }
    }
    
    // Extraire les mots-clés (titre + section)
    metadata.keywords = [
      metadata.title.toLowerCase(),
      metadata.section.toLowerCase(),
      ...(metadata.subsection ? [metadata.subsection.toLowerCase()] : [])
    ];
    
    return metadata;
  }

  /**
   * Nettoie le contenu Markdown
   */
  cleanMarkdownContent(content) {
    return content
      // Supprimer le front matter YAML
      .replace(/^---[\s\S]*?---\n?/, '')
      // Supprimer les balises HTML
      .replace(/<[^>]*>/g, '')
      // Supprimer la syntaxe Markdown des liens
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Supprimer la syntaxe des images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Supprimer les markers de code
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Supprimer les headings markers
      .replace(/^#+\s+/gm, '')
      // Supprimer les markers de liste
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Supprimer les markers de citation
      .replace(/^>\s*/gm, '')
      // Nettoyer les espaces
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
      .substring(0, 50000); // Limite à 50KB
  }

  /**
   * Nettoie le contenu RST
   */
  cleanRstContent(content) {
    return content
      // Supprimer les directives RST
      .replace(/\.\.\s+\w+::.*$/gm, '')
      // Supprimer les commentaires
      .replace(/\.\.\s+.*$/gm, '')
      // Supprimer les liens externes
      .replace(/`([^`]+)\s*<[^>]+>`_/g, '$1')
      // Supprimer les liens internes
      .replace(/:doc:`([^`]+)`/g, '$1')
      .replace(/:ref:`([^`]+)`/g, '$1')
      // Nettoyer les espaces
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
      .substring(0, 50000); // Limite à 50KB
  }

  /**
   * Génère un ID unique pour le document
   */
  generateDocumentId(relativePath) {
    return relativePath
      .replace(/[\\\/]/g, '_')
      .replace(/\.(rst|md)$/, '')
      .toLowerCase();
  }

  /**
   * Affiche les statistiques de l'index
   */
  async displayIndexStats() {
    const sections = new Map();
    let totalWords = 0;
    let totalReadingTime = 0;
    
    for (const doc of this.documentationIndex.values()) {
      const section = doc.section;
      sections.set(section, (sections.get(section) || 0) + 1);
      totalWords += doc.wordCount || 0;
      totalReadingTime += doc.readingTime || 0;
    }
    
    console.log('\n📊 Statistiques de l\'index GITHUB:');
    console.log(`   📁 Total documents: ${this.documentationIndex.size}`);
    console.log(`   📝 Total mots: ${totalWords.toLocaleString()}`);
    console.log(`   ⏱️ Temps de lecture total: ${totalReadingTime} min`);
    console.log(`   💾 Taille estimée: ${(this.metrics.totalBytesProcessed / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n📂 Répartition par section:');
    for (const [section, count] of sections) {
      console.log(`   ${section}: ${count} documents`);
    }
  }

  /**
   * Recherche avancée dans la documentation avec scoring intelligent
   */
  searchDocumentation(query, options = {}) {
    const {
      limit = 20,
      section = null,
      minScore = 0,
      includeMetadata = true,
      semanticBoost = true,
      contextualTerms = []
    } = options;

    const results = [];
    const searchTerms = this.preprocessSearchTerms(query);
    
    // Détection du type de requête pour scoring adaptatif
    const queryType = this.detectQueryType(query);
    const isHRQuery = queryType.includes('hr');

    for (const [id, doc] of this.documentationIndex) {
      // Filtrer par section si spécifié
      if (section && doc.section !== section) continue;

      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      const descLower = (doc.description || '').toLowerCase();

      // Scoring adaptatif basé sur le type de requête et le contexte
      score = this.calculateAdaptiveScore(doc, searchTerms, query, queryType, {
        titleLower,
        contentLower,
        descLower,
        isHRQuery,
        contextualTerms: options.contextualTerms || []
      });

      if (score >= minScore) {
        const result = {
          ...doc,
          score,
          excerpt: this.extractRelevantExcerpt(doc.content, searchTerms)
        };

        if (includeMetadata && doc.metadata) {
          result.metadata = doc.metadata;
        }

        results.push(result);
      }
    }

    // Tri par score
    results.sort((a, b) => b.score - a.score);
    
    // Filtrer les résultats de faible qualité
    const qualityResults = results.filter(doc => doc.score > 10);
    
    // Ajouter le résumé des sources
    const sourcesSummary = Array.from(new Set(qualityResults.map(r => r.section)))
      .map(section => {
        const cleanSection = section.replace('/applications/', '').replace('/developer/', '').replace('_', ' ');
        return `Ces informations proviennent de la documentation ${cleanSection}`;
      });

    return {
      results: qualityResults.slice(0, limit),
      sourcesSummary
    };
  }

  /**
   * Préprocesse les termes de recherche avec synonymes et normalisation
   * @param {string} query - Requête de recherche
   * @returns {Array} Termes de recherche enrichis
   */
  preprocessSearchTerms(query) {
    const baseTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const enrichedTerms = [...baseTerms];
    
    // Dictionnaire de synonymes Odoo
    const synonyms = {
      'congé': ['leave', 'vacation', 'time off', 'absence', 'holiday'],
      'leave': ['congé', 'vacation', 'absence'],
      'projet': ['project', 'task', 'tache', 'planning', 'workflow'],
      'project': ['projet', 'task', 'planning'],
      'vente': ['sales', 'sell', 'customer', 'client', 'commercial'],
      'sales': ['vente', 'sell', 'customer', 'commercial'],
      'achat': ['purchase', 'vendor', 'supplier', 'fournisseur', 'procurement'],
      'purchase': ['achat', 'vendor', 'supplier', 'fournisseur'],
      'stock': ['inventory', 'warehouse', 'location', 'entrepot'],
      'inventory': ['stock', 'warehouse', 'location'],
      'comptabilité': ['accounting', 'finance', 'invoice', 'facture', 'financial'],
      'accounting': ['comptabilité', 'finance', 'invoice', 'facture'],
      'paie': ['payroll', 'salary', 'salaire', 'wage', 'remuneration'],
      'payroll': ['paie', 'salary', 'salaire', 'wage'],
      'utilisateur': ['user', 'employee', 'employé', 'person', 'membre'],
      'user': ['utilisateur', 'employee', 'employé'],
      'configuration': ['config', 'setup', 'paramètre', 'setting', 'parameter'],
      'setup': ['configuration', 'config', 'paramètre'],
      'rapport': ['report', 'reporting', 'dashboard', 'analytics'],
      'report': ['rapport', 'reporting', 'dashboard'],
      'module': ['addon', 'app', 'application', 'extension'],
      'addon': ['module', 'app', 'application'],
      'API': ['api', 'interface', 'endpoint', 'webservice'],
      'base': ['database', 'db', 'donnée', 'data'],
      'database': ['base', 'db', 'donnée'],
      'vue': ['view', 'form', 'tree', 'kanban'],
      'view': ['vue', 'form', 'tree'],
      'modèle': ['model', 'table', 'record', 'data'],
      'model': ['modèle', 'table', 'record'],
      'champ': ['field', 'column', 'attribute', 'property'],
      'field': ['champ', 'column', 'attribute'],
      'workflow': ['flux', 'process', 'processus', 'sequence'],
      'process': ['workflow', 'flux', 'processus'],
      'email': ['mail', 'message', 'notification', 'courrier'],
      'mail': ['email', 'message', 'notification'],
      'website': ['site', 'web', 'portal', 'ecommerce'],
      'portal': ['website', 'site', 'web'],
      'manufacturing': ['mrp', 'production', 'fabrication', 'usine'],
      'mrp': ['manufacturing', 'production', 'fabrication'],
      'crm': ['customer', 'lead', 'opportunity', 'prospect'],
      'lead': ['crm', 'prospect', 'opportunity'],
      'partner': ['client', 'customer', 'vendor', 'contact'],
      'contact': ['partner', 'client', 'customer'],
      'invoice': ['facture', 'bill', 'billing', 'facturation'],
      'facture': ['invoice', 'bill', 'billing'],
      'product': ['produit', 'article', 'item', 'merchandise'],
      'produit': ['product', 'article', 'item'],
      'installation': ['install', 'setup', 'deployment', 'configuration'],
      'install': ['installation', 'setup', 'deployment'],
      'erreur': ['error', 'bug', 'issue', 'problem'],
      'error': ['erreur', 'bug', 'issue', 'problem'],
    };
    
    // Enrichir avec des synonymes
    baseTerms.forEach(term => {
      if (synonyms[term]) {
        enrichedTerms.push(...synonyms[term]);
      }
    });
    
    // Ajouter des variantes techniques
    const technicalVariants = {
      'odoo': ['erp', 'openerp', 'enterprise'],
      'xml': ['view', 'template', 'qweb'],
      'python': ['py', 'script', 'code'],
      'javascript': ['js', 'script', 'frontend'],
      'postgresql': ['postgres', 'db', 'database'],
      'css': ['style', 'design', 'frontend'],
      'html': ['template', 'qweb', 'frontend'],
    };
    
    baseTerms.forEach(term => {
      if (technicalVariants[term]) {
        enrichedTerms.push(...technicalVariants[term]);
      }
    });
    
    return [...new Set(enrichedTerms)]; // Supprimer les doublons
  }

  /**
   * Détecte le type de requête pour un scoring adaptatif
   * @param {string} query - Requête de recherche
   * @returns {Array} Types détectés
   */
  detectQueryType(query) {
    const queryLower = query.toLowerCase();
    const types = [];
    
    // Types de modules
    const modulePatterns = {
      hr: ['congé', 'leave', 'employee', 'hr', 'rh', 'paie', 'payroll', 'timesheet'],
      sales: ['vente', 'sales', 'customer', 'devis', 'quote', 'order'],
      purchase: ['achat', 'purchase', 'vendor', 'supplier', 'procurement'],
      inventory: ['stock', 'inventory', 'warehouse', 'location'],
      accounting: ['comptabilité', 'accounting', 'facture', 'invoice', 'financial'],
      project: ['projet', 'project', 'task', 'planning'],
      manufacturing: ['manufacturing', 'mrp', 'production', 'bom'],
      website: ['website', 'ecommerce', 'portal', 'web'],
      crm: ['crm', 'lead', 'opportunity', 'prospect'],
    };
    
    // Types d'actions
    const actionPatterns = {
      configuration: ['configuration', 'setup', 'config', 'paramètre'],
      development: ['développement', 'development', 'code', 'python', 'xml', 'api'],
      installation: ['installation', 'install', 'deployment'],
      usage: ['utilisation', 'usage', 'comment', 'how to'],
      troubleshooting: ['erreur', 'error', 'problem', 'bug', 'issue'],
      reporting: ['rapport', 'report', 'dashboard', 'analytics'],
    };
    
    // Détecter les modules
    for (const [module, keywords] of Object.entries(modulePatterns)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        types.push(module);
      }
    }
    
    // Détecter les actions
    for (const [action, keywords] of Object.entries(actionPatterns)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        types.push(action);
      }
    }
    
    // Niveau de complexité
    if (queryLower.match(/api|python|xml|développement|code|custom/)) {
      types.push('technical');
    } else if (queryLower.match(/comment|how|pourquoi|why|what|que/)) {
      types.push('beginner');
    }
    
    return types.length > 0 ? types : ['general'];
  }

  /**
   * Calcule un score adaptatif basé sur le type de requête et le contexte
   * @param {Object} doc - Document à scorer
   * @param {Array} searchTerms - Termes de recherche enrichis
   * @param {string} originalQuery - Requête originale
   * @param {Array} queryType - Types détectés de la requête
   * @param {Object} context - Contexte de scoring (titleLower, contentLower, etc.)
   * @returns {number} Score calculé
   */
  calculateAdaptiveScore(doc, searchTerms, originalQuery, queryType, context) {
    let score = 0;
    const { titleLower, contentLower, descLower, isHRQuery, contextualTerms } = context;
    
    // 1. SCORING DE BASE PAR TERME
    for (const term of searchTerms) {
      let termScore = 0;
      
      // Titre (poids très élevé)
      if (titleLower.includes(term)) {
        termScore += 100;
        // Bonus pour correspondance exacte
        if (titleLower === term) termScore += 50;
      }
      
      // Description (poids élevé)
      if (descLower.includes(term)) {
        termScore += 40;
      }
      
      // Contenu avec pondération par fréquence
      const contentMatches = (contentLower.match(new RegExp(term, 'g')) || []).length;
      if (contentMatches > 0) {
        // Score logarithmique pour éviter la surpondération
        termScore += Math.min(Math.log(contentMatches + 1) * 15, 50);
      }
      
      // Métadonnées (section, subsection)
      if (doc.section.toLowerCase().includes(term)) termScore += 25;
      if (doc.subsection && doc.subsection.toLowerCase().includes(term)) termScore += 20;
      
      score += termScore;
    }
    
    // 2. BONUS POUR CORRESPONDANCE EXACTE DE PHRASE
    if (contentLower.includes(originalQuery.toLowerCase())) {
      score += 80;
    }
    
    // 3. SCORING ADAPTATIF PAR TYPE DE REQUÊTE
    score += this.getTypeSpecificBonus(doc, queryType, originalQuery);
    
    // 4. BONUS CONTEXTUELS
    if (contextualTerms.length > 0) {
      contextualTerms.forEach(term => {
        if (titleLower.includes(term.toLowerCase()) || contentLower.includes(term.toLowerCase())) {
          score += 30;
        }
      });
    }
    
    // 5. PÉNALITÉS ET AJUSTEMENTS
    score += this.applyQualityAdjustments(doc, originalQuery, queryType);
    
    // 6. NORMALISATION ET PLAFONNEMENT
    return Math.max(0, Math.min(score, 1000));
  }

  /**
   * Calcule les bonus spécifiques au type de requête
   * @param {Object} doc - Document
   * @param {Array} queryType - Types de requête détectés
   * @param {string} originalQuery - Requête originale
   * @returns {number} Bonus de score
   */
  getTypeSpecificBonus(doc, queryType, originalQuery) {
    let bonus = 0;
    const docSection = doc.section.toLowerCase();
    const docTitle = doc.title.toLowerCase();
    const docContent = doc.content.toLowerCase();
    
    queryType.forEach(type => {
      switch (type) {
        case 'hr':
          if (docSection.includes('hr') || 
              docSection.includes('timesheet') ||
              docTitle.includes('employee') ||
              docTitle.includes('leave') ||
              docTitle.includes('payroll')) {
            bonus += 150;
          }
          break;
          
        case 'sales':
          if (docSection.includes('sales') ||
              docSection.includes('crm') ||
              docTitle.includes('customer') ||
              docTitle.includes('quote')) {
            bonus += 120;
          }
          break;
          
        case 'accounting':
          if (docSection.includes('accounting') ||
              docTitle.includes('invoice') ||
              docTitle.includes('payment')) {
            bonus += 120;
          }
          break;
          
        case 'development':
          if (docSection.includes('developer') ||
              docContent.includes('python') ||
              docContent.includes('xml') ||
              docContent.includes('api')) {
            bonus += 100;
          }
          break;
          
        case 'configuration':
          if (docTitle.includes('configuration') ||
              docTitle.includes('setup') ||
              docContent.includes('setting')) {
            bonus += 80;
          }
          break;
          
        case 'beginner':
          // Bonus pour la documentation simple et explicative
          if (docTitle.includes('introduction') ||
              docTitle.includes('getting started') ||
              docContent.includes('step by step')) {
            bonus += 60;
          }
          // Pénalité pour le contenu très technique
          if (docContent.includes('advanced') ||
              docContent.includes('customize') ||
              docContent.includes('override')) {
            bonus -= 30;
          }
          break;
          
        case 'technical':
          // Bonus pour le contenu technique
          if (docContent.includes('api') ||
              docContent.includes('code') ||
              docContent.includes('development')) {
            bonus += 80;
          }
          break;
      }
    });
    
    return bonus;
  }

  /**
   * Applique des ajustements de qualité au score
   * @param {Object} doc - Document
   * @param {string} originalQuery - Requête originale
   * @param {Array} queryType - Types de requête
   * @returns {number} Ajustement du score
   */
  applyQualityAdjustments(doc, originalQuery, queryType) {
    let adjustment = 0;
    const docContent = doc.content.toLowerCase();
    const docTitle = doc.title.toLowerCase();
    
    // Bonus pour les documents complets
    if (doc.wordCount > 500) adjustment += 10;
    if (doc.wordCount > 1000) adjustment += 10;
    
    // Bonus pour les documents récents
    if (doc.lastUpdated) {
      const updateDate = new Date(doc.lastUpdated);
      const monthsOld = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsOld < 6) adjustment += 15;
      else if (monthsOld < 12) adjustment += 5;
    }
    
    // Pénalité pour les documents trop techniques si requête simple
    if (!queryType.includes('technical') && !queryType.includes('development')) {
      if (docContent.includes('class ') ||
          docContent.includes('def ') ||
          docContent.includes('import ') ||
          docContent.includes('from ')) {
        adjustment -= 40;
      }
    }
    
    // Bonus pour les sections importantes
    const importantSections = ['user', 'administration', 'applications'];
    if (importantSections.some(section => doc.section.includes(section))) {
      adjustment += 15;
    }
    
    // Pénalité pour les documents très courts
    if (doc.wordCount < 100) adjustment -= 20;
    
    // Bonus pour les titres bien formés
    if (docTitle.length > 10 && docTitle.length < 100) adjustment += 5;
    
    return adjustment;
  }

  /**
   * Extraction d'extrait pertinent avec contexte
   */
  extractRelevantExcerpt(content, searchTerms) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Trouver la phrase la plus pertinente
    let bestSentence = '';
    let bestScore = 0;
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      let score = 0;
      
      for (const term of searchTerms) {
        if (sentenceLower.includes(term)) {
          score += term.length;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    }
    
    if (bestSentence && bestScore > 0) {
      return bestSentence.trim().substring(0, 300) + '...';
    }
    
    return content.substring(0, 200) + '...';
  }

  /**
   * Obtient les statistiques de la documentation
   */
  getStats() {
    const sections = new Map();
    
    for (const doc of this.documentationIndex.values()) {
      const section = doc.section;
      sections.set(section, (sections.get(section) || 0) + 1);
    }

    return {
      totalDocuments: this.documentationIndex.size,
      lastUpdate: this.lastUpdate,
      sections: Object.fromEntries(sections),
      version: this.version,
      source: 'GitHub',
      metrics: this.metrics
    };
  }

  /**
   * Vérifie si une mise à jour est nécessaire
   */
  shouldUpdate() {
    if (!this.lastUpdate) return true;
    return (Date.now() - this.lastUpdate) > this.updateInterval;
  }

  /**
   * Sauvegarde l'index en cache
   */
  async saveIndexToCache() {
    try {
      const indexPath = path.join(this.cacheDir, 'github-documentation-index.json');
      const metadataPath = path.join(this.cacheDir, 'github-metadata.json');
      
      const indexData = {
        version: '4.0', // Version GITHUB du format de cache
        odooVersion: this.version,
        source: 'GitHub',
        lastUpdate: this.lastUpdate,
        totalDocuments: this.documentationIndex.size,
        documents: Array.from(this.documentationIndex.entries())
      };

      const metadata = {
        createdAt: new Date().toISOString(),
        stats: this.getStats(),
        metrics: this.metrics,
        githubPath: this.githubDocPath
      };

      // Sauvegarde des données principales
      await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
      
      // Sauvegarde des métadonnées séparément
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log(`💾 Cache GITHUB sauvegardé: ${this.documentationIndex.size} documents`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du cache:', error);
    }
  }

  /**
   * Enrichit la documentation avec des sources externes et des exemples
   * @returns {Promise<Object>} Résultats de l'enrichissement
   */
  async enrichDocumentationSources() {
    console.log('🌟 Enrichissement des sources de documentation...');
    
    try {
      const enrichmentSources = [
        {
          name: 'FAQ Odoo communautaire',
          source: 'community',
          priority: 0.8,
          topics: ['installation', 'configuration', 'troubleshooting', 'best practices']
        },
        {
          name: 'Exemples de code Odoo',
          source: 'examples',
          priority: 0.9,
          topics: ['development', 'api', 'modules', 'customization']
        },
        {
          name: 'Cas d\'usage métier',
          source: 'business',
          priority: 0.7,
          topics: ['workflows', 'processes', 'industry-specific']
        }
      ];

      // Créer des documents synthétiques pour les cas d'usage courants
      const syntheticDocs = await this.generateSyntheticDocuments();
      
      // Ajouter les documents synthétiques à l'index
      syntheticDocs.forEach(doc => {
        this.documentationIndex.set(doc.id, doc);
      });

      console.log(`✅ ${syntheticDocs.length} documents synthétiques ajoutés`);
      
      return {
        success: true,
        addedDocs: syntheticDocs.length,
        totalDocs: this.documentationIndex.size
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'enrichissement:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Génère des documents synthétiques pour les cas d'usage courants
   * @returns {Array} Documents synthétiques
   */
  async generateSyntheticDocuments() {
    const syntheticDocs = [];
    
    // Documents de FAQ courante
    const faqData = [
      {
        id: 'faq_hr_leave_config',
        title: 'Configuration des congés - Guide complet',
        section: 'hr',
        subsection: 'timesheet',
        content: `
Configuration complète des congés dans Odoo v17

1. INSTALLATION DU MODULE
- Allez dans Apps > Rechercher "Timesheets" ou "HR"
- Installez le module Timesheets (Feuilles de temps)
- Le module HR est généralement installé automatiquement

2. CONFIGURATION DES TYPES DE CONGÉS
- Menu Timesheets > Configuration > Types de congés
- Créez vos types : Congés payés, RTT, Maladie, Formation, etc.
- Pour chaque type, définissez :
  * Nom du type de congé
  * Code (ex: CP pour Congés Payés)
  * Couleur pour l'affichage
  * Validation requise (oui/non)
  * Nombre maximum de jours
  * Report d'année en année

3. GESTION DES EMPLOYÉS
- Timesheets > Configuration > Employés
- Pour chaque employé, définissez :
  * Allocations de congés annuelles
  * Manager qui valide les demandes
  * Calendrier de travail
  * Date d'embauche

4. WORKFLOW DE DEMANDE
- Timesheets > Mes congés > Demander des congés
- L'employé sélectionne : type, dates début/fin, motif
- Le système calcule automatiquement le nombre de jours
- Soumission de la demande au manager

5. VALIDATION DES CONGÉS
- Timesheets > Validation > Demandes de congés
- Le manager voit toutes les demandes en attente
- Possibilité d'approuver, refuser ou demander des modifications
- Notifications automatiques à l'employé

6. RAPPORTS ET SUIVI
- Timesheets > Rapports > Congés par employé
- Suivi des soldes de congés
- Planning des absences par équipe
- Export vers tableur pour RH

BONNES PRATIQUES :
- Configurez d'abord tous les types avant de créer les employés
- Testez le workflow avec un employé test
- Formez les managers sur la validation
- Vérifiez les calendriers de travail
- Sauvegardez la configuration avant mise en production
        `,
        keywords: ['congés', 'leave', 'hr', 'timesheet', 'vacation', 'absence'],
        wordCount: 2500,
        description: 'Guide complet pour configurer et utiliser le système de congés dans Odoo v17'
      },
      {
        id: 'faq_sales_workflow',
        title: 'Workflow de vente Odoo - Du prospect à la facture',
        section: 'sales',
        subsection: 'crm',
        content: `
Workflow complet de vente dans Odoo v17

1. GÉNÉRATION DE PROSPECTS (CRM)
- Création manuelle de prospects dans CRM
- Import depuis fichier CSV/Excel
- Capture automatique depuis site web (formulaires)
- Synchronisation avec campagnes email marketing

2. QUALIFICATION DES PROSPECTS
- Attribution automatique aux commerciaux (round-robin)
- Scoring automatique basé sur critères définis
- Étapes du pipeline : Nouveau > Qualifié > Proposé > Négocié > Gagné/Perdu
- Activités programmées (appels, emails, rendez-vous)

3. CRÉATION DE DEVIS
- Conversion prospect en devis depuis CRM
- Catalogue produits intégré avec tarification
- Calcul automatique des remises et taxes
- Templates de devis personnalisables
- Envoi automatique par email

4. NÉGOCIATION ET VALIDATION
- Suivi des versions de devis
- Signature électronique intégrée
- Historique des modifications
- Alertes d'expiration des devis

5. CONFIRMATION COMMANDE
- Transformation automatique devis → commande
- Génération du bon de livraison si stock
- Création automatique de la facture brouillon
- Notification aux équipes logistique

6. LIVRAISON ET FACTURATION
- Gestion des livraisons partielles
- Mise à jour automatique du stock
- Facturation à la livraison ou selon termes
- Relances automatiques de paiement

7. SUIVI CLIENT
- Historique complet des interactions
- Analyse de la rentabilité client
- Opportunités de vente additionnelle
- Support après-vente intégré

INDICATEURS CLÉS :
- Taux de conversion prospect → client
- Cycle de vente moyen
- Valeur moyenne des commandes
- Prévisions de vente par période

AUTOMATISATIONS DISPONIBLES :
- Attribution automatique des prospects
- Emails de suivi programmés
- Relances de paiement
- Rapports périodiques managers
        `,
        keywords: ['sales', 'vente', 'crm', 'devis', 'commande', 'facture', 'prospect'],
        wordCount: 2200,
        description: 'Workflow complet du processus de vente dans Odoo v17'
      },
      {
        id: 'faq_module_development',
        title: 'Développement de modules Odoo - Guide développeur',
        section: 'developer',
        subsection: 'modules',
        content: `
Guide complet de développement de modules Odoo v17

1. STRUCTURE D'UN MODULE
mon_module/
├── __init__.py              # Import des sous-modules
├── __manifest__.py          # Déclaration du module
├── models/                  # Modèles de données
│   ├── __init__.py
│   └── models.py
├── views/                   # Vues et interfaces
│   ├── views.xml
│   └── menus.xml
├── security/                # Droits d'accès
│   └── ir.model.access.csv
├── data/                    # Données par défaut
│   └── data.xml
├── static/                  # Ressources statiques
│   ├── description/
│   └── src/
└── controllers/             # Contrôleurs web
    └── controllers.py

2. FICHIER __manifest__.py
{
    'name': 'Mon Module Personnalisé',
    'version': '17.0.1.0.0',
    'category': 'Sales/CRM',
    'summary': 'Description courte du module',
    'description': '''
Description détaillée
Fonctionnalités principales
    ''',
    'author': 'Votre Entreprise',
    'website': 'https://www.votresite.com',
    'depends': ['base', 'sale', 'stock'],
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
        'views/menus.xml',
        'data/data.xml',
    ],
    'demo': [
        'demo/demo.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'mon_module/static/src/css/style.css',
            'mon_module/static/src/js/widget.js',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}

3. CRÉATION DE MODÈLES
from odoo import models, fields, api

class MonModel(models.Model):
    _name = 'mon.model'
    _description = 'Description du modèle'
    _order = 'name'

    name = fields.Char('Nom', required=True)
    description = fields.Text('Description')
    active = fields.Boolean('Actif', default=True)
    date = fields.Date('Date', default=fields.Date.today)
    user_id = fields.Many2one('res.users', 'Responsable')
    
    @api.model
    def create(self, vals):
        # Logique avant création
        return super().create(vals)

4. DÉFINITION DES VUES
<odoo>
    <data>
        <!-- Vue formulaire -->
        <record id="view_mon_model_form" model="ir.ui.view">
            <field name="name">mon.model.form</field>
            <field name="model">mon.model</field>
            <field name="arch" type="xml">
                <form>
                    <sheet>
                        <group>
                            <field name="name"/>
                            <field name="description"/>
                        </group>
                    </sheet>
                </form>
            </field>
        </record>

        <!-- Vue liste -->
        <record id="view_mon_model_tree" model="ir.ui.view">
            <field name="name">mon.model.tree</field>
            <field name="model">mon.model</field>
            <field name="arch" type="xml">
                <tree>
                    <field name="name"/>
                    <field name="date"/>
                    <field name="user_id"/>
                </tree>
            </field>
        </record>
    </data>
</odoo>

5. SÉCURITÉ ET DROITS
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_mon_model_user,mon.model.user,model_mon_model,base.group_user,1,0,0,0
access_mon_model_manager,mon.model.manager,model_mon_model,base.group_system,1,1,1,1

6. INSTALLATION ET TEST
- Placer le module dans addons/
- Mode développeur : Apps > Mettre à jour liste
- Installer le module
- Tester toutes les fonctionnalités
- Vérifier les logs pour erreurs

BONNES PRATIQUES :
- Respecter la convention de nommage Odoo
- Documenter le code et les fonctions
- Tester sur données de démo
- Utiliser les hooks pour migrations
- Versionner le code avec Git
        `,
        keywords: ['module', 'développement', 'development', 'python', 'xml', 'manifest', 'model'],
        wordCount: 3000,
        description: 'Guide complet pour développer des modules personnalisés dans Odoo v17'
      }
    ];

    faqData.forEach((data, index) => {
      const doc = {
        id: data.id,
        filePath: `synthetic/${data.id}.rst`,
        fullPath: `synthetic/${data.id}.rst`,
        title: data.title,
        description: data.description,
        content: data.content,
        section: data.section,
        subsection: data.subsection,
        keywords: data.keywords,
        lastUpdated: new Date().toISOString(),
        wordCount: data.wordCount,
        readingTime: Math.ceil(data.wordCount / 200),
        fileSize: data.content.length,
        metadata: {
          source: 'synthetic',
          type: 'faq',
          priority: 0.9,
          language: 'fr',
          created: new Date().toISOString()
        }
      };
      
      syntheticDocs.push(doc);
    });

    return syntheticDocs;
  }

  /**
   * Charge l'index depuis le cache
   */
  async loadIndexFromCache() {
    try {
      const indexPath = path.join(this.cacheDir, 'github-documentation-index.json');
      const metadataPath = path.join(this.cacheDir, 'github-metadata.json');
      
      // Charger les données principales
      const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
      
      // Validation de la version du cache
      if (indexData.version !== '4.0' || indexData.source !== 'GitHub') {
        console.log('🔄 Version du cache obsolète, mise à jour nécessaire');
        return;
      }
      
      // Charger les métadonnées si disponibles
      let metadata = null;
      try {
        metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      } catch (error) {
        console.log('ℹ️ Métadonnées de cache non trouvées');
      }
      
      // Restaurer les données
      this.lastUpdate = indexData.lastUpdate;
      this.documentationIndex = new Map(indexData.documents);
      
      console.log(`📚 Cache GITHUB chargé: ${this.documentationIndex.size} documents`);
      if (metadata?.stats) {
        console.log(`📊 Source: ${metadata.stats.source}`);
      }
      
    } catch (error) {
      console.log('📝 Aucun cache GITHUB valide trouvé, indexation nécessaire');
      this.documentationIndex.clear();
    }
  }
}

module.exports = new OdooDocumentationService();
