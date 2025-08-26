const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const databaseService = require('./databaseService');

/**
 * Service d'authentification avec JWT et bcrypt
 * Gère l'inscription, la connexion et la validation des tokens
 */
class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-please-change-in-production';
    this.saltRounds = 12;
    console.log('🔐 Service d\'authentification initialisé');
  }

  /**
   * Génère un hash sécurisé du mot de passe
   */
  async hashPassword(password) {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      return hash;
    } catch (error) {
      console.error('❌ Erreur hashage mot de passe:', error);
      throw new Error('Erreur lors du chiffrement du mot de passe');
    }
  }

  /**
   * Vérifie si un mot de passe correspond au hash
   */
  async verifyPassword(password, hash) {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      console.error('❌ Erreur vérification mot de passe:', error);
      throw new Error('Erreur lors de la vérification du mot de passe');
    }
  }

  /**
   * Génère un token JWT
   */
  generateToken(user) {
    try {
      const payload = {
        userId: user.id,
        email: user.email,
        pseudonyme: user.pseudonyme,
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: '7d', // Token valide 7 jours
        issuer: 'odoo-chatbot',
        audience: 'odoo-chatbot-users',
      });

      return token;
    } catch (error) {
      console.error('❌ Erreur génération token:', error);
      throw new Error('Erreur lors de la génération du token');
    }
  }

  /**
   * Vérifie et décode un token JWT
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'odoo-chatbot',
        audience: 'odoo-chatbot-users',
      });
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expiré');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Token invalide');
      } else {
        console.error('❌ Erreur vérification token:', error);
        throw new Error('Erreur lors de la vérification du token');
      }
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async signup(userData) {
    try {
      const { email, pseudonyme, password, confirmPassword } = userData;

      // Validation des données
      if (!email || !pseudonyme || !password || !confirmPassword) {
        throw new Error('Tous les champs sont requis');
      }

      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await databaseService.findUserByEmail(email);
      if (existingUser) {
        throw new Error('Un compte avec cet email existe déjà');
      }

      // Hasher le mot de passe
      const passwordHash = await this.hashPassword(password);

      // Créer l'utilisateur
      const user = await databaseService.createUser({
        email,
        pseudonyme,
        passwordHash,
      });

      // Générer le token
      const token = this.generateToken(user);

      console.log(`✅ Inscription réussie: ${email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          pseudonyme: user.pseudonyme,
          createdAt: user.createdAt,
        },
        token,
      };
    } catch (error) {
      console.error('❌ Erreur inscription:', error.message);
      throw error;
    }
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(credentials) {
    try {
      const { email, password } = credentials;

      // Validation des données
      if (!email || !password) {
        throw new Error('Email et mot de passe requis');
      }

      // Trouver l'utilisateur
      const user = await databaseService.findUserByEmail(email);
      if (!user) {
        throw new Error('Email ou mot de passe incorrect');
      }

      // Vérifier le mot de passe
      const isValidPassword = await this.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Email ou mot de passe incorrect');
      }

      // Générer le token
      const token = this.generateToken(user);

      console.log(`✅ Connexion réussie: ${email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          pseudonyme: user.pseudonyme,
          createdAt: user.createdAt,
          settings: user.settings,
        },
        token,
      };
    } catch (error) {
      console.error('❌ Erreur connexion:', error.message);
      throw error;
    }
  }

  /**
   * Validation d'un token et récupération de l'utilisateur
   */
  async validateToken(token) {
    try {
      const decoded = this.verifyToken(token);
      
      // Récupérer l'utilisateur actuel depuis la base de données
      const user = await databaseService.findUserByEmail(decoded.email);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      return {
        id: user.id,
        email: user.email,
        pseudonyme: user.pseudonyme,
        settings: user.settings,
      };
    } catch (error) {
      console.error('❌ Erreur validation token:', error.message);
      throw error;
    }
  }

  /**
   * Middleware d'authentification pour Express
   */
  authMiddleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Token manquant',
            message: 'Veuillez fournir un token d\'authentification',
          });
        }

        const token = authHeader.substring(7); // Enlever "Bearer "
        const user = await this.validateToken(token);
        
        req.user = user;
        next();
      } catch (error) {
        return res.status(401).json({
          error: 'Token invalide',
          message: error.message,
        });
      }
    };
  }
}

module.exports = new AuthService();
