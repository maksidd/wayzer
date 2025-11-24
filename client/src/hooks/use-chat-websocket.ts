import { useEffect, useRef } from 'react';

interface UseChatWebSocketOptions {
  onNewMessage: (data: { chatId: string; message: any }) => void;
  onAnyMessage: (data: { chatId: string; message: any }) => void;
}

export function useChatWebSocket({ onNewMessage, onAnyMessage }: UseChatWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);

  // Monitor token
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  useEffect(() => {
    if (!accessToken) return;

    const wsUrl = window.location.protocol === 'https:'
      ? `wss://${window.location.host}/ws`
      : `ws://${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token: accessToken }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'forced_logout') {
          localStorage.removeItem('accessToken');
          window.location.href = '/auth?blocked=1';
          return;
        }
        if (data.type === 'new_message' && data.message) {
          onAnyMessage({ chatId: data.message.chatId || data.message.tripId || '', message: data.message });
          if (onNewMessage) {
            onNewMessage({ chatId: data.message.chatId || data.message.tripId || '', message: data.message });
          }
          window.dispatchEvent(new CustomEvent('incoming-message', { detail: data }));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('WebSocket message parse error:', err);
      }
    };

    ws.onerror = (err) => {
      // In development mode with React StrictMode, effects run twice
      // This causes the WebSocket to be closed immediately, which is expected
      // Only log errors that are not related to StrictMode cleanup
      if (ws.readyState !== WebSocket.CLOSED) {
        // eslint-disable-next-line no-console
        console.error('WebSocket error:', err);
      }
    };

    ws.onclose = () => {
      // Suppress "closed before connection" errors in development
      // These are expected due to React StrictMode double-mounting
      if (import.meta.env.DEV && ws.readyState === WebSocket.CONNECTING) {
        // Expected: StrictMode cleanup
        return;
      }
      // eslint-disable-next-line no-console
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, [accessToken, onNewMessage, onAnyMessage]);
} 