import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import Sidebar from '../components/layout/Sidebar';
import ChatInterface from '../components/chat/ChatInterface';

export default function ChatPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const {
    conversations,
    activeConversation,
    loading,
    sendMessage,
    newConversation,
    setActiveConversation,
    deleteConversation,
    updateConversation
  } = useChat();

  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  };

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden relative">
      {/* Sidebar - Hidden on mobile by default, shown when not collapsed on desktop */}
      <div className={`
        ${sidebarCollapsed ? 'w-0 md:w-16' : 'w-full md:w-80'} 
        absolute md:relative h-full z-20 transition-all duration-300 ease-in-out
      `}>
        <Sidebar
          conversations={conversations}
          activeConversation={activeConversation}
          onNewChat={newConversation}
          onSelectConversation={(conv) => {
            setActiveConversation(conv);
            // Close sidebar on mobile after selection
            if (window.innerWidth < 768) {
              setSidebarCollapsed(true);
            }
          }}
          onDeleteConversation={deleteConversation}
          onUpdateConversation={updateConversation}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          activeConversation={activeConversation}
          loading={loading}
          onSendMessage={handleSendMessage}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      
      {/* Mobile overlay when sidebar is open */}
      {!sidebarCollapsed && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-10"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
}
