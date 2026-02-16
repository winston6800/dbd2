
import React from 'react';
import { AppScreen } from '../types';
import { Home, User, Skull, Users, Compass, CircleDot } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  isOnBreak?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeScreen, onNavigate, isOnBreak }) => {
  const borderCls = isOnBreak ? 'border-indigo-500/30' : 'border-brand/20';
  const textCls = isOnBreak ? 'text-indigo-400' : 'text-brand';
  const accentCls = isOnBreak ? 'text-indigo-400/80' : 'text-brand/80';
  const dotCls = isOnBreak ? 'bg-indigo-500' : 'bg-brand';

  return (
    <div className={`max-w-md mx-auto min-h-screen flex flex-col bg-dark shadow-2xl border-x transition-colors duration-500 ${isOnBreak ? 'border-indigo-500/20' : 'border-brand/10'}`}>
      <header className={`p-4 border-b ${borderCls} flex justify-between items-center bg-black ${textCls} sticky top-0 z-10 shadow-lg transition-colors duration-500`}>
        <div className="flex items-center space-x-2">
          <Skull size={20} className={`${textCls} animate-pulse`} />
          <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">DeadByDefault</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${dotCls} animate-pulse`}></div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${accentCls}`}>{isOnBreak ? 'On Break' : 'Default: Dead'}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-dark custom-scrollbar">
        {children}
      </main>

      <nav className={`border-t ${borderCls} p-2 flex justify-around items-center bg-black sticky bottom-0 z-20 transition-colors duration-500`}>
        <NavButton 
          active={activeScreen === AppScreen.HOME} 
          onClick={() => onNavigate(AppScreen.HOME)}
          icon={<Home size={20} />}
          label="Home"
          isOnBreak={isOnBreak}
        />
        <NavButton 
          active={activeScreen === AppScreen.DISCOVER} 
          onClick={() => onNavigate(AppScreen.DISCOVER)}
          icon={<Compass size={20} />}
          label="Discover"
          isOnBreak={isOnBreak}
        />
        <NavButton 
          active={activeScreen === AppScreen.RECORD} 
          onClick={() => onNavigate(AppScreen.RECORD)}
          icon={<CircleDot size={20} />}
          label="Record"
          isOnBreak={isOnBreak}
        />
        <NavButton 
          active={activeScreen === AppScreen.GROUPS} 
          onClick={() => onNavigate(AppScreen.GROUPS)}
          icon={<Users size={20} />}
          label="Groups"
          isOnBreak={isOnBreak}
        />
        <NavButton 
          active={activeScreen === AppScreen.YOU} 
          onClick={() => onNavigate(AppScreen.YOU)}
          icon={<User size={20} />}
          label="You"
          isOnBreak={isOnBreak}
        />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; isOnBreak?: boolean }> = ({ active, onClick, icon, label, isOnBreak }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center px-1 py-2 rounded-lg transition-all min-w-[60px] ${active ? (isOnBreak ? 'text-indigo-400 scale-110' : 'text-brand scale-110') : (isOnBreak ? 'text-gray-600 hover:text-indigo-400/60' : 'text-gray-600 hover:text-brand/60')}`}
  >
    {icon}
    <span className="text-[8px] mt-1 font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default Layout;
