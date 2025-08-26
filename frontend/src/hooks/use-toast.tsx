import React, { createContext, useContext, useState, useEffect } from 'react';

// Types pour notre système de toast
export interface Toast {
  id: string;
  title?: string;
  description: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// Contexte pour les toasts
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook personnalisé pour utiliser les toasts
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Provider pour les toasts
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <div className="w-5 h-5 text-green-500">OK</div>;
      case 'error':
        return <div className="w-5 h-5 text-red-500">X</div>;
      case 'warning':
        return <div className="w-5 h-5 text-yellow-500">!</div>;
      case 'info':
        return <div className="w-5 h-5 text-blue-500">i</div>;
    }
  };

  const getBorderColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
    }
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`bg-white border-l-4 ${getBorderColor(toast.type)} rounded-2xl shadow-lg p-4 animate-in slide-in-from-top-full duration-300`}
          >
            <div className="flex items-start gap-3">
              {getIcon(toast.type)}
              
              <div className="flex-1">
                {toast.title && (
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">
                    {toast.title}
                  </h4>
                )}
                <p className="text-gray-700 text-sm leading-relaxed">
                  {toast.description}
                </p>
              </div>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                X
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};


