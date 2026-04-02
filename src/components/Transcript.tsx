import React, { RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { TranscriptMessage, UserProfile } from '../types';

interface TranscriptProps {
  transcript: TranscriptMessage[];
  profile: UserProfile;
  containerRef: RefObject<HTMLDivElement | null>;
}

export const Transcript: React.FC<TranscriptProps> = ({ transcript, profile, containerRef }) => {
  if (transcript.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-lg font-light">
        Smelltu á Byrja til að hefja samtal...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col gap-6 overflow-y-auto pr-4 scroll-smooth mb-4">
      <AnimatePresence initial={false}>
        {transcript.map((msg, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 px-2">
              {msg.role === 'user' ? (
                <>
                  <span className="text-xs font-medium text-slate-500">{profile.username}</span>
                  <img src={profile.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 tracking-wide">BÓK LÍFSINS</span>
                </>
              )}
            </div>
            
            <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/10 text-indigo-50 border border-indigo-500/20 rounded-tr-sm backdrop-blur-sm' 
                : 'bg-[#1a1d24]/80 text-slate-200 border border-slate-700/50 rounded-tl-sm backdrop-blur-sm'
            }`}>
              {msg.thought && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-4 bg-black/30 rounded-xl border border-slate-700/50 text-sm text-slate-400 italic shadow-inner"
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2 text-indigo-400/70 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/50 animate-pulse" />
                    Hugsun (Thinking)
                  </div>
                  <div className="markdown-body opacity-90">
                    <ReactMarkdown>{msg.thought}</ReactMarkdown>
                  </div>
                </motion.div>
              )}
              
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-4 flex flex-col gap-2">
                  {msg.toolCalls.map((tc, tcIdx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: tcIdx * 0.1 }}
                      key={tcIdx} 
                      className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-xs font-mono text-cyan-300 shadow-inner flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-semibold text-cyan-400 tracking-wider uppercase text-[10px] block mb-0.5">Tool Execution</span>
                        {tc.name}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {msg.text && (
                <div className="markdown-body font-sans">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
              
              {msg.inlineData && msg.inlineData.mimeType.startsWith('image/') && (
                <img 
                  src={`data:${msg.inlineData.mimeType};base64,${msg.inlineData.data}`} 
                  alt="Model generated" 
                  className="max-w-full rounded-xl mt-3 border border-slate-700/50 shadow-md"
                />
              )}
              
              {msg.inlineData && msg.inlineData.mimeType.startsWith('audio/') && (
                <audio 
                  controls 
                  src={`data:${msg.inlineData.mimeType};base64,${msg.inlineData.data}`} 
                  className="max-w-full mt-3 h-10 opacity-90 hover:opacity-100 transition-opacity"
                />
              )}
              
              {!msg.isFinal && (
                <span className="inline-block w-1.5 h-4 ml-2 bg-indigo-400 animate-pulse opacity-60 align-middle rounded-full" />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
