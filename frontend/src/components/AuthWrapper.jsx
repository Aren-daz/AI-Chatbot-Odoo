import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginPage from './auth/LoginPage';
import SignupPage from './auth/SignupPage';
import ChatPage from '../pages/ChatPage';
import ProfilePage from '../pages/ProfilePage';

const AuthWrapper = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-primary transform rotate-45 animate-spin"></div>
          <span className="text-lg">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return isLogin ? (
      <LoginPage onSwitchToSignup={() => setIsLogin(false)} />
    ) : (
      <SignupPage onSwitchToLogin={() => setIsLogin(true)} />
    );
  }

  return (
    <Routes>
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
};

export default AuthWrapper;