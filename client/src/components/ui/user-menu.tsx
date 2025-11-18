import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, MapPin, Route, Heart, MessageCircle, Star, Settings, LogOut } from "lucide-react";
import { Link } from "wouter";

interface UserMenuProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    avatarThumbnailUrl?: string;
    role?: string;
  };
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
        <Avatar className="h-14 w-14">
          <AvatarImage 
            src={user.avatarThumbnailUrl || user.avatarUrl} 
            alt={user.name}
            key={user.avatarThumbnailUrl || user.avatarUrl}
          />
          <AvatarFallback className="bg-blue-100 text-blue-600 text-base">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center space-x-2">
          <Avatar className="h-6 w-6">
            <AvatarImage 
              src={user.avatarThumbnailUrl || user.avatarUrl} 
              alt={user.name}
              key={user.avatarThumbnailUrl || user.avatarUrl}
            />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center space-x-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center space-x-2 cursor-pointer">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my-routes" className="flex items-center space-x-2 cursor-pointer">
            <MapPin className="h-4 w-4" />
            <span>My routes</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my-trips" className="flex items-center space-x-2 cursor-pointer">
            <Route className="h-4 w-4" />
            <span>My trips</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/favorites" className="flex items-center space-x-2 cursor-pointer">
            <Heart className="h-4 w-4" />
            <span>Favorites</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/messages" className="flex items-center space-x-2 cursor-pointer">
            <MessageCircle className="h-4 w-4" />
            <span>Messages</span>
          </Link>
        </DropdownMenuItem>
        {/* <DropdownMenuItem asChild>
          <Link href="/reviews" className="flex items-center space-x-2 cursor-pointer">
            <Star className="h-4 w-4" />
            <span>Reviews</span>
          </Link>
        </DropdownMenuItem> */}
        {/* <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center space-x-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem> */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="flex items-center space-x-2 cursor-pointer text-red-600 dark:text-red-400">
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}