import React from "react";
import { Button } from "@/components/ui/button";
import { TravelBuddyLogo } from "@/components/ui/logo";
import { UserMenu } from "@/components/ui/user-menu";
import { LanguageSelector } from "@/components/ui/language-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { Menu, MessageSquare, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { useChatWebSocket } from "@/hooks/use-chat-websocket";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    avatarThumbnailUrl?: string;
    role?: string;
  } | null;
  onLogout: () => void;
  onAuthClick?: (mode?: "login" | "register") => void;
  showCreateTrip?: boolean;
  disableCreateTrip?: boolean;
}

export function Header({
  user,
  onLogout,
  onAuthClick,
  showCreateTrip = true,
  disableCreateTrip = false,
}: HeaderProps) {
  // Get conversations2 via useQuery
  const { data: convObj } = useQuery({
    queryKey: ['/api/messages/conversations2'],
    queryFn: () => fetch('/api/messages/conversations2', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    }).then(r => r.json()),
    staleTime: 5 * 1000,
    enabled: !!user,
  });

  // Calculate number of unread chats
  const numericUnreadCount = React.useMemo(() => {
    if (!convObj) return 0;
    const all = [...(convObj.private || []), ...(convObj.public || [])];
    return all.filter((c: any) => c.unreadCount > 0).length;
  }, [convObj]);

  // Removed all useEffect and fetch related to unreadCount and localStorage
  
  // const markMessagesAsRead = async () => {
  //   try {
  //     // optimistic
  //     setNumericUnreadCount(0);
  //     localStorage.setItem('unreadCount', '0');
  //     window.dispatchEvent(new CustomEvent<number>('unread-count-changed', { detail: 0 }));

  //     const token = localStorage.getItem('accessToken');
  //     if (token) {
  //       await fetch('/api/messages/mark-all-read', {
  //         method: 'POST',
  //         headers: { 'Authorization': `Bearer ${token}` },
  //       });
  //     }
  //   } catch (err) {
  //     // eslint-disable-next-line no-console
  //     console.error('Failed to mark all as read:', err);
  //   }
  // };
  
  const handleTripsClick = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
  };
  
  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <TravelBuddyLogo />
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Wayzer
                </span>
              </div>
            </Link>

            {/* Mobile menu button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="default"
                  className="md:hidden p-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white [&_svg]:!size-7"
                >
                  <Menu className="h-8 w-8" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {user?.role === "admin" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin"
                        className="flex items-center w-full cursor-pointer"
                      >
                        Admin
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/tests"
                        className="flex items-center w-full cursor-pointer"
                      >
                        Tests
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link
                    href="/trips"
                    className="flex items-center w-full cursor-pointer"
                    onClick={handleTripsClick}
                  >
                    Routes
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/rules"
                    className="flex items-center w-full cursor-pointer"
                  >
                    Rules
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden md:flex items-center space-x-6">
              {user?.role === "admin" && (
                <>
                  <Link href="/admin">
                    <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      Admin
                    </Button>
                  </Link>
                  <Link href="/tests">
                    <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                      Tests
                    </Button>
                  </Link>
                </>
              )}
              <Link href="/trips" onClick={handleTripsClick}>
                <Button
                  variant="ghost"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Routes
                </Button>
              </Link>

              <Link href="/rules">
                <Button
                  variant="ghost"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Rules
                </Button>
              </Link>
            </div>
          </div>

          {/* Right side - Create route button, Language selector, User menu or auth buttons */}
          <div className="flex items-center space-x-3">
            {user && showCreateTrip && (
              <Link href="/create-trip">
                <Button
                  disabled={disableCreateTrip}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 hover:bg-blue-700 text-white bg-[#417ee0]"
                >
                  Create route
                </Button>
              </Link>
            )}
            <LanguageSelector />
            {user && (
              <Link href="/messages">
                <Button
                  variant="ghost"
                  size="default"
                  className="p-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white [&_svg]:!size-5 relative"
                  // onClick={markMessagesAsRead}
                >
                  <MessageSquare className="h-6 w-6" />
                  {numericUnreadCount > 0 && (
                    <span 
                      data-testid="unread-badge"
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium"
                    >
                      {numericUnreadCount > 9 ? '9+' : numericUnreadCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            {user ? (
              <UserMenu user={user} onLogout={onLogout} />
            ) : (
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => onAuthClick?.()}
                  variant="ghost"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Log in
                </Button>
                <Button
                  onClick={() => onAuthClick?.("register")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}