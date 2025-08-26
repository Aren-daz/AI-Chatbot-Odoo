import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Types pour les conversations et messages
interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: string;
  sources?: any[];
  isError?: boolean;
}

interface Conversation {
  id: number;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, token, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  // Charger les conversations depuis la base de données
  useEffect(() => {
    if (isAuthenticated && token) {
      loadConversations();
    } else {
      // Nettoyer les conversations si l'utilisateur n'est pas connecté
      setConversations([]);
      setActiveConversation(null);
    }
  }, [isAuthenticated, token]);

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`📋 ${data.conversations.length} conversations chargées depuis la base de données`);
          setConversations(data.conversations);
          if (data.conversations.length > 0) {
            setActiveConversation(data.conversations[0]);
          }
        }
      } else {
        console.error('❌ Erreur chargement conversations:', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur réseau chargement conversations:', error);
    }
  };

  // Version qui retourne les conversations pour éviter les problèmes de state
  const loadConversationsAndReturn = async (): Promise<Conversation[] | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`📋 ${data.conversations.length} conversations chargées depuis la base de données`);
          setConversations(data.conversations);
          return data.conversations;
        }
      } else {
        console.error('❌ Erreur chargement conversations:', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur réseau chargement conversations:', error);
    }
    return null;
  };

  const sendMessage = async (message) => {
    if (!message || !message.trim() || !token) return;

    setLoading(true);
    const trimmedMessage = message.trim();

    try {
      const conversationId = activeConversation?.id || null;

      // Timeout pour les requêtes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes

      console.log(`📤 Envoi du message: "${trimmedMessage.substring(0, 50)}..." 
                   ${conversationId ? `dans la conversation ${conversationId}` : 'nouvelle conversation'}`);

      // Optimistic update: afficher immédiatement le message utilisateur
      let tempConversationId = activeConversation?.id ?? -1;
      const optimisticUserMessage = {
        id: Date.now(),
        text: trimmedMessage,
        isUser: true,
        timestamp: new Date().toISOString(),
      } as Message;

      if (activeConversation) {
        const updated = conversations.map(c =>
          c.id === activeConversation.id
            ? { ...c, messages: [...c.messages, optimisticUserMessage] }
            : c
        );
        setConversations(updated);
        setActiveConversation({ ...activeConversation, messages: [...activeConversation.messages, optimisticUserMessage] });
      } else {
        // Pas de conversation active: créer une temporaire locale
        const tempConv: Conversation = {
          id: tempConversationId,
          title: 'Nouvelle conversation',
          messages: [optimisticUserMessage],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setConversations([tempConv, ...conversations]);
        setActiveConversation(tempConv);
      }

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: trimmedMessage,
          conversationId: conversationId
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('🔐 Session expirée. Veuillez vous reconnecter.');
        } else if (response.status === 404) {
          throw new Error('🔌 Service non disponible. Le backend est-il démarré ?');
        } else if (response.status === 429) {
          throw new Error('⏰ Trop de requêtes. Veuillez patienter avant de renvoyer un message.');
        } else {
          throw new Error(`❌ Erreur serveur: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Réponse reçue pour la conversation ${data.conversationId}`);
        
        // Recharger les conversations pour avoir les données à jour (remplace l'optimiste proprement)
        const freshConversations = await loadConversationsAndReturn();
        
        // Si c'était une nouvelle conversation, la définir comme active
        if (!conversationId && data.conversationId && freshConversations) {
          const newActiveConversation = freshConversations.find(c => c.id === data.conversationId);
          if (newActiveConversation) {
            setActiveConversation(newActiveConversation);
          }
        }
        // Aligner la conversation active si elle existe déjà
        if (freshConversations && activeConversation) {
          const refreshed = freshConversations.find(c => c.id === (data.conversationId || activeConversation.id));
          if (refreshed) setActiveConversation(refreshed);
        }

        return data;
      } else {
        throw new Error(data.message || 'Erreur lors de l\'envoi du message');
      }

    } catch (error) {
      console.error('❌ Erreur sendMessage:', error);
      
      let errorMessage = '❌ Une erreur est survenue';
      let toastDescription = 'Une erreur inattendue s\'est produite';
      
      if (error.name === 'AbortError') {
        errorMessage = '⏱️ Timeout: La requête a pris trop de temps. Vérifiez votre connexion.';
        toastDescription = 'La requête a pris trop de temps. Vérifiez votre connexion.';
      } else if (error.message.includes('fetch')) {
        errorMessage = '🔌 Impossible de se connecter au serveur\n\nLe backend n\'est pas accessible sur le port 3001.\n\n**Solutions possibles :**\n• Vérifiez que le script `.\\start.ps1` a bien démarré les deux services\n• Redémarrez l\'application avec `.\\start.ps1`\n• Attendez quelques secondes que le backend se lance complètement\n\nSi le problème persiste, contactez l\'administrateur.';
        toastDescription = 'Le backend n\'est pas accessible. Vérifiez que le serveur est démarré.';
      } else {
        errorMessage = error.message || 'Une erreur inattendue s\'est produite';
        toastDescription = error.message || 'Une erreur inattendue s\'est produite';
      }

      // Afficher l'erreur avec Toast
      addToast({
        type: 'error',
        title: 'Erreur de communication',
        description: toastDescription,
        duration: 7000
      });

      // Ajouter un message d'erreur dans l'interface
      if (activeConversation) {
        const errorBotMessage = {
          id: Date.now(),
          text: errorMessage,
          isUser: false,
          timestamp: new Date().toISOString(),
          isError: true,
        };

        const updatedConversations = conversations.map(conv => {
          if (conv.id === activeConversation.id) {
            return {
              ...conv,
              messages: [...conv.messages, errorBotMessage]
            };
          }
          return conv;
        });

        setConversations(updatedConversations);
        setActiveConversation({
          ...activeConversation,
          messages: [...activeConversation.messages, errorBotMessage]
        });
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateConversation = async (conversationId, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ Conversation ${conversationId} mise à jour`);
          
          // Mettre à jour les conversations localement
          const updatedConversations = conversations.map(conv => 
            conv.id === conversationId ? data.conversation : conv
          );
          setConversations(updatedConversations);
          
          // Mettre à jour la conversation active si nécessaire
          if (activeConversation?.id === conversationId) {
            setActiveConversation(data.conversation);
          }
          
          return data.conversation;
        }
      } else {
        console.error('❌ Erreur mise à jour conversation:', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur réseau mise à jour conversation:', error);
    }
  };

  const deleteConversation = async (conversationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`🗑️ Conversation ${conversationId} supprimée`);
          
          // Mettre à jour les conversations localement
          const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
          setConversations(updatedConversations);
          
          // Si c'était la conversation active, en sélectionner une autre
          if (activeConversation?.id === conversationId) {
            setActiveConversation(updatedConversations.length > 0 ? updatedConversations[0] : null);
          }
          
          return true;
        }
      } else {
        console.error('❌ Erreur suppression conversation:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur réseau suppression conversation:', error);
      return false;
    }
  };

  const newConversation = () => {
    setActiveConversation(null);
  };

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    sendMessage,
    updateConversation,
    deleteConversation,
    newConversation,
    loading,
    reloadConversations: loadConversations,
  };
};