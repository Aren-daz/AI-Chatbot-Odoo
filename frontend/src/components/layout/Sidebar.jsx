import { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Archive, Settings, HelpCircle, Search, X, Menu, User, Palette, Bell, Database, Info, GripVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { useAuth } from '../../hooks/useAuth';
import { Switch } from '../ui/switch';

const Sidebar = ({ 
  conversations, 
  activeConversation, 
  onNewChat, 
  onSelectConversation, 
  onDeleteConversation,
  onUpdateConversation,
  collapsed = false,
  onToggleCollapse
}) => {
  const { user, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingConversation, setEditingConversation] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(320); // Largeur par défaut
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  
  // État des paramètres de l'application
  const [appSettings, setAppSettings] = useState({
    darkMode: true,
    smoothAnimations: true,
    compactMode: false,
    soundNotifications: false,
    markdownFormatting: true,
    autoSaveConversations: true
  });

  // Fonction pour mettre à jour les paramètres
  const updateAppSetting = (key, value) => {
    setAppSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Fonction pour sauvegarder le titre modifié
  const saveConversationTitle = () => {
    if (editingConversation && editTitle.trim()) {
      const updatedConversation = {
        ...editingConversation,
        title: editTitle.trim()
      };
      
      // Appeler la fonction de mise à jour passée en prop
      if (onUpdateConversation) {
        onUpdateConversation(updatedConversation);
      }
      
      // Fermer l'édition
      setEditingConversation(null);
      setEditTitle('');
    }
  };

  // Gestion du redimensionnement
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      const minWidth = 280; // Largeur minimale
      const maxWidth = 600; // Largeur maximale
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Filtrer les conversations selon la recherche
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (collapsed) {
    return (
      <div className="w-16 bg-card border-r border-border flex flex-col h-full items-center py-4 relative rounded-r-3xl">
        <Button onClick={onToggleCollapse} variant="ghost" size="sm" className="w-10 h-10 p-0 mb-4 rounded-2xl">
          <Menu className="w-4 h-4" />
        </Button>
        <Button onClick={onNewChat} variant="ghost" size="sm" className="w-10 h-10 p-0 mb-4 rounded-2xl">
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="w-10 h-10 p-0 mb-4 rounded-2xl">
          <MessageSquare className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="w-10 h-10 p-0 mb-4 rounded-2xl">
          <Archive className="w-4 h-4" />
        </Button>
        <div className="flex-1"></div>
        <Button variant="ghost" size="sm" className="w-10 h-10 p-0 mb-2 rounded-2xl" onClick={() => setShowProfile(true)}>
          <User className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="w-10 h-10 p-0 mb-2 rounded-2xl" onClick={() => setShowSettings(true)}>
          <Settings className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-2xl" onClick={() => setShowHelp(true)}>
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div 
        ref={sidebarRef}
        className="bg-card border-r border-border flex flex-col h-full relative rounded-r-3xl"
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <div className="p-4 border-b border-border rounded-t-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-primary transform rotate-45 mr-2"></div>
              <h1 className="text-lg font-semibold">Odoo Chatbot</h1>
            </div>
            <Button onClick={onToggleCollapse} variant="ghost" size="sm" className="w-8 h-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={onNewChat} className="w-full rounded-2xl">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle conversation
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border rounded-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Rechercher dans les conversations..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-input rounded-2xl"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto rounded-xl">
          {filteredConversations.length > 0 ? (
            <div className="p-2">
              {filteredConversations.map((conversation) => (
                                 <div
                   key={conversation.id}
                   className={`p-3 rounded-2xl cursor-pointer transition-colors group ${
                     activeConversation?.id === conversation.id
                       ? 'bg-primary text-primary-foreground'
                       : 'hover:bg-muted'
                   }`}
                   onClick={() => onSelectConversation(conversation)}
                 >
                   <div className="flex items-center justify-between">
                     <div className="flex-1 min-w-0">
                       <h3 className="font-medium truncate">{conversation.title}</h3>
                       <p className="text-sm text-muted-foreground truncate">
                         {conversation.messages.length} messages
                       </p>
                     </div>
                     <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button
                         variant="ghost"
                         size="sm"
                         className="w-6 h-6 p-0 hover:bg-background/50 rounded-lg"
                         onClick={(e) => {
                           e.stopPropagation();
                           setEditingConversation(conversation);
                           setEditTitle(conversation.title);
                         }}
                         title="Modifier le titre"
                       >
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                         </svg>
                       </Button>
                       <Button
                         variant="ghost"
                         size="sm"
                         className="w-6 h-6 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg"
                         onClick={(e) => {
                           e.stopPropagation();
                           if (window.confirm(`Êtes-vous sûr de vouloir supprimer la conversation "${conversation.title}" ?`)) {
                             onDeleteConversation(conversation.id);
                           }
                         }}
                         title="Supprimer la conversation"
                       >
                         <X className="w-3 h-3" />
                       </Button>
                     </div>
                   </div>
                 </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucune conversation</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2 rounded-b-3xl">
          <Button variant="ghost" className="w-full justify-start rounded-2xl" onClick={() => setShowProfile(true)}>
            <User className="w-4 h-4 mr-2" />
            Mon Compte
          </Button>
          <Button variant="ghost" className="w-full justify-start rounded-2xl" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
          </Button>
          <Button variant="ghost" className="w-full justify-start rounded-2xl" onClick={() => setShowHelp(true)}>
            <HelpCircle className="w-4 h-4 mr-2" />
            Aide et FAQ
          </Button>
        </div>

        {/* Handle de redimensionnement */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 bg-transparent hover:bg-primary/20 cursor-col-resize group flex items-center justify-center"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        >
          <div className="w-0.5 h-16 bg-border group-hover:bg-primary/60 rounded-full transition-colors"></div>
        </div>
      </div>

      {/* Profile Dialog - Gestion du compte */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-md max-h-[70vh] rounded-2xl p-0 flex flex-col">
          {/* Header fixe */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center">
              <User className="w-5 h-5 mr-2 text-primary" />
              Mon Compte
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Gérez votre profil et vos préférences
            </DialogDescription>
          </DialogHeader>
          
          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-6 pt-4">
            {/* Profil principal */}
            <div className="bg-muted/30 rounded-xl p-4 mx-auto w-full max-w-sm md:max-w-md max-h-[45vh] overflow-y-auto">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white text-lg font-bold">
                    {user?.pseudonyme?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">{user?.pseudonyme || 'Utilisateur'}</h3>
                  <p className="text-muted-foreground text-sm">{user?.email || 'email@example.com'}</p>
                  <p className="text-xs text-muted-foreground">Membre depuis 2024</p>
                </div>
              </div>
            </div>

            {/* Actions du compte */}
            <div className="bg-muted/30 rounded-xl p-4 mx-auto w-full max-w-sm md:max-w-md max-h-[45vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Settings className="w-4 h-4 mr-2 text-primary" />
                Actions du compte
              </h3>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 text-left rounded-xl"
                  onClick={() => setShowEditProfile(true)}
                >
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Modifier mon profil</p>
                      <p className="text-xs text-muted-foreground">Changer pseudonyme et informations</p>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 text-left rounded-xl"
                  onClick={() => setShowNotifications(true)}
                >
                  <div className="flex items-center space-x-3">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Préférences de notification</p>
                      <p className="text-xs text-muted-foreground">Gérer vos alertes et notifications</p>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 text-left rounded-xl"
                  onClick={() => {
                    const data = {
                      user: user,
                      conversations: conversations,
                      exportDate: new Date().toISOString()
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `profil-export-${user?.email || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Exporter mes données</p>
                      <p className="text-xs text-muted-foreground">Télécharger toutes vos conversations</p>
                    </div>
                  </div>
                </Button>
                
                <Button variant="destructive" className="w-full justify-start h-12 text-left rounded-xl" onClick={logout}>
                  <div className="flex items-center space-x-3">
                    <X className="w-4 h-4" />
                    <div>
                      <p className="font-medium text-sm">Se déconnecter</p>
                      <p className="text-xs">Fermer votre session actuelle</p>
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Statistiques */}
            <div className="bg-muted/30 rounded-xl p-4">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Database className="w-4 h-4 mr-2 text-primary" />
                Statistiques
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-background rounded-xl border border-border">
                  <p className="text-2xl font-bold text-primary">{conversations.length}</p>
                  <p className="text-xs text-muted-foreground">Conversations</p>
                </div>
                <div className="text-center p-3 bg-background rounded-xl border border-border">
                  <p className="text-2xl font-bold text-primary">
                    {conversations.reduce((total, conv) => total + conv.messages.length, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Messages</p>
                </div>
              </div>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog - Paramètres de l'application */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md max-h-[70vh] rounded-2xl p-0 flex flex-col">
          {/* Header fixe */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center">
              <Settings className="w-5 h-5 mr-2 text-primary" />
              Paramètres
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Personnalisez votre expérience de l'application
            </DialogDescription>
          </DialogHeader>
          
          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-5 pt-4">
              {/* Apparence */}
              <div className="bg-muted/30 rounded-xl p-4 mx-auto w-full max-w-sm md:max-w-md max-h-[45vh] overflow-y-auto">
                <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                  <Palette className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Apparence</h3>
                  <p className="text-xs text-muted-foreground">Personnalisez l'interface</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">Mode sombre</p>
                    <p className="text-xs text-muted-foreground">Interface sombre pour les yeux</p>
                  </div>
                  <Switch 
                    checked={appSettings.darkMode}
                    onCheckedChange={(checked) => updateAppSetting('darkMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">Animations fluides</p>
                    <p className="text-xs text-muted-foreground">Transitions et animations</p>
                  </div>
                  <Switch 
                    checked={appSettings.smoothAnimations}
                    onCheckedChange={(checked) => updateAppSetting('smoothAnimations', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">Mode compact</p>
                    <p className="text-xs text-muted-foreground">Interface plus dense</p>
                  </div>
                  <Switch 
                    checked={appSettings.compactMode}
                    onCheckedChange={(checked) => updateAppSetting('compactMode', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="bg-muted/30 rounded-xl p-4 mx-auto w-full max-w-sm md:max-w-md max-h-[45vh] overflow-y-auto">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Chat</h3>
                  <p className="text-xs text-muted-foreground">Préférences pour vos échanges</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">Notifications sonores</p>
                    <p className="text-xs text-muted-foreground">Son pour les nouvelles réponses</p>
                  </div>
                  <Switch 
                    checked={appSettings.soundNotifications}
                    onCheckedChange={(checked) => updateAppSetting('soundNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">Sauvegarde automatique</p>
                    <p className="text-xs text-muted-foreground">Sauvegarder automatiquement vos conversations</p>
                  </div>
                  <Switch 
                    checked={appSettings.autoSaveConversations}
                    onCheckedChange={(checked) => updateAppSetting('autoSaveConversations', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">Formatage Markdown</p>
                    <p className="text-xs text-muted-foreground">Afficher le formatage riche dans les réponses</p>
                  </div>
                  <Switch 
                    checked={appSettings.markdownFormatting}
                    onCheckedChange={(checked) => updateAppSetting('markdownFormatting', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Données */}
            <div className="bg-muted/30 rounded-xl p-4 mx-auto w-full max-w-sm md:max-w-md max-h-[45vh] overflow-y-auto">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-3">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Données</h3>
                  <p className="text-xs text-muted-foreground">Gérez vos données de stockage</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 bg-background rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">Conversations sauvegardées</p>
                      <p className="text-xs text-muted-foreground">{conversations.length} conversation(s)</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs rounded-lg"
                      onClick={() => {
                        const data = {
                          conversations: conversations,
                          settings: appSettings,
                          exportDate: new Date().toISOString(),
                          userEmail: user?.email
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `odoo-chatbot-export-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Exporter
                    </Button>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((conversations.length / 10) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">Vider le cache</p>
                    <p className="text-xs text-muted-foreground">Supprimer toutes les données locales</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="text-xs rounded-lg"
                    onClick={() => {
                      if (window.confirm('Êtes-vous sûr de vouloir vider le cache ? Toutes vos conversations seront supprimées.')) {
                        localStorage.removeItem(`odoo_chatbot_conversations_${user.email}`);
                        localStorage.removeItem('odoo_chatbot_settings');
                        window.location.reload();
                      }
                    }}
                  >
                    Vider
                  </Button>
                </div>
              </div>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md max-h-[70vh] rounded-2xl p-0 flex flex-col">
          {/* Header fixe */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center">
              <HelpCircle className="w-5 h-5 mr-2 text-primary" />
              Aide & FAQ
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Questions fréquentes et assistance
            </DialogDescription>
          </DialogHeader>
          
          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-5 pt-4">
              {/* À propos du Chatbot */}
              <div className="bg-muted/30 rounded-xl p-4">
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-2">
                    <span className="text-white text-xs">🤖</span>
                  </div>
                  À propos d'Adam
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Je suis <strong>Adam</strong>, votre assistant IA spécialisé dans Odoo v17. Je travaille chez <strong>Schwing Stetter Algérie</strong>.</p>
                  <p>Mes connaissances proviennent de la documentation officielle Odoo.</p>
                </div>
              </div>
            </div>

              {/* Questions Fréquentes */}
              <div className="bg-muted/30 rounded-xl p-4">
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center mr-2">
                    <span className="text-white text-xs">❓</span>
                  </div>
                  Questions Fréquentes
                </h3>
                <div className="space-y-2">
                  <div className="bg-background rounded-xl p-3 border border-border">
                    <h4 className="font-medium mb-1 text-sm">Comment créer une nouvelle conversation ?</h4>
                    <p className="text-xs text-muted-foreground">Cliquez sur "Nouvelle conversation" dans la barre latérale.</p>
                  </div>
                  <div className="bg-background rounded-xl p-3 border border-border">
                    <h4 className="font-medium mb-1 text-sm">Comment rechercher dans mes conversations ?</h4>
                    <p className="text-xs text-muted-foreground">Utilisez la barre de recherche en haut de la barre latérale.</p>
                  </div>
                  <div className="bg-background rounded-xl p-3 border border-border">
                    <h4 className="font-medium mb-1 text-sm">Mes conversations sont-elles sauvegardées ?</h4>
                    <p className="text-xs text-muted-foreground">Oui, toutes vos conversations sont automatiquement sauvegardées.</p>
                  </div>
                </div>
              </div>

            {/* Raccourcis Clavier */}
            <div className="bg-muted/30 rounded-xl p-4">
              <h3 className="font-bold text-lg mb-3 flex items-center">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-white text-xs">⌨️</span>
                </div>
                Raccourcis
              </h3>
              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                <div className="flex justify-between p-2 bg-background rounded-lg border border-border">
                  <span><strong>Ctrl + N</strong></span>
                  <span>Nouvelle conversation</span>
                </div>
                <div className="flex justify-between p-2 bg-background rounded-lg border border-border">
                  <span><strong>Ctrl + K</strong></span>
                  <span>Focus recherche</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
              <p>Développé avec ❤️ par Adam</p>
              <p className="text-xs opacity-70">Schwing Stetter Algérie • v1.0.0</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold flex items-center">
              <User className="w-5 h-5 mr-2 text-primary" />
              Modifier mon profil
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Mettez à jour vos informations personnelles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pseudonyme</label>
              <Input 
                placeholder="Votre pseudonyme" 
                defaultValue={user?.pseudonyme}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input 
                placeholder="Votre email" 
                defaultValue={user?.email}
                className="rounded-xl"
                disabled
              />
              <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button 
                className="flex-1 rounded-xl"
                onClick={() => {
                  // Ici on pourrait ajouter la logique de sauvegarde
                  setShowEditProfile(false);
                }}
              >
                Sauvegarder
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl"
                onClick={() => setShowEditProfile(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold flex items-center">
              <Bell className="w-5 h-5 mr-2 text-primary" />
              Notifications
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Gérez vos préférences de notification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <p className="font-medium text-sm">Notifications de réponse</p>
                  <p className="text-xs text-muted-foreground">Recevoir une notification quand Adam répond</p>
                </div>
                <Switch defaultChecked={true} />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <p className="font-medium text-sm">Son de notification</p>
                  <p className="text-xs text-muted-foreground">Jouer un son lors des notifications</p>
                </div>
                <Switch defaultChecked={false} />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <p className="font-medium text-sm">Notifications bureau</p>
                  <p className="text-xs text-muted-foreground">Afficher des notifications sur le bureau</p>
                </div>
                <Switch defaultChecked={true} />
              </div>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button 
                className="flex-1 rounded-xl"
                onClick={() => setShowNotifications(false)}
              >
                Sauvegarder
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl"
                onClick={() => setShowNotifications(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Conversation Title Dialog */}
      <Dialog open={!!editingConversation} onOpenChange={() => setEditingConversation(null)}>
        <DialogContent className="max-w-md rounded-2xl">
           <DialogHeader className="pb-4">
             <DialogTitle className="text-xl font-bold flex items-center">
               <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
               </svg>
               Modifier le titre
             </DialogTitle>
             <DialogDescription className="text-muted-foreground">
               Modifiez le titre de votre conversation
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div className="space-y-2">
               <label className="text-sm font-medium">Titre de la conversation</label>
               <Input 
                 value={editTitle}
                 onChange={(e) => setEditTitle(e.target.value)}
                 placeholder="Entrez le nouveau titre..."
                 className="rounded-xl"
                 onKeyPress={(e) => {
                   if (e.key === 'Enter') {
                     saveConversationTitle();
                   }
                 }}
               />
             </div>
             <div className="flex space-x-3 pt-4">
               <Button 
                 className="flex-1 rounded-xl"
                 onClick={saveConversationTitle}
                 disabled={!editTitle.trim()}
               >
                 Sauvegarder
               </Button>
               <Button 
                 variant="outline" 
                 className="flex-1 rounded-xl"
                 onClick={() => {
                   setEditingConversation(null);
                   setEditTitle('');
                 }}
               >
                 Annuler
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
     </>
   );
 };

export default Sidebar;