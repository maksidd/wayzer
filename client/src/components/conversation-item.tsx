import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ConversationItemProps {
  conversation: any;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount || 0;

  const name = conversation.source?.name ?? conversation.otherUser?.name;
  const avatarUrl = conversation.source?.avatarUrl ?? conversation.otherUser?.avatarUrl ?? conversation.source?.photoUrl;
  const avatarThumb = conversation.source?.avatarThumbnailUrl ?? conversation.otherUser?.avatarThumbnailUrl;

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={avatarUrl || undefined} alt={name} />
        <AvatarFallback>
          {name?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <p className="font-medium flex-1 min-w-0 w-0 truncate">{name}</p>
          {lastMessage && (
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {format(new Date(lastMessage.createdAt), 'HH:mm', { locale: ru })}
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center">
          <p className="text-sm text-muted-foreground flex-1 min-w-0 w-0 truncate overflow-hidden whitespace-nowrap">
            {lastMessage?.text || 'No messages'}
          </p>
          {unreadCount > 0 && (
            <Badge variant="default" className="flex-shrink-0 ml-2">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
} 