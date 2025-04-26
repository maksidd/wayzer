import { useLocation } from 'wouter';
import { useTranslation } from '@/hooks/use-language';
import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react';

export default function MobileTabs() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();

  const openCreateRouteModal = () => {
    window.dispatchEvent(new CustomEvent('open-create-route-modal'));
  };

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
      <div className="flex justify-between">
        <button 
          onClick={() => setLocation('/')}
          className={`flex flex-col items-center py-2 w-1/5 ${location === '/' ? 'text-primary' : 'text-gray-500'}`}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs mt-1">{t('mobile_tabs.home')}</span>
        </button>
        
        <button 
          onClick={() => setLocation('/explore')}
          className={`flex flex-col items-center py-2 w-1/5 ${location === '/explore' ? 'text-primary' : 'text-gray-500'}`}
        >
          <Search className="h-5 w-5" />
          <span className="text-xs mt-1">{t('mobile_tabs.explore')}</span>
        </button>
        
        <button 
          onClick={openCreateRouteModal}
          className="flex flex-col items-center py-2 w-1/5"
        >
          <PlusCircle className="h-6 w-6 text-primary" />
          <span className="text-xs mt-1">{t('mobile_tabs.create')}</span>
        </button>
        
        <button 
          onClick={() => setLocation('/chat')}
          className={`flex flex-col items-center py-2 w-1/5 ${location === '/chat' ? 'text-primary' : 'text-gray-500'}`}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs mt-1">{t('mobile_tabs.chat')}</span>
        </button>
        
        <button 
          onClick={() => setLocation('/profile')}
          className={`flex flex-col items-center py-2 w-1/5 ${location === '/profile' ? 'text-primary' : 'text-gray-500'}`}
        >
          <User className="h-5 w-5" />
          <span className="text-xs mt-1">{t('mobile_tabs.profile')}</span>
        </button>
      </div>
    </div>
  );
}
