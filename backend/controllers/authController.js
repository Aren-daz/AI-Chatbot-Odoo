const authService = require('../services/authService');

/**
 * Contrôleur d'authentification
 * Gère l'inscription, la connexion et la validation des utilisateurs
 */
class AuthController {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async signup(req, res) {
    try {
      const { email, pseudonyme, password, confirmPassword } = req.body;

      // Validation des données
      if (!email || !pseudonyme || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Tous les champs sont requis',
          message: 'Veuillez remplir tous les champs obligatoires',
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Mots de passe différents',
          message: 'Les mots de passe ne correspondent pas',
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Mot de passe trop court',
          message: 'Le mot de passe doit contenir au moins 8 caractères',
        });
      }

      // Inscription via le service
      const result = await authService.signup({
        email,
        pseudonyme,
        password,
        confirmPassword,
      });

      return res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      console.error('❌ Erreur contrôleur inscription:', error.message);

      if (error.message.includes('existe déjà')) {
        return res.status(409).json({
          success: false,
          error: 'Compte existant',
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        message: 'Une erreur est survenue lors de l\'inscription',
      });
    }
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation des données
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Données manquantes',
          message: 'Email et mot de passe requis',
        });
      }

      // Connexion via le service
      const result = await authService.login({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      console.error('❌ Erreur contrôleur connexion:', error.message);

      if (error.message.includes('incorrect')) {
        return res.status(401).json({
          success: false,
          error: 'Identifiants invalides',
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        message: 'Une erreur est survenue lors de la connexion',
      });
    }
  }

  /**
   * Validation du token et récupération du profil
   */
  async getProfile(req, res) {
    try {
      // L'utilisateur est déjà disponible via le middleware d'auth
      const user = req.user;

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('❌ Erreur contrôleur profil:', error.message);

      return res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        message: 'Une erreur est survenue lors de la récupération du profil',
      });
    }
  }

  /**
   * Déconnexion (côté client principalement)
   */
  async logout(req, res) {
    try {
      // Note: Avec JWT, la déconnexion se fait principalement côté client
      // en supprimant le token. Ici on peut juste confirmer la déconnexion.
      
      return res.status(200).json({
        success: true,
        message: 'Déconnexion réussie',
      });
    } catch (error) {
      console.error('❌ Erreur contrôleur déconnexion:', error.message);

      return res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        message: 'Une erreur est survenue lors de la déconnexion',
      });
    }
  }
}

module.exports = new AuthController();
