import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Sun, ArrowRight, Activity } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{role: string, text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio playback queue
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const playbackContextRef = useRef<AudioContext | null>(null);

  const playAudioBase64 = async (base64: string) => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new window.AudioContext({ sampleRate: 24000 });
    }
    const ctx = playbackContextRef.current;

    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      audioQueueRef.current.push(audioBuffer);
      playNextInQueue();
    } catch (e) {
      console.error("Error decoding audio", e);
    }
  };

  const playNextInQueue = () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const buffer = audioQueueRef.current.shift()!;
    const ctx = playbackContextRef.current!;
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextInQueue();
    };
    source.start();
  };

  const stopConversation = () => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close?.());
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsConnected(false);
    setIsConnecting(false);
    setAudioLevel(0);
  };

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setTranscript([]);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      mediaStreamRef.current = stream;

      const audioCtx = new window.AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate audio level for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += Math.abs(inputData[i]);
              }
              setAudioLevel(sum / inputData.length);

              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              
              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(i * 2, pcm16[i], true);
              }
              
              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: async (message: any) => {
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                  playAudioBase64(part.inlineData.data);
                }
                if (part.text) {
                  setTranscript(prev => [...prev, { role: 'model', text: part.text }]);
                }
              }
            }
            
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              if (playbackContextRef.current) {
                playbackContextRef.current.close();
                playbackContextRef.current = new window.AudioContext({ sampleRate: 24000 });
              }
              isPlayingRef.current = false;
            }
          },
          onclose: () => {
            stopConversation();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error occurred.");
            stopConversation();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are Bók Lífsins (The Book of Life), a wise and helpful Icelandic AI assistant. You speak Icelandic.",
        },
      });

      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError("Could not access microphone or connect to AI.");
      setIsConnecting(false);
      stopConversation();
    }
  };

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200 font-sans flex flex-col">
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <button className="text-slate-400 hover:text-white transition-colors text-sm tracking-widest font-medium">
            &larr; TIL BAKA
          </button>
        </div>
        <button className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/30 transition-colors">
          <Sun className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div>
            <div className="text-xs font-semibold tracking-widest text-slate-400 mb-3">
              RÖDD • VEFUR • LIVE
            </div>
            <h1 className="text-4xl font-serif font-bold text-white mb-8">
              Talaðu við Bók Lífsins
            </h1>
          </div>

          <div className="bg-[#11141a] border border-slate-800 rounded-3xl p-6 flex flex-col gap-6 shadow-xl shadow-black/50">
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full flex items-center gap-3 text-sm font-medium border transition-colors ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? 'Tengt' : isConnecting ? 'Tengist...' : 'Ekki tengt'}
              </div>
            </div>

            <div className="h-48 bg-[#0a0c10] rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden relative shadow-inner">
              {isConnected ? (
                <div className="flex items-center gap-1.5 h-16">
                  {[...Array(15)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2 bg-indigo-500 rounded-full transition-all duration-75"
                      style={{ 
                        height: `${Math.max(10, Math.min(100, (audioLevel * 1000) + Math.random() * 20))}%`,
                        opacity: 0.5 + Math.random() * 0.5
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-slate-700">
                  <Activity className="w-12 h-12 opacity-20" />
                </div>
              )}
            </div>

            <button 
              onClick={isConnected ? stopConversation : startConversation}
              disabled={isConnecting}
              className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
                isConnected 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                  : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 shadow-lg shadow-indigo-500/20'
              }`}
            >
              {isConnected ? (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  Ljúka samtali
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  {isConnecting ? 'Tengist...' : 'Byrja samtal'}
                </>
              )}
            </button>
            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 px-4 rounded-lg border border-red-500/20">{error}</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-widest text-slate-400">TRANSCRIPT</h2>
              <button className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-2 transition-colors font-medium tracking-widest">
                OPNA SÖGU <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="bg-[#11141a] border border-slate-800 rounded-3xl p-8 min-h-[350px] flex flex-col shadow-xl shadow-black/50">
              {transcript.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-lg">
                  Smelltu á Byrja til að hefja samtal...
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                  {transcript.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-lg leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30' 
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold tracking-widest text-slate-400">NÝLEG SÍMTÖL</h2>
            
            <div className="bg-[#11141a] border border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-black/50">
              <div className="max-h-[300px] overflow-y-auto p-3 flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-2xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700 cursor-pointer flex flex-col gap-3">
                    <div className="font-medium text-slate-200 text-lg">Símtal {4-i}/2/2026</div>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="text-slate-500">{4-i}/2/2026, 8:44:38 AM</span>
                      <span className="px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">inbound</span>
                      <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700">twilio</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
