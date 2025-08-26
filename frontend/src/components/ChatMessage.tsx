import { useEffect, useState, useRef } from 'react';

export default function ChatMessage({ content, isBot = false }: { content: string; isBot?: boolean }) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Si pas un bot ou très court, afficher directement
    if (!isBot || content.length < 50) {
      setDisplayedContent(content);
      setIsTyping(false);
      setShowCursor(false);
      return;
    }

    // Initialiser l'état
    setDisplayedContent('');
    setIsTyping(true);
    setShowCursor(false);

    let currentIndex = 0;
    const charsPerFrame = Math.max(1, Math.floor(content.length / 100)); // Adapté à la longueur
    const delay = content.length > 500 ? 5 : 10; // Plus rapide pour les longs messages

    // Afficher le curseur pendant la frappe (avec délai)
    cursorTimeoutRef.current = setTimeout(() => {
      setShowCursor(true);
    }, delay * 3); // Délai avant d'afficher le curseur

    intervalRef.current = setInterval(() => {
      if (currentIndex < content.length) {
        currentIndex = Math.min(currentIndex + charsPerFrame, content.length);
        setDisplayedContent(content.slice(0, currentIndex));
      } else {
        // Animation terminée
        setIsTyping(false);
        
        // Garder le curseur visible quelques secondes à la fin
        setTimeout(() => {
          setShowCursor(false);
        }, 1500); // Curseur reste 1.5s à la fin
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, delay);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
        cursorTimeoutRef.current = null;
      }
    };
  }, [content, isBot]);

  return (
    <div className={`p-4 rounded-lg ${isBot ? 'bg-muted/30 ml-auto' : 'bg-primary text-primary-foreground'}`}>
      {displayedContent}
      {showCursor && isBot && (
        <span className="animate-pulse text-primary font-mono">█</span>
      )}
    </div>
  );
}
