import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, MessageSquare, Check, X, Paperclip } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { ChatConversation, MessageWithUsers } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { TripCard } from "@/components/trip-card";
import { MapPin, Users, User, Circle, Car, Plane, Bike, PersonStanding, Ship, Mountain, Landmark, Wind, Utensils, TreePine, PartyPopper, Flower2, Squirrel } from "lucide-react";
import React from "react";

function formatSmartDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today
    return format(date, 'HH:mm');
  } else if (diffDays === 1) {
    return `yesterday, ${format(date, 'HH:mm')}`;
  } else if (diffDays === 2) {
    return `2 days ago, ${format(date, 'HH:mm')}`;
  } else {
    return format(date, 'dd.MM.yyyy HH:mm');
  }
}
import { TripDetailModal } from "@/components/trip-detail-modal";
import { ConversationItem } from "@/components/conversation-item";
import { UserProfileModal } from "@/components/user-profile-modal";

// transportIcons and transportNames from trips.tsx:
const transportIcons: Record<string, any> = {
  car: Car,
  plane: Plane,
  bike: Bike,
  walk: PersonStanding,
  scooter: Bike,
  monowheel: Circle,
  motorcycle: Wind,
  sea: Ship,
  mountains: Mountain,
  sights: Landmark,
  fest: Users,
  picnic: Utensils,
  camping: TreePine,
  party: PartyPopper,
  retreat: Flower2,
  pets: Squirrel,
  other: Circle,
};
const transportNames = {
  car: "Car",
  plane: "Plane",
  bike: "Bicycle",
  walk: "Walk",
  scooter: "Scooter",
  monowheel: "Monowheel",
  motorcycle: "Motorcycle",
  sea: "Sea",
  mountains: "Mountains",
  sights: "Sights",
  other: "Other",
} as const;
const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

export default function Messages() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null); // chatId
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // otherUserId for private
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const messageText = selectedKey ? drafts[selectedKey] ?? "" : "";
  const { toast } = useToast();
  const [location] = useLocation();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  // To store chat id where new message arrived
  const [incomingChatId, setIncomingChatId] = useState<string | null>(null);

  // Get current user data
  const { data: user, isLoading: userLoading, error: userError } = useQuery<any>({
    queryKey: ['/api/users/me'],
    retry: 1,
  });

  // New REST: conversations2
  const { data: convObj = { requested: [], private: [], public: [], archived: [] },
          isLoading: conversationsLoading,
          refetch: refetchConversations } = useQuery({
    queryKey: ['/api/messages/conversations2'],
    queryFn: () => apiRequest('/api/messages/conversations2').then(r=>r.json()),
    staleTime: 5 * 1000,
    enabled: !!user,
  });

  // Convert to array for existing UI logic
  const mapConv = (it: any): ChatConversation & { chatId: string; otherUserId?: string } => {
    const isPrivate = (it.type || it.source?.type) === 'private';
    let userId = null;
    if (isPrivate) {
      userId = it.otherUserId || it.source?.otherUserId;
      if (!userId && (it.users || it.participants) && user) {
        const arr = it.users || it.participants;
        userId = Array.isArray(arr) ? arr.find((id: string) => id !== user.id) : null;
      }
    }
    return {
      ...it,
      chatId: it.chatId ?? it.chat_id ?? it.source?.chatId ?? it.source?.chat_id,
      otherUserId: userId,
      otherUser: {
        id: userId,
        name: it.source.name,
        avatarUrl: it.source.avatarUrl ?? it.source.photoUrl ?? null,
        avatarThumbnailUrl: it.source.avatarThumbnailUrl ?? null,
      },
      tripId: it.source.type === 'public' ? it.source.tripId : null,
      type: it.source?.type || it.type, // <--- added
    };
  };

  function sortByLastMessage(arr: any[]) {
    return [...arr].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  // While WS doesn't return chatId, use REST conversations2
  const groupedConversations = useMemo(() => ({
    newChats: sortByLastMessage(convObj.requested.map(mapConv)),
    privateChats: sortByLastMessage(convObj.private.map(mapConv)),
    groupChats: sortByLastMessage(convObj.public.map(mapConv)),
    archivedChats: sortByLastMessage(convObj.archived.map(mapConv)),
  }), [convObj]);

  const conversations = [
    ...groupedConversations.newChats,
    ...groupedConversations.privateChats,
    ...groupedConversations.groupChats,
    ...groupedConversations.archivedChats,
  ];

  // Sort chats by last message date (newest first)
  const sortedConversations = [...conversations].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  const selectedConversation = conversations.find(c => c.chatId === selectedKey);

  // If chat list is empty and WebSocket is already connected, try manually calling REST
  useEffect(() => {
    if (conversations.length === 0 && user) {
      refetchConversations();
    }
  }, [conversations.length, user]);

  // Ref for automatic scroll to bottom
  const bottomRef = useRef<HTMLDivElement>(null);
  // Ref for the message input, to preserve focus after sending
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Trip modal
  const [tripModalId, setTripModalId] = useState<string | null>(null);

  // Handle direct chat links
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const chatUserId = urlParams.get('chat');
    if (chatUserId) {
      setSelectedUserId(chatUserId);
    }
  }, [location]);

  // Load messages for selected chat via new endpoint
  const { data: messages = [], isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: selectedChatId ? [`/api/messages2/${selectedChatId}`] : [],
    queryFn: () => selectedChatId
      ? apiRequest(`/api/messages2/${selectedChatId}`).then((r) => r.json())
      : Promise.resolve([]),
    enabled: !!selectedChatId,
  });

  // Get user's trips to identify trip requests
  const { data: userTrips = [] } = useQuery<any[]>({
    queryKey: ['/api/trips'],
    queryFn: () => apiRequest('/api/trips').then(res => res.json()),
    enabled: !!user,
  });

  // Collect all tripId from original messages array (before filtering) to avoid TDZ
  const requestTripIds = useMemo(() =>
    messages.filter((m: any) => m.type === 'request' && m.tripId).map((m: any) => m.tripId),
    [messages]
  );
  const uniqueTripIds = Array.from(new Set(requestTripIds));
  const tripQueries = useQueries({
    queries: uniqueTripIds.map(tripId => ({
      queryKey: ["/api/trips/", tripId],
      queryFn: async () => {
        const resp = await fetch(`/api/trips/${tripId}`);
        if (!resp.ok) return null;
        return resp.json();
      },
    }))
  });
  const tripMap = useMemo(() => {
    const map: Record<string, any> = {};
    uniqueTripIds.forEach((tripId, i) => {
      map[tripId] = tripQueries[i]?.data;
    });
    return map;
  }, [uniqueTripIds, tripQueries]);
  const { data: tripTypes = [] } = useQuery({
    queryKey: ["/api/trip-types"],
    queryFn: async () => {
      const resp = await fetch("/api/trip-types");
      if (!resp.ok) return [];
      return resp.json();
    },
  });
  const { data: favoriteTrips = [] } = useQuery({
    queryKey: ["/api/favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const resp = await fetch('/api/favorites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}` || ''
        }
      });
      return resp.json();
    }
  });

  // --- Form displayed messages list (without yellow system bubble) ---
  const displayedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return messages;

    // For private chats we can filter by selected trip
    if (selectedUserId) {
      return selectedTripId ? messages.filter((m: any) => (m.tripId ?? null) === selectedTripId) : messages;
    }

    return messages; // group chats
  }, [messages, selectedTripId, selectedUserId]);

  // Scroll down on message change (new message or sending own)
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages.length, selectedChatId]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { chatId: string; text: string }) => {
      const response = await apiRequest('/api/messages2', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: [`/api/messages2/${selectedChatId}`] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData([`/api/messages2/${selectedChatId}`]);

      // Optimistically update messages
      if (previousMessages && user && selectedConversation) {
        const optimisticMessage: MessageWithUsers = {
          id: 'temp-' + Date.now(),
          text: newMessage.text,
          senderId: user.id,
          // for private chat can add receiver field if desired
          tripId: selectedTripId ?? null,
          createdAt: new Date().toISOString(),
          sender: {
            id: user.id,
            name: user.name,
            avatarUrl: (user as any).avatarUrl || null,
            avatarThumbnailUrl: (user as any).avatarThumbnailUrl || null,
          },
          receiver: selectedConversation.otherUser ? {
            id: selectedConversation.otherUser.id,
            name: selectedConversation.otherUser.name,
            avatarUrl: selectedConversation.otherUser.avatarUrl || null,
            avatarThumbnailUrl: (selectedConversation.otherUser as any).avatarThumbnailUrl || null,
          } : ({} as any)
        } as any;
        
        queryClient.setQueryData([`/api/messages2/${selectedChatId}`], [...(previousMessages as MessageWithUsers[]), optimisticMessage]);
      }

      // Return a context object with the snapshotted value
      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData([`/api/messages2/${selectedChatId}`], context.previousMessages);
      }
      
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
    onSuccess: (createdMessage: MessageWithUsers) => {
      // Clear draft for current dialog
      if (selectedKey) {
        setDrafts((prev) => ({ ...prev, [selectedKey]: "" }));
      }

      // Dispatch event so useWebSocket updates dialog list (for sender)
      if (createdMessage && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('incoming-message', { detail: createdMessage }));
      }
      // After sending own message update badge and scroll down
      // updateHeaderUnreadBadge(); // REMOVED
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    },
    onSettled: () => {
      // Only invalidate messages, conversations are now reactive
      queryClient.invalidateQueries({ queryKey: [`/api/messages2/${selectedChatId}`] });
    },
  });

  // Trip request mutations
  const acceptTripRequestMutation = useMutation({
    mutationFn: async ({ tripId, userId }: { tripId: string; userId: string }) => {
      return apiRequest(`/api/trips/${tripId}/accept/${userId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request accepted",
      });
      // Update messages in current chat
      queryClient.invalidateQueries({ queryKey: [`/api/messages2/${selectedChatId}`] });
      // Update chat list
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations2'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept request",
        variant: "destructive",
      });
    },
  });

  const rejectTripRequestMutation = useMutation({
    mutationFn: async ({ tripId, userId }: { tripId: string; userId: string }) => {
      return apiRequest(`/api/trips/${tripId}/reject/${userId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request rejected",
      });
      // Update messages in current chat
      queryClient.invalidateQueries({ queryKey: [`/api/messages2/${selectedChatId}`] });
      // Update chat list
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations2'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    if (!selectedChatId || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({ chatId: selectedChatId, text: messageText });
  };

  const handleAcceptRequest = async (tripId: string, userId: string) => {
    try {
      await apiRequest(`/api/trips/${tripId}/accept/${userId}`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: [`/api/messages2/${selectedChatId}`] });
      // Update participant status
      queryClient.invalidateQueries({ queryKey: ["/api/trips/", tripId, "status", userId] });
      toast({ title: 'Request accepted', description: 'User added to participants' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to accept request' });
    }
  };
  const handleRejectRequest = async (tripId: string, userId: string) => {
    try {
      await apiRequest(`/api/trips/${tripId}/reject/${userId}`, { method: 'POST' });
      
      queryClient.invalidateQueries({ queryKey: [`/api/messages2/${selectedChatId}`] });
      // Update participant status
      queryClient.invalidateQueries({ queryKey: ["/api/trips/", tripId, "status", userId] });
      toast({ title: 'Request rejected' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to reject request' });
    }
  };


  // Redirect to /auth when user is not logged in and loading is complete
  useEffect(() => {
    if (!userLoading && !user) {
      window.location.replace('/auth');
    }
  }, [userLoading, user]);

  // Handle conversation selection
  const handleConversationSelect = async (chatId: string, otherId: string | null, tripId: string | null, unreadCount: number) => {
    setSelectedKey(chatId);
    setSelectedChatId(chatId);
    const isGroup = !!tripId;
    setSelectedUserId(isGroup ? null : otherId);
    setSelectedTripId(tripId);

    // Force load messages for selected chat
    queryClient.invalidateQueries({ queryKey: [`/api/messages2/${chatId}`] });

    // If there are unread — mark only this chat
    if (unreadCount > 0) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch(`/api/messages/mark-unread?chatId=${chatId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations2'] });
      }
    }
  };

  // Universal message formatter
  function formatMessage(raw: any): MessageWithUsers {
    return {
      id: raw.id,
      chatId: raw.chatId,
      senderId: raw.senderId,
      text: raw.text,
      type: raw.type,
      tripId: raw.tripId ?? null,
      createdAt: raw.createdAt,
      sender: raw.sender
        ? {
            id: raw.sender.id,
            name: raw.sender.name || 'System',
            avatarUrl: raw.sender.avatarUrl,
            avatarThumbnailUrl: raw.sender.avatarThumbnailUrl,
          }
        : null,
    };
  }

  /**
   * Global listener for `incoming-message` event dispatched by useWebSocket.
   * Handles incoming messages and updates chat list.
   */
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<any>).detail;
      const chatIdFromMsg = msg.chatId || msg.message?.chatId;

      // Update chat list for all incoming messages
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations2'] });

      if (selectedChatId && chatIdFromMsg === selectedChatId) {
        // Don't add message to cache!
        // Just force update messages and chats
        queryClient.invalidateQueries({ queryKey: [`/api/messages2/${selectedChatId}`] });

        // Immediately mark chat as read
        const token = localStorage.getItem('accessToken');
        if (token) {
          fetch(`/api/messages/mark-unread?chatId=${selectedChatId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations2'] });
            queryClient.invalidateQueries({ queryKey: [`/api/messages2/${selectedChatId}`] });
          });
        }
      }
    };
    window.addEventListener('incoming-message', handler as EventListener);
    return () => window.removeEventListener('incoming-message', handler as EventListener);
  }, [selectedChatId]);



  // Keep focus on the input once the message has been sent (mutation finished)
  useEffect(() => {
    if (!sendMessageMutation.isPending) {
      inputRef.current?.focus();
    }
  }, [sendMessageMutation.isPending]);

  // Scroll down on receiving new message in open chat
  useEffect(() => {
    if (!selectedChatId) return;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === `/api/messages2/${selectedChatId}` && event.type === 'updated') {
        // Scroll down
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }
    });
    return () => unsubscribe();
  }, [selectedChatId]);

  // Collect tripId-senderId pairs to check participant status
  const requestPairs = useMemo(() =>
    messages.filter((m: any) => m.type === 'request' && m.tripId && m.senderId)
      .map((m: any) => ({ tripId: m.tripId, senderId: m.senderId })),
    [messages]
  );

  // useQueries to check each participant status
  const statusQueries = useQueries({
    queries: requestPairs.map(pair => ({
      queryKey: ["/api/trips/", pair.tripId, "status", pair.senderId],
      queryFn: async () => {
        const resp = await fetch(`/api/trips/${pair.tripId}/status/${pair.senderId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return { tripId: pair.tripId, senderId: pair.senderId, status: data.status };
      },
    }))
  });

  // Create status map: tripId-senderId -> status
  const statusMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    requestPairs.forEach((pair, i) => {
      const key = `${pair.tripId}-${pair.senderId}`;
      map[key] = statusQueries[i]?.data?.status || null;
    });
    return map;
  }, [requestPairs, statusQueries]);

  // Show loading
  if (userLoading || conversationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-4 flex items-center justify-center h-[calc(100vh-5rem)]">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error
  if (userError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-4 flex items-center justify-center h-[calc(100vh-5rem)]">
          <div className="text-center">
            <p className="text-lg text-red-500 mb-4">You must be logged in</p>
            <Button onClick={() => window.location.href = '/auth'}>
              Log in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main interface
  return (
    <div className="bg-gray-50 dark:bg-gray-900 overflow-y-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Chat list */}
          <Card className="h-[calc(100vh-8rem)] overflow-hidden w-1/3 min-w-[220px] max-w-xs">
            <CardHeader className="p-4">
              <h2 className="text-lg font-semibold">Chats</h2>
            </CardHeader>
            <ScrollArea className="h-full">
              <CardContent className="p-2 space-y-4">
                {/* New requests */}
                {groupedConversations.newChats.length > 0 && (
                  <div>
                    <h3 className="px-2 py-1 text-sm font-medium text-muted-foreground">New requests</h3>
                    {groupedConversations.newChats.map((conversation:any) => (
                      <ConversationItem
                        key={conversation.chatId}
                        conversation={conversation}
                        isSelected={selectedKey === conversation.chatId}
                        onClick={() => handleConversationSelect(
                          conversation.chatId,
                          conversation.otherUser.id,
                          conversation.tripId ?? null,
                          conversation.unreadCount
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Group chats */}
                {groupedConversations.groupChats.length > 0 && (
                  <div>
                    <h3 className="px-2 py-1 text-sm font-medium text-muted-foreground">Group chats</h3>
                    {groupedConversations.groupChats.map((conversation:any) => (
                      <ConversationItem
                        key={conversation.chatId}
                        conversation={conversation}
                        isSelected={selectedKey === conversation.chatId}
                        onClick={() => handleConversationSelect(
                          conversation.chatId,
                          conversation.otherUser.id,
                          conversation.tripId ?? null,
                          conversation.unreadCount
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Private chats */}
                {groupedConversations.privateChats.length > 0 && (
                  <div>
                    <h3 className="px-2 py-1 text-sm font-medium text-muted-foreground">Private chats</h3>
                    {groupedConversations.privateChats.map((conversation:any) => (
                      <ConversationItem
                        key={conversation.chatId}
                        conversation={conversation}
                        isSelected={selectedKey === conversation.chatId}
                        onClick={() => handleConversationSelect(
                          conversation.chatId,
                          conversation.otherUser.id,
                          conversation.tripId ?? null,
                          conversation.unreadCount
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Archived chats */}
                {groupedConversations.archivedChats.length > 0 && (
                  <div>
                    <h3 className="px-2 py-1 text-sm font-medium text-muted-foreground">Archived chats</h3>
                    {groupedConversations.archivedChats.map((conversation:any) => (
                      <ConversationItem
                        key={conversation.chatId}
                        conversation={conversation}
                        isSelected={selectedKey === conversation.chatId}
                        onClick={() => handleConversationSelect(
                          conversation.chatId,
                          conversation.otherUser.id,
                          conversation.tripId ?? null,
                          conversation.unreadCount
                        )}
                      />
                    ))}
                  </div>
                )}

                {conversations.length === 0 && (
                  <div className="text-center text-muted-foreground p-4">
                    You have no messages yet
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>

          {/* Messages area */}
          <Card className="h-[calc(100vh-8rem)] overflow-hidden w-2/3">
            {selectedConversation ? (
              <>
                <CardHeader className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="h-10 w-10 cursor-pointer"
                      onClick={() => {
                        if (selectedConversation.otherUser.id) {
                          setProfileUserId(selectedConversation.otherUser.id);
                        } else {
                          toast({
                            title: "Profile unavailable",
                            description: "Could not determine user for this chat.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <AvatarImage src={selectedConversation.otherUser.avatarUrl || undefined} alt={selectedConversation.otherUser.name} />
                      <AvatarFallback>
                        {selectedConversation.otherUser.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-semibold">
                      {selectedConversation.otherUser.name}
                    </h3>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="p-0 flex flex-col h-[calc(100vh-200px)]">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4 min-h-0 h-full">
                    {messagesLoading ? (
                      <div className="text-center text-muted-foreground">
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-muted-foreground">
                        Start a conversation!
                      </div>
                    ) : (
                      <div className="space-y-4 flex-1">
                        {displayedMessages.map((message) => {
                          // System message (sender is null)
                          if (!(message as any).sender) {
                            const sys = message as any;
                            const isYellow = sys.type === 'yellow';
                            const isGreen = sys.type === 'green';
                            const isRed = sys.type === 'red';
                            
                            let bgColor = 'bg-gray-200 text-gray-800';
                            if (isYellow) bgColor = 'bg-yellow-200 text-yellow-900';
                            else if (isGreen) bgColor = 'bg-green-200 text-green-900';
                            else if (isRed) bgColor = 'bg-red-200 text-red-900';
                            
                            return (
                              <div key={sys.id} className="flex justify-center">
                                <div className={`max-w-[80%] p-2 rounded-lg text-center ${bgColor}`}>
                                  <span>{sys.text}</span>
                                </div>
                              </div>
                            );
                          }

                          const isOwn = message.senderId === user?.id;
                          const isGroup = !!selectedConversation?.tripId;
                          // INSERT ROUTE CARD BEFORE request
                          if (message.type === 'request' && message.tripId) {
                            const trip = tripMap[message.tripId];
                            if (trip) {
                              const typeObj = tripTypes.find((t: any) => t.id === trip.type);
                              const TypeIcon = (typeObj && transportIcons[typeObj.id as keyof typeof transportIcons]) || transportIcons[trip.type as keyof typeof transportIcons] || Circle;
                              const typeName = typeObj?.name || transportNames[trip.type as keyof typeof transportNames] || trip.type;
                              const isFavorite = favoriteTrips?.some((f: any) => (f.id ?? f) === trip.id);
                              return (
                                <React.Fragment key={message.id + "-trip"}>
                                  <div className="mb-2">
                                    <TripCard
                                      trip={trip}
                                      isFavorite={isFavorite}
                                      typeName={typeName}
                                      TypeIcon={TypeIcon}
                                      getInitials={getInitials}
                                      onClick={() => setTripModalId(trip.id)}
                                      handleProfileClick={(e: any) => { e.stopPropagation(); setProfileUserId(trip.creator.id); }}
                                    />
                                  </div>
                                  {/* Accept / Reject buttons block */}
                                  {trip.creator.id === user?.id && (
                                    <div className="flex gap-2 mb-2">
                                      {(() => {
                                        const statusKey = `${trip.id}-${message.senderId}`;
                                        const currentStatus = statusMap[statusKey];
                                        const isDisabled = currentStatus === 'approved' || currentStatus === 'rejected';
                                        
                                        return (
                                          <>
                                            <Button 
                                              variant="destructive" 
                                              disabled={isDisabled}
                                              onClick={() => handleRejectRequest(trip.id, message.senderId)}
                                            >
                                              Reject
                                            </Button>
                                            <Button 
                                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400" 
                                              disabled={isDisabled}
                                              onClick={() => handleAcceptRequest(trip.id, message.senderId)}
                                            >
                                              Accept
                                            </Button>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                  {/* Regular message render below */}
                                  <div
                                    key={message.id}
                                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end`}
                                  >
                                    {/* Avatar only for group chats and others' messages */}
                                    {isGroup && !isOwn && message.sender && (
                                      <Avatar
                                        className="h-8 w-8 mr-2 cursor-pointer"
                                        onClick={() => message.sender?.id && setProfileUserId(message.sender.id)}
                                        tabIndex={0}
                                        aria-label={message.sender?.name ? `Open profile ${message.sender.name}` : 'Open profile'}
                                        onKeyDown={e => { if (e.key === 'Enter' && message.sender?.id) setProfileUserId(message.sender.id); }}
                                      >
                                        <AvatarImage src={message.sender.avatarUrl || undefined} alt={message.sender.name} />
                                        <AvatarFallback>
                                          {message.sender.name?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                    <div
                                      className={`max-w-[70%] p-3 rounded-lg ${
                                        isOwn
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-muted-foreground'
                                      }`}
                                    >
                                      {/* Sender name for group chats and others' messages */}
                                      {isGroup && !isOwn && message.sender?.name && (
                                        <div className="text-xs mb-1 opacity-80">
                                          {message.sender.name}
                                        </div>
                                      )}
                                      <pre className="whitespace-pre-wrap break-words font-sans text-sm">{message.text}</pre>
                                      {/* Message date and time */}
                                      {message.createdAt && (
                                        <div className={`text-xs mt-2 opacity-70 text-right`}>
                                          {formatSmartDate(message.createdAt)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            }
                          }
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end`}
                            >
                              {/* Avatar only for group chats and others' messages */}
                              {isGroup && !isOwn && message.sender && (
                                <Avatar
                                  className="h-8 w-8 mr-2 cursor-pointer"
                                  onClick={() => message.sender?.id && setProfileUserId(message.sender.id)}
                                  tabIndex={0}
                                  aria-label={message.sender?.name ? `Open profile ${message.sender.name}` : 'Open profile'}
                                  onKeyDown={e => { if (e.key === 'Enter' && message.sender?.id) setProfileUserId(message.sender.id); }}
                                >
                                  <AvatarImage src={message.sender.avatarUrl || undefined} alt={message.sender.name} />
                                  <AvatarFallback>
                                    {message.sender.name?.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`max-w-[70%] p-3 rounded-lg ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {/* Sender name for group chats and others' messages */}
                                {isGroup && !isOwn && message.sender?.name && (
                                  <div className="text-xs mb-1 opacity-80">
                                    {message.sender.name}
                                  </div>
                                )}
                                <pre className="whitespace-pre-wrap break-words font-sans text-sm">{message.text}</pre>
                                {/* Message date and time */}
                                {message.createdAt && (
                                  <div className={`text-xs mt-2 opacity-70 text-right`}>
                                    {formatSmartDate(message.createdAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={bottomRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input - pinned to bottom */}
                  <div className="p-4 mt-auto">
                    <div className="flex gap-2">
                      <Textarea
                        ref={inputRef}
                        placeholder="Enter message..."
                        value={messageText}
                        onChange={(e) => {
                          if (!selectedKey) return;
                          const value = e.target.value;
                          setDrafts((prev) => ({ ...prev, [selectedKey]: value }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        rows={2}
                        style={{ resize: 'none' }}
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleSendMessage}
                          disabled={!messageText.trim() || sendMessageMutation.isPending}
                          size="icon"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          disabled={true}
                          size="icon"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-lg text-muted-foreground">Select a chat</p>
              </div>
            )}
          </Card>
        </div>

        {/* Trip Detail Modal */}
        {tripModalId && (
          <TripDetailModal tripId={tripModalId} isOpen={!!tripModalId} onClose={() => setTripModalId(null)} />
        )}

        {/* User Profile Modal */}
        {profileUserId && (
          <UserProfileModal userId={profileUserId} isOpen={!!profileUserId} onClose={() => setProfileUserId(null)} />
        )}
      </main>
    </div>
  );
}