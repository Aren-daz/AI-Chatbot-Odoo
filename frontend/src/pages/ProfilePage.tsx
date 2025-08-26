import { useState } from 'react';
import { User, Settings, Bell, Shield, Download, Trash2, Edit, ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    pseudonyme: user?.pseudonyme || '',
    email: user?.email || ''
  });

  const handleSave = () => {
    // Ici on pourrait ajouter la logique pour sauvegarder les modifications
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      pseudonyme: user?.pseudonyme || '',
      email: user?.email || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/chat')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour au chat</span>
              </Button>
            </div>
            <h1 className="text-2xl font-bold">Mon Compte</h1>
            <div className="w-20"></div> {/* Spacer pour centrer le titre */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Colonne de gauche - Profil principal */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Section Profil */}
              <div className="bg-card border border-border rounded-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center">
                    <User className="w-6 h-6 mr-3 text-primary" />
                    Informations du profil
                  </h2>
                  {!isEditing && (
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Modifier</span>
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Pseudonyme
                      </label>
                      <Input
                        value={editForm.pseudonyme}
                        onChange={(e) => setEditForm(prev => ({ ...prev, pseudonyme: e.target.value }))}
                        placeholder="Votre pseudonyme"
                        className="text-lg"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Email
                      </label>
                      <Input
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Votre email"
                        type="email"
                        className="text-lg"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button onClick={handleSave} className="flex items-center space-x-2">
                        <Save className="w-4 h-4" />
                        <span>Sauvegarder</span>
                      </Button>
                      <Button variant="outline" onClick={handleCancel} className="flex items-center space-x-2">
                        <X className="w-4 h-4" />
                        <span>Annuler</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-6">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-3xl font-bold">
                          {user?.pseudonyme?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold">{user?.pseudonyme || 'Utilisateur'}</h3>
                        <p className="text-muted-foreground text-lg">{user?.email || 'email@example.com'}</p>
                        <p className="text-sm text-muted-foreground">Membre depuis 2024</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section Sécurité */}
              <div className="bg-card border border-border rounded-xl p-8">
                <h2 className="text-2xl font-bold flex items-center mb-6">
                  <Shield className="w-6 h-6 mr-3 text-primary" />
                  Sécurité et accès
                </h2>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start h-14 text-left">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Changer mon mot de passe</p>
                        <p className="text-sm text-muted-foreground">Mettre à jour votre mot de passe</p>
                      </div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start h-14 text-left">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Préférences de notification</p>
                        <p className="text-sm text-muted-foreground">Gérer vos alertes et notifications</p>
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Section Actions */}
              <div className="bg-card border border-border rounded-xl p-8">
                <h2 className="text-2xl font-bold flex items-center mb-6">
                  <Settings className="w-6 h-6 mr-3 text-primary" />
                  Actions du compte
                </h2>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start h-14 text-left">
                    <div className="flex items-center space-x-3">
                      <Download className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Exporter mes données</p>
                        <p className="text-sm text-muted-foreground">Télécharger toutes vos conversations</p>
                      </div>
                    </div>
                  </Button>
                  
                  <Button variant="destructive" className="w-full justify-start h-14 text-left" onClick={logout}>
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Se déconnecter</p>
                        <p className="text-sm">Fermer votre session actuelle</p>
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            {/* Colonne de droite - Statistiques et infos */}
            <div className="space-y-6">
              
              {/* Statistiques */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">📊 Statistiques</h3>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">1</p>
                    <p className="text-sm text-muted-foreground">Conversations</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">0</p>
                    <p className="text-sm text-muted-foreground">Messages</p>
                  </div>
                </div>
              </div>

              {/* Informations techniques */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">🔧 Informations</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version app</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dernière connexion</span>
                    <span className="font-medium">Aujourd'hui</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <span className="text-green-600 font-medium">Actif</span>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3">💬 Besoin d'aide ?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Notre équipe est là pour vous accompagner
                </p>
                <Button variant="outline" className="w-full">
                  Contacter le support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
