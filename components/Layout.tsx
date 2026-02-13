
import React from 'react';
import { AppScreen } from '../types';
import { Home, BarChart3, User, Skull, Users, Activity, Compass } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeScreen, onNavigate }) => {
  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-dark shadow-2xl border-x border-brand/10">
      <header className="p-4 border-b border-brand/20 flex justify-between items-center bg-black text-brand sticky top-0 z-10 shadow-lg">
        <div className="flex items-center space-x-2">
          <Skull size={20} className="text-brand animate-pulse" />
          <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">DeadByDefault</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-brand animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-brand/80">Default: Dead</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-dark custom-scrollbar">
        {children}
      </main>

      <nav className="border-t border-brand/20 p-2 flex justify-around items-center bg-black sticky bottom-0 z-20">
        <NavButton 
          active={activeScreen === AppScreen.BASE} 
          onClick={() => onNavigate(AppScreen.BASE)}
          icon={<Home size={20} />}
          label="Command"
        />
        <NavButton 
          active={activeScreen === AppScreen.FEED} 
          onClick={() => onNavigate(AppScreen.FEED)}
          icon={<Activity size={20} />}
          label="Feed"
        />
        <NavButton 
          active={activeScreen === AppScreen.DISCOVER} 
          onClick={() => onNavigate(AppScreen.DISCOVER)}
          icon={<Compass size={20} />}
          label="Discover"
        />
        <NavButton 
          active={activeScreen === AppScreen.GROUPS} 
          onClick={() => onNavigate(AppScreen.GROUPS)}
          icon={<Users size={20} />}
          label="Groups"
        />
        <NavButton 
          active={activeScreen === AppScreen.ACHIEVEMENTS} 
          onClick={() => onNavigate(AppScreen.ACHIEVEMENTS)}
          icon={<BarChart3 size={20} />}
          label="Analytics"
        />
        <NavButton 
          active={activeScreen === AppScreen.PROFILE} 
          onClick={() => onNavigate(AppScreen.PROFILE)}
          icon={<User size={20} />}
          label="Profile"
        />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center px-1 py-2 rounded-lg transition-all min-w-[60px] ${active ? 'text-brand scale-110' : 'text-gray-600 hover:text-brand/60'}`}
  >
    {icon}
    <span className="text-[8px] mt-1 font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default Layout;
