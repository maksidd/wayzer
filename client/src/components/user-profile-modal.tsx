import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import React from "react";

interface UserProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ userId, isOpen, onClose }: UserProfileModalProps) {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/users", userId],
    enabled: isOpen && !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const resp = await fetch(`/api/users/${userId}`);
      if (!resp.ok) throw new Error("Failed to load user profile");
      return resp.json();
    },
  });

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">Loading...</div>
        ) : isError || !user ? (
          <div className="text-center py-10 text-red-500">Failed to load user data</div>
        ) : (
          <div className="space-y-6">
            {/* Main avatar + name */}
            <div className="flex flex-col items-center text-center space-y-2">
              <Avatar className="h-32 w-32">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              {user.age && <p className="text-gray-500">{user.age} years old</p>}
            </div>

            {/* Additional photos */}
            {user.additionalPhotos && user.additionalPhotos.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Photos</h3>
                <div className="grid grid-cols-3 gap-2">
                  {user.additionalPhotos.map((photo: string, idx: number) => (
                    <img
                      key={`${photo}-${idx}`}
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Personal info */}
            <div className="space-y-4">
              {user.city && (
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>{user.city}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.email && (
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              )}
              {user.languages && user.languages.length > 0 && (
                <div>
                  <p className="text-sm mb-1 font-medium">Languages:</p>
                  <div className="flex flex-wrap gap-1">
                    {user.languages.map((lang: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {user.messengers && Object.keys(user.messengers).length > 0 && (
                <div>
                  <p className="text-sm mb-1 font-medium">Messengers:</p>
                  <div className="space-y-1">
                    {Object.entries(user.messengers).map(([type, val]: [string, any], idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-sm">
                        <MessageCircle className="h-4 w-4" />
                        <span className="font-medium">{type}:</span>
                        <span>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {user.bio && (
                <div>
                  <p className="text-sm mb-1 font-medium">About:</p>
                  <p className="text-sm whitespace-pre-line">{user.bio}</p>
                </div>
              )}
              {user.createdAt && (
                <p className="text-xs text-gray-500">On service since {format(new Date(user.createdAt), "d MMMM yyyy", { locale: ru })}</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 