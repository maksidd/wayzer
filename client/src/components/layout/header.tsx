import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

import { 
  Search, User, LogOut, Settings, ChevronDown, 
  MessageSquare, Heart, Globe
} from 'lucide-react';

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { t, language, setLanguage, availableLanguages } = useTranslation();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log("Search for:", searchQuery);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <a className="flex items-center">
                <i className="fas fa-route text-primary text-2xl mr-2"></i>
                <span className="font-bold text-xl text-gray-800">Wayzer</span>
              </a>
            </Link>
          </div>
          
          {/* Search Bar - Hidden on Mobile */}
          <div className="hidden md:flex items-center space-x-4">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder={t('header.search_routes')}
                className="pl-10 pr-4 py-2 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search className="h-4 w-4" />
              </div>
            </form>
            
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-1.5 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                  <Globe className="h-4 w-4 mr-1" />
                  <span className="uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableLanguages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={language === lang.code ? "bg-primary-50 text-primary" : ""}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Right Side - Account & Create */}
          <div className="flex items-center">
            {user ? (
              <>
                {/* Create Route Button - Hidden on Mobile */}
                <Button 
                  className="hidden md:block mr-4" 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-create-route-modal'))}
                >
                  {t('header.create_route')}
                </Button>
                
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-1">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || ''} />
                          <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                        </Avatar>
                        <ChevronDown className="ml-2 h-4 w-4 text-gray-500" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setLocation('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('header.profile')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation('/chat')}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>{t('header.messages')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation('/favorites')}>
                      <Heart className="mr-2 h-4 w-4" />
                      <span>{t('header.favorites')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>{t('header.settings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t('header.logout')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              // Login Button when not logged in
              <Button 
                onClick={() => setLocation('/auth')}
                variant="default"
              >
                {t('header.login')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
