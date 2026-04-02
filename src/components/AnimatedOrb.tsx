import React from 'react';
import { motion } from 'motion/react';

interface AnimatedOrbProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  audioLevel?: number;
}

export const AnimatedOrb: React.FC<AnimatedOrbProps> = ({ state, audioLevel = 0 }) => {
  const getOrbVariants = () => {
    switch (state) {
      case 'listening':
        return {
          scale: [1, 1.1 + audioLevel * 2, 1],
          opacity: [0.8, 1, 0.8],
          boxShadow: [
            '0 0 20px rgba(99, 102, 241, 0.4)',
            `0 0 ${40 + audioLevel * 100}px rgba(99, 102, 241, 0.8)`,
            '0 0 20px rgba(99, 102, 241, 0.4)'
          ],
          transition: { duration: 0.2, repeat: Infinity, ease: "easeInOut" }
        };
      case 'thinking':
        return {
          scale: [1, 1.05, 1],
          opacity: [0.6, 0.9, 0.6],
          rotate: [0, 180, 360],
          boxShadow: [
            '0 0 30px rgba(168, 85, 247, 0.5)',
            '0 0 60px rgba(168, 85, 247, 0.8)',
            '0 0 30px rgba(168, 85, 247, 0.5)'
          ],
          transition: { duration: 2, repeat: Infinity, ease: "linear" }
        };
      case 'speaking':
        return {
          scale: [1, 1.1 + audioLevel * 1.5, 1],
          opacity: [0.8, 1, 0.8],
          boxShadow: [
            '0 0 20px rgba(16, 185, 129, 0.4)',
            `0 0 ${40 + audioLevel * 80}px rgba(16, 185, 129, 0.8)`,
            '0 0 20px rgba(16, 185, 129, 0.4)'
          ],
          transition: { duration: 0.15, repeat: Infinity, ease: "easeInOut" }
        };
      default: // idle
        return {
          scale: [1, 1.02, 1],
          opacity: [0.4, 0.6, 0.4],
          boxShadow: [
            '0 0 10px rgba(148, 163, 184, 0.2)',
            '0 0 20px rgba(148, 163, 184, 0.4)',
            '0 0 10px rgba(148, 163, 184, 0.2)'
          ],
          transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        };
    }
  };

  const getGradient = () => {
    switch (state) {
      case 'listening': return 'from-indigo-500 to-cyan-400';
      case 'thinking': return 'from-purple-500 to-pink-500';
      case 'speaking': return 'from-emerald-400 to-teal-500';
      default: return 'from-slate-600 to-slate-400';
    }
  };

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      {/* Outer Glow */}
      <motion.div
        animate={getOrbVariants()}
        className={`absolute inset-0 rounded-full bg-gradient-to-tr ${getGradient()} blur-xl opacity-50`}
      />
      
      {/* Inner Core */}
      <motion.div
        animate={getOrbVariants()}
        className={`relative w-16 h-16 rounded-full bg-gradient-to-tr ${getGradient()} z-10 flex items-center justify-center overflow-hidden`}
      >
        {/* Animated SVG inside the core */}
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-50 mix-blend-overlay">
          <motion.path
            d="M 20,50 Q 50,20 80,50 T 20,50"
            fill="none"
            stroke="white"
            strokeWidth="2"
            animate={{
              d: [
                "M 20,50 Q 50,20 80,50 T 20,50",
                "M 20,50 Q 50,80 80,50 T 20,50",
                "M 20,50 Q 50,20 80,50 T 20,50"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
};
