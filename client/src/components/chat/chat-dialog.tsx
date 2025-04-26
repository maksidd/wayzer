import { useState, useRef, useEffect } from 'react';
import { useParams } from 'wouter';
import { useTranslation } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocketChat } from '@/hooks/use-chat';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Send, X, Info, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ChatDialogProps {
  routeId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatDialog({ routeId, isOpen, onClose }: ChatDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch route details
  const { data: routeDetails, isLoading: isLoadingRoute } = useQuery({
    queryKey: ['/api/routes', routeId],
    queryFn: async () => {
      if (!routeId) return null;
      const res = await fetch(`/api/routes/${routeId}`);
      if (!res.ok) throw new Error('Failed to fetch route details');
      return res.json();
    },
    enabled: !!routeId && isOpen
  });
  
  // Set up websocket chat
  const { messages, isConnected, isConnecting, sendMessage } = useWebSocketChat({
    routeId: routeId || 0
  });
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && sendMessage(messageText.trim())) {
      setMessageText('');
    }
  };
  
  const formatTime = (date: Date) => {
    return format(new Date(date), 'HH:mm');
  };
  
  if (!routeId) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-xl h-[80vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b">
          {isLoadingRoute ? (
            <div className="flex items-center">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              <span>{t('chat.loading')}</span>
            </div>
          ) : (
            <>
              <DialogTitle className="text-lg">{routeDetails?.title}</DialogTitle>
              <DialogDescription className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-1" />
                <span>
                  {routeDetails?.participantCount} / {routeDetails?.maxParticipants} {t('chat.participants')}
                </span>
              </DialogDescription>
            </>
          )}
        </DialogHeader>
        
        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && !isConnecting && (
              <div className="text-center py-8">
                <Info className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">{t('chat.no_messages')}</p>
                <p className="text-sm text-gray-400">{t('chat.start_conversation')}</p>
              </div>
            )}
            
            {isConnecting && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
            
            {messages.map((message, index) => {
              if ('type' in message && message.type === 'system') {
                return (
                  <div key={index} className="text-center">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                      {message.content}
                    </span>
                  </div>
                );
              }
              
              const isCurrentUser = message.userId === user?.id;
              
              return (
                <div 
                  key={index} 
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} max-w-[80%]`}>
                    {!isCurrentUser && (
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={message.user?.avatar || ''} />
                        <AvatarFallback>
                          {message.user?.username.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                      {!isCurrentUser && (
                        <span className="text-xs text-gray-500 mb-1">{message.user?.username}</span>
                      )}
                      
                      <div 
                        className={`rounded-lg px-3 py-2 ${
                          isCurrentUser 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      
                      <span className="text-xs text-gray-400 mt-1">
                        {formatTime(message.sentAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Input Form */}
        <div className="px-4 py-3 border-t">
          <form onSubmit={handleSubmit} className="flex">
            <Input
              type="text"
              placeholder={isConnected ? t('chat.type_message') : t('chat.connecting')}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              disabled={!isConnected}
              className="mr-2"
            />
            <Button 
              type="submit" 
              disabled={!isConnected || !messageText.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
