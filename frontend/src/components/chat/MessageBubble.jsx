import { useState } from 'react';
import { BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

const MessageBubble = ({ message, user }) => {
  const [showSources, setShowSources] = useState(false);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Détecter si c'est un message utilisateur (par la présence de l'ID utilisateur ou par la structure)
  const isUserMessage = message.isUser || message.userId || message.sender === 'user';

  if (isUserMessage) {
    return (
      <div className="flex justify-end mb-6">
        <div className="flex items-end space-x-3 max-w-2xl">
          <div className="flex flex-col items-end space-y-2">
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
              <ReactMarkdown 
                components={{
                  p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                  em: ({children}) => <em className="italic">{children}</em>,
                  code: ({children}) => <code className="bg-primary-foreground/20 px-1 py-0.5 rounded text-xs">{children}</code>,
                  pre: ({children}) => <pre className="bg-primary-foreground/20 p-2 rounded text-xs overflow-x-auto">{children}</pre>,
                  ul: ({children}) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                  li: ({children}) => <li className="text-sm">{children}</li>,
                  blockquote: ({children}) => <blockquote className="border-l-4 border-primary-foreground/30 pl-3 italic">{children}</blockquote>,
                  h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                  h2: ({children}) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                  h3: ({children}) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </div>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">
              {user?.pseudonyme?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="flex items-start space-x-3 max-w-2xl">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white border-2 border-gray-200">
          <img 
            src="/logo_schwing_stetter_transparent.png" 
            alt="Adam - Expert Odoo" 
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold hidden">
            AS
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-semibold text-foreground">Adam</span>
            <Badge variant="secondary" className="text-xs rounded-xl">
              Expert Odoo
            </Badge>
          </div>
          <div className={`bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-border ${
            message.isError ? 'border-destructive bg-destructive/10' : ''
          } ${
            message.isLoading ? 'animate-pulse' : ''
          }`}>
            <ReactMarkdown 
              components={{
                p: ({children}) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                em: ({children}) => <em className="italic">{children}</em>,
                code: ({children}) => <code className="bg-background px-2 py-1 rounded-lg text-xs font-mono">{children}</code>,
                pre: ({children}) => <pre className="bg-background p-3 rounded-xl text-xs overflow-x-auto font-mono">{children}</pre>,
                ul: ({children}) => <ul className="list-disc list-inside space-y-2 ml-4 mb-3">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-inside space-y-2 ml-4 mb-3">{children}</ol>,
                li: ({children}) => <li className="text-sm leading-relaxed">{children}</li>,
                blockquote: ({children}) => <blockquote className="border-l-4 border-primary/30 pl-4 italic bg-background/50 py-2 rounded-r-lg mb-3">{children}</blockquote>,
                h1: ({children}) => <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                h2: ({children}) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({children}) => <h3 className="text-sm font-semibold mb-2 mt-2 first:mt-0">{children}</h3>,
                br: () => <br className="mb-2" />,
              }}
              skipHtml={false}
            >
              {message.text}
            </ReactMarkdown>
            
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center text-xs text-muted-foreground hover:text-foreground p-0 h-auto font-medium mb-2"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span>Sources de documentation ({message.sources.length})</span>
                  {showSources ? (
                    <ChevronUp className="w-4 h-4 ml-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-2" />
                  )}
                </Button>
                
                {showSources && (
                  <div className="space-y-2 mt-2">
                    {message.sources.map((source, index) => (
                      <div key={index} className="p-3 bg-background rounded-2xl border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-xs font-medium text-foreground">
                              {source.title}
                            </h4>
                            {source.section && (
                              <Badge variant="secondary" className="text-xs mt-1 rounded-xl">
                                {source.section}
                              </Badge>
                            )}
                            {source.excerpt && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {source.excerpt}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="w-3 h-3 text-muted-foreground ml-2 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {message.contextUsed && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs rounded-xl">
                  Basé sur la documentation Odoo
                </Badge>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;