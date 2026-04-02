import React from 'react';
import { X } from 'lucide-react';
import { UserProfile, UserStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editProfile: UserProfile;
  setEditProfile: (profile: UserProfile) => void;
  editApiKey: string;
  setEditApiKey: (key: string) => void;
  editVoiceName: string;
  setEditVoiceName: (voice: string) => void;
  editMcpUrl: string;
  setEditMcpUrl: (url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editProfile,
  setEditProfile,
  editApiKey,
  setEditApiKey,
  editVoiceName,
  setEditVoiceName,
  editMcpUrl,
  setEditMcpUrl
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#11141a] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <h3 className="text-xl font-semibold text-white">Stillingar</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          {/* Profile Settings */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-semibold tracking-widest text-slate-500 uppercase">Prófíll</h4>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-400">Notendanafn</label>
              <input 
                type="text" 
                value={editProfile.username}
                onChange={e => setEditProfile({...editProfile, username: e.target.value})}
                className="w-full bg-[#0a0c10] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-400">Staða</label>
              <select 
                value={editProfile.status}
                onChange={e => setEditProfile({...editProfile, status: e.target.value as UserStatus})}
                className="w-full bg-[#0a0c10] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="in-game">In Game</option>
              </select>
            </div>
          </div>

          {/* API Settings */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-semibold tracking-widest text-slate-500 uppercase">API Stillingar</h4>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-400">Gemini API Lykill</label>
              <input 
                type="password" 
                value={editApiKey}
                onChange={e => setEditApiKey(e.target.value)}
                placeholder="Skildu eftir autt til að nota umhverfisbreytu"
                className="w-full bg-[#0a0c10] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-400">Rödd (Voice)</label>
              <select 
                value={editVoiceName}
                onChange={e => setEditVoiceName(e.target.value)}
                className="w-full bg-[#0a0c10] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
              >
                <option value="Puck">Puck (Default)</option>
                <option value="Charon">Charon</option>
                <option value="Kore">Kore</option>
                <option value="Fenrir">Fenrir</option>
                <option value="Zephyr">Zephyr</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-slate-400">MCP Server URL</label>
              <input 
                type="text" 
                value={editMcpUrl}
                onChange={e => setEditMcpUrl(e.target.value)}
                placeholder="t.d. https://mcp.2076.is/sse"
                className="w-full bg-[#0a0c10] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Hætta við
          </button>
          <button 
            onClick={onSave}
            className="px-6 py-2.5 rounded-xl font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
          >
            Vista stillingar
          </button>
        </div>
      </div>
    </div>
  );
};
