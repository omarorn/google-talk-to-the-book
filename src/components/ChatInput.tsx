import React, { RefObject } from 'react';
import { Paperclip, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatInputProps {
  textInput: string;
  setTextInput: (text: string) => void;
  attachment: { file: File; base64: string; mimeType: string } | null;
  setAttachment: (attachment: { file: File; base64: string; mimeType: string } | null) => void;
  onSend: (e: React.FormEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isGenerating: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  textInput,
  setTextInput,
  attachment,
  setAttachment,
  onSend,
  onFileChange,
  fileInputRef,
  isGenerating
}) => {
  return (
    <form onSubmit={onSend} className="relative flex items-center mt-auto pt-4 border-t border-slate-800/50">
      <AnimatePresence>
        {attachment && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full mb-3 left-0 bg-[#1a1d24] rounded-xl p-2.5 flex items-center gap-3 border border-slate-700/50 shadow-lg backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Paperclip className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-xs font-medium text-slate-300 truncate max-w-[200px]">{attachment.file.name}</span>
            <button 
              type="button" 
              onClick={() => setAttachment(null)} 
              className="p-1.5 hover:bg-slate-700/50 rounded-md text-slate-400 hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <input
        type="file"
        accept="audio/*"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
      />
      
      <button 
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-3.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors"
        title="Hengja við hljóðskrá"
      >
        <Paperclip className="w-5 h-5" />
      </button>
      
      <input 
        type="text" 
        value={textInput}
        onChange={e => setTextInput(e.target.value)}
        placeholder="Skrifaðu skilaboð..."
        className="flex-1 bg-[#1a1d24] border border-slate-800/80 rounded-2xl px-5 py-3.5 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner"
      />
      
      <button 
        type="submit"
        disabled={(!textInput.trim() && !attachment) || isGenerating}
        className="ml-3 p-3.5 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 flex items-center justify-center"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
};
