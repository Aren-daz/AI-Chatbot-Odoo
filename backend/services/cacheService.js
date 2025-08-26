/**
 * Service de cache intelligent avec support Redis/Memory
 * Utilise Redis en production et Map en développement
 */

class CacheService {
  constructor() {
    this.isRedis = false;
    this.client = null;
    
    // Essayer de se connecter à Redis si disponible
    if (process.env.REDIS_URL) {
      try {
        const Redis = require('ioredis');
        this.client = new Redis(process.env.REDIS_URL);
        this.isRedis = true;
        console.log('✅ Cache Redis connecté');
      } catch (error) {
        console.warn('⚠️ Redis non disponible, utilisation du cache mémoire');
        this.initMemoryCache();
      }
    } else {
      this.initMemoryCache();
    }
    
    // Configuration TTL par défaut (en secondes)
    this.TTL = {
      search: 3600,           // 1 heure pour les recherches
      conversation: 300,      // 5 minutes pour les conversations
      documentation: 86400,   // 24 heures pour la documentation
      user: 600,              // 10 minutes pour les données utilisateur
      analytics: 60,          // 1 minute pour les analytics temps réel
      export: 1800            // 30 minutes pour les exports
    };
    
    // Statistiques du cache
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
  
  /**
   * Initialise le cache mémoire
   */
  initMemoryCache() {
    this.client = new Map();
    this.expirations = new Map();
    this.isRedis = false;
    console.log('💾 Cache mémoire initialisé');
    
    // Nettoyer les entrées expirées toutes les minutes
    setInterval(() => this.cleanupExpiredEntries(), 60000);
  }
  
  /**
   * Génère une clé avec namespace
   */
  generateKey(key, namespace = 'default') {
    return `${namespace}:${key}`;
  }
  
  /**
   * Récupère une valeur du cache
   */
  async get(key, namespace = 'default') {
    try {
      const fullKey = this.generateKey(key, namespace);
      
      if (this.isRedis) {
        const value = await this.client.get(fullKey);
        if (value) {
          this.stats.hits++;
          return JSON.parse(value);
        }
      } else {
        // Cache mémoire
        if (this.client.has(fullKey)) {
          const expiration = this.expirations.get(fullKey);
          if (!expiration || expiration > Date.now()) {
            this.stats.hits++;
            return this.client.get(fullKey);
          } else {
            // Entrée expirée
            this.client.delete(fullKey);
            this.expirations.delete(fullKey);
          }
        }
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('❌ Erreur cache get:', error);
      return null;
    }
  }
  
  /**
   * Stocke une valeur dans le cache
   */
  async set(key, value, ttl = null, namespace = 'default') {
    try {
      const fullKey = this.generateKey(key, namespace);
      const finalTTL = ttl || this.TTL[namespace] || this.TTL.search;
      
      if (this.isRedis) {
        await this.client.setex(fullKey, finalTTL, JSON.stringify(value));
      } else {
        // Cache mémoire
        this.client.set(fullKey, value);
        this.expirations.set(fullKey, Date.now() + (finalTTL * 1000));
      }
      
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('❌ Erreur cache set:', error);
      return false;
    }
  }
  
  /**
   * Supprime une entrée du cache
   */
  async delete(key, namespace = 'default') {
    try {
      const fullKey = this.generateKey(key, namespace);
      
      if (this.isRedis) {
        await this.client.del(fullKey);
      } else {
        this.client.delete(fullKey);
        this.expirations.delete(fullKey);
      }
      
      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error('❌ Erreur cache delete:', error);
      return false;
    }
  }
  
  /**
   * Invalide toutes les entrées correspondant à un pattern
   */
  async invalidate(pattern, namespace = 'default') {
    try {
      const fullPattern = `${namespace}:${pattern}`;
      
      if (this.isRedis) {
        const keys = await this.client.keys(fullPattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } else {
        // Cache mémoire
        const keysToDelete = [];
        for (const key of this.client.keys()) {
          if (key.includes(pattern)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => {
          this.client.delete(key);
          this.expirations.delete(key);
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erreur cache invalidate:', error);
      return false;
    }
  }
  
  /**
   * Vide tout le cache
   */
  async flush() {
    try {
      if (this.isRedis) {
        await this.client.flushdb();
      } else {
        this.client.clear();
        this.expirations.clear();
      }
      
      console.log('🧹 Cache vidé');
      return true;
    } catch (error) {
      console.error('❌ Erreur cache flush:', error);
      return false;
    }
  }
  
  /**
   * Nettoie les entrées expirées (pour le cache mémoire)
   */
  cleanupExpiredEntries() {
    if (!this.isRedis) {
      const now = Date.now();
      const keysToDelete = [];
      
      for (const [key, expiration] of this.expirations.entries()) {
        if (expiration <= now) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => {
        this.client.delete(key);
        this.expirations.delete(key);
      });
      
      if (keysToDelete.length > 0) {
        console.log(`🧹 ${keysToDelete.length} entrées expirées supprimées du cache`);
      }
    }
  }
  
  /**
   * Récupère les statistiques du cache
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      type: this.isRedis ? 'Redis' : 'Memory',
      size: this.isRedis ? 'N/A' : this.client.size
    };
  }
  
  /**
   * Cache avec récupération automatique si manquant
   */
  async getOrSet(key, fetchFunction, ttl = null, namespace = 'default') {
    try {
      // Essayer de récupérer depuis le cache
      let value = await this.get(key, namespace);
      
      if (value === null) {
        // Pas dans le cache, récupérer la valeur
        value = await fetchFunction();
        
        if (value !== null && value !== undefined) {
          // Stocker dans le cache
          await this.set(key, value, ttl, namespace);
        }
      }
      
      return value;
    } catch (error) {
      console.error('❌ Erreur cache getOrSet:', error);
      // En cas d'erreur, essayer de récupérer directement
      return await fetchFunction();
    }
  }
  
  /**
   * Décore une fonction avec du cache
   */
  memoize(fn, keyGenerator, ttl = null, namespace = 'default') {
    return async (...args) => {
      const key = typeof keyGenerator === 'function' 
        ? keyGenerator(...args) 
        : JSON.stringify(args);
      
      return this.getOrSet(key, () => fn(...args), ttl, namespace);
    };
  }
}

// Export singleton
module.exports = new CacheService();
