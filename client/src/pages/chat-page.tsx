import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-language';
import { useQuery } from '@tanstack/react-query';
import { RouteMember } from '@shared/schema';
import Header from '@/components/layout/header';
import MobileTabs from '@/components/layout/mobile-tabs';
import { useWebSocketChat } from '@/hooks/use-chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Search, Users, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ChatConversation {
  routeId: number;
  title: string;
  lastMessage?: {
    content: string;
    timestamp: Date;
  };
  participantCount: number;
}

export default function ChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch user's conversations
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['/api/routes/chats'],
    queryFn: async () => {
      const res = await fetch('/api/routes/chats');
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return res.json();
    },
  });

  // Fetch active route details
  const { data: activeRoute, isLoading: isLoadingRoute } = useQuery({
    queryKey: ['/api/routes', activeRouteId],
    queryFn: async () => {
      if (!activeRouteId) return null;
      const res = await fetch(`/api/routes/${activeRouteId}`);
      if (!res.ok) throw new Error('Failed to fetch route details');
      return res.json();
    },
    enabled: !!activeRouteId,
  });

  // Set up websocket chat
  const { messages, isConnected, isConnecting, sendMessage } = useWebSocketChat({
    routeId: activeRouteId || 0
  });

  // Handle selecting a conversation
  const handleSelectConversation = (routeId: number) => {
    setActiveRouteId(routeId);
  };

  // Handle sending a message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && sendMessage(messageText.trim())) {
      setMessageText('');
    }
  };

  // Filter conversations by search query
  const filteredConversations = searchQuery
    ? conversations?.filter((conv: ChatConversation) => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  // Format timestamp
  const formatMessageTime = (date: Date) => {
    return format(new Date(date), 'HH:mm');
  };

  // Get user initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="container mx-auto flex-1 p-4">
        <div className="bg-white rounded-lg shadow overflow-hidden max-w-6xl mx-auto flex h-[calc(100vh-14rem)]">
          {/* Left Side - Conversation List */}
          <div className="w-full md:w-1/3 border-r">
            <div className="p-4 border-b">
              <h2 className="font-bold text-lg mb-4">{t('chat.conversations')}</h2>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={t('chat.search_chats')}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Search className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <ScrollArea className="h-[calc(100%-4.5rem)]">
              {isLoadingConversations ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredConversations && filteredConversations.length > 0 ? (
                filteredConversations.map((conv: ChatConversation) => (
                  <div
                    key={conv.routeId}
                    className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                      activeRouteId === conv.routeId ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => handleSelectConversation(conv.routeId)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">{conv.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {conv.participantCount}
                      </Badge>
                    </div>
                    {conv.lastMessage ? (
                      <>
                        <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                          {conv.lastMessage.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(conv.lastMessage.timestamp), 'MMM d, HH:mm')}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">{t('chat.no_messages')}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('chat.no_conversations')}</p>
                  <p className="text-sm text-gray-400 mt-2">{t('chat.join_routes')}</p>
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Right Side - Chat Messages */}
          <div className="hidden md:flex md:w-2/3 flex-col">
            {activeRouteId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex justify-between items-center">
                  {isLoadingRoute ? (
                    <div className="flex items-center">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      <span>{t('chat.loading')}</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h2 className="font-bold text-lg">{activeRoute?.title}</h2>
                        <p className="text-sm text-gray-500">
                          {activeRoute?.participantCount} / {activeRoute?.maxParticipants} {t('chat.participants')}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {t(`route_types.${activeRoute?.routeType}`)}
                      </Badge>
                    </>
                  )}
                </div>
                
                {/* Chat Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && !isConnecting && (
                      <div className="text-center py-8">
                        <MessageCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
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
                                  {getInitials(message.user?.username || 'U')}
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
                                {formatMessageTime(message.sentAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                
                {/* Input Form */}
                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex">
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
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-8">
                <div className="max-w-md">
                  <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-800 mb-2">{t('chat.select_conversation')}</h3>
                  <p className="text-gray-500">{t('chat.select_conversation_desc')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <MobileTabs />
    </div>
  );
}
