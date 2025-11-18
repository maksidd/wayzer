                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  tripId: string;
  initialIsFavorite?: boolean;
  className?: string;
}

export function FavoriteButton({ tripId, initialIsFavorite = false, className }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const queryClient = useQueryClient();

  // Sync when prop changes
  useEffect(() => {
    setIsFavorite(initialIsFavorite);
  }, [initialIsFavorite]);

  const addToFavoritesMutation = useMutation({
    mutationFn: () => apiRequest(`/api/favorites/${tripId}`, { method: 'POST' }),
    onSuccess: () => {
      setIsFavorite(true);
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    },
  });

  const removeFromFavoritesMutation = useMutation({
    mutationFn: () => apiRequest(`/api/favorites/${tripId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setIsFavorite(false);
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    },
  });

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    // If user is not authorized — redirect to login
    const token = localStorage.getItem('accessToken');
    if (!token) {
      window.location.href = '/auth';
      return;
    }

    if (isFavorite) {
      removeFromFavoritesMutation.mutate();
    } else {
      addToFavoritesMutation.mutate();
    }
  };

  const isLoading = addToFavoritesMutation.isPending || removeFromFavoritesMutation.isPending;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={cn(
        "absolute top-2 right-2 p-2 h-8 w-8 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full",
        className
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
        )}
      />
    </Button>
  );
}