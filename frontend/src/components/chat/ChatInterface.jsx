import { useState, useRef, useEffect } from 'react';
import { Send, MoreHorizontal, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MessageBubble from './MessageBubble';
import { useAuth } from '../../hooks/useAuth';

const ChatInterface = ({ 
  activeConversation, 
  loading, 
  onSendMessage,
  sidebarCollapsed = false,
  onToggleSidebar 
}) => {
  const [message, setMessage] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const { user, logout } = useAuth();
  const messagesEndRef = useRef(null);

  // Tri chronologique croissant (plus anciens en haut, récents en bas)
  const sortByTimestampAsc = (messages = []) => {
    return [...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  // Mettre à jour les messages locaux quand la conversation active change
  // Évite d'écraser les messages optimistes pendant l'envoi; une fois terminé, on remplace par la version serveur triée
  useEffect(() => {
    if (loading) return;
    if (activeConversation?.messages) {
      setLocalMessages(sortByTimestampAsc(activeConversation.messages));
    } else {
      setLocalMessages([]);
    }
  }, [activeConversation, loading]);

  // Ajouter le message de chargement quand loading change
  useEffect(() => {
    if (loading) {
      const loadingMessage = {
        id: 'loading',
        text: 'En train de réfléchir...',
        isUser: false,
        timestamp: new Date().toISOString(),
        isLoading: true
      };
      setLocalMessages(prev => [...prev, loadingMessage]);
    } else {
      // Retirer le message de chargement
      setLocalMessages(prev => prev.filter(msg => msg.id !== 'loading'));
    }
  }, [loading]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Scroll vers le bas quand les messages changent
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [localMessages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !loading) {
      // Créer le message utilisateur
      const userMessage = {
        id: Date.now(),
        text: message.trim(),
        isUser: true,
        timestamp: new Date().toISOString()
      };
      
      // Ajouter le message utilisateur à la liste locale
      setLocalMessages(prev => [...prev, userMessage]);
      
      // Envoyer le message au backend
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header - Fixe */}
      <div className="border-b border-border p-4 bg-card rounded-t-3xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {sidebarCollapsed && (
              <Button
                onClick={onToggleSidebar}
                variant="ghost"
                size="sm"
                className="mr-3 rounded-2xl"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
            <h2 className="text-lg font-semibold">
              {activeConversation?.title || 'Nouvelle conversation'}
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="rounded-2xl">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{user?.pseudonyme || user?.email}</span>
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.pseudonyme?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="text-muted-foreground hover:text-foreground rounded-2xl"
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-hidden">
        {localMessages.length > 0 ? (
          <div className="h-full overflow-y-auto">
            <div className="p-6 space-y-2">
              {localMessages.map((msg, idx) => (
                <MessageBubble key={`${msg.id ?? 'noid'}-${idx}`} message={msg} user={user} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center mx-auto">
                <div className="w-8 h-8 bg-primary rounded-2xl flex items-center justify-center">
                  <span className="text-primary-foreground text-lg">💡</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Bienvenue sur le Chatbot Odoo
                </h3>
                <p className="text-muted-foreground mb-1">
                  Posez une question pour commencer une nouvelle conversation.
                </p>
                <p className="text-muted-foreground">
                  Vous pouvez demander de l'aide sur n'importe quel sujet concernant Odoo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Fixe */}
      <div className="border-t border-border p-4 bg-card rounded-b-3xl flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question ici... (Shift+Entrée pour une nouvelle ligne)"
              disabled={loading}
              className="pr-12 rounded-2xl resize-none min-h-[48px] max-h-48"
              rows={3}
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-2xl"
              disabled={loading || !message.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;