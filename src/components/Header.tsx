import React from 'react';
import { Share2, Sun } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  profile: UserProfile;
  onShare: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ profile, onShare, onOpenSettings }) => {
  return (
    <header className="flex items-center justify-between p-6 bg-[#0a0c10]/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-800/50">
      <div className="flex items-center gap-4">
        <div className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-wide">
          BÓK LÍFSINS
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={onShare}
          className="p-3 bg-slate-800/50 text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-300 transition-colors"
          title="Deila"
        >
          <Share2 className="w-5 h-5" />
        </button>
        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-3 p-2 pr-4 bg-[#11141a] border border-slate-800 rounded-full hover:bg-slate-800/50 transition-colors"
        >
          <div className="relative">
            <img src={profile.avatar} alt="Avatar" className="w-8 h-8 rounded-full bg-slate-800 object-cover" />
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#11141a] ${
              profile.status === 'online' ? 'bg-emerald-500' : 
              profile.status === 'in-game' ? 'bg-purple-500' : 'bg-slate-500'
            }`} />
          </div>
          <span className="text-sm font-medium text-slate-300">{profile.username}</span>
        </button>
        <button className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-colors">
          <Sun className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
