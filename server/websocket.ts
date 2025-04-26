import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { storage } from "./storage";
import { InsertMessage } from "@shared/schema";

type Client = {
  ws: WebSocket;
  userId: number;
  routeId: number;
};

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  const clients: Client[] = [];

  wss.on('connection', (ws) => {
    let client: Client | undefined;

    ws.on('message', async (messageBuffer) => {
      try {
        const messageData = JSON.parse(messageBuffer.toString());
        
        if (messageData.type === 'join') {
          // User joining a chat room
          client = {
            ws,
            userId: messageData.userId,
            routeId: messageData.routeId
          };
          
          clients.push(client);
          
          // Send the last 50 messages from the chat
          const messages = await storage.getMessages(messageData.routeId);
          const lastMessages = messages.slice(Math.max(0, messages.length - 50));
          
          ws.send(JSON.stringify({
            type: 'history',
            messages: lastMessages
          }));
          
          // Notify about a new user joining
          broadcastToRoom(messageData.routeId, {
            type: 'system',
            content: 'A new user has joined the chat'
          });
        }
        else if (messageData.type === 'message' && client) {
          // Save the message to the database
          const messageToSave: InsertMessage = {
            routeId: client.routeId,
            userId: client.userId,
            content: messageData.content
          };
          
          const savedMessage = await storage.createMessage(messageToSave);
          
          // Broadcast to all clients in the same room
          broadcastToRoom(client.routeId, {
            type: 'message',
            message: savedMessage
          });
        }
      } catch (error) {
        console.error('Error processing websocket message:', error);
      }
    });

    ws.on('close', () => {
      if (client) {
        // Remove from clients array
        const index = clients.findIndex(c => c.ws === ws);
        if (index !== -1) {
          clients.splice(index, 1);
        }
        
        // Broadcast user leaving
        broadcastToRoom(client.routeId, {
          type: 'system',
          content: 'A user has left the chat'
        });
      }
    });
  });

  function broadcastToRoom(routeId: number, message: any) {
    const roomClients = clients.filter(client => client.routeId === routeId);
    
    roomClients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  return wss;
}
