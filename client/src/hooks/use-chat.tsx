import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { Message } from '@shared/schema';
import { useTranslation } from './use-language';

type ChatMessage = Message & {
  user?: {
    id: number;
    username: string;
    avatar?: string;
  } | null;
};

type SystemMessage = {
  type: 'system';
  content: string;
  sentAt: Date;
};

type UseWebSocketChatProps = {
  routeId: number;
};

export const useWebSocketChat = ({ routeId }: UseWebSocketChatProps) => {
  const [messages, setMessages] = useState<(ChatMessage | SystemMessage)[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const { t } = useTranslation();

  // Connect to websocket
  const connect = useCallback(() => {
    if (!user || !routeId || isConnecting || isConnected) return;

    setIsConnecting(true);
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      
      // Join the chat room
      socket.send(JSON.stringify({
        type: 'join',
        userId: user.id,
        routeId: routeId
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'history') {
        setMessages(data.messages);
      } 
      else if (data.type === 'message') {
        setMessages(prev => [...prev, data.message]);
      }
      else if (data.type === 'system') {
        setMessages(prev => [
          ...prev, 
          { 
            type: 'system', 
            content: data.content,
            sentAt: new Date()
          }
        ]);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      
      // Add system message that connection was lost
      setMessages(prev => [
        ...prev, 
        { 
          type: 'system', 
          content: t('chat.connection_lost'),
          sentAt: new Date()
        }
      ]);
      
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        connect();
      }, 3000);
    };

    socket.onerror = () => {
      toast({
        title: t('chat.connection_error'),
        description: t('chat.connection_error_description'),
        variant: "destructive",
      });
      
      socket.close();
    };
    
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user, routeId, isConnected, isConnecting, toast, t]);

  // Send a message
  const sendMessage = useCallback((content: string) => {
    if (!isConnected || !socketRef.current || !content.trim()) {
      return false;
    }
    
    socketRef.current.send(JSON.stringify({
      type: 'message',
      content
    }));
    
    return true;
  }, [isConnected]);

  // Connect when component mounts and user is logged in
  useEffect(() => {
    connect();
    
    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return {
    messages,
    isConnected,
    isConnecting,
    sendMessage,
    connect
  };
};
