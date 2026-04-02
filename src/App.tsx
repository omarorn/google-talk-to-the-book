import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Sun, ArrowRight, Activity, User, Settings, Circle, Camera, MonitorUp, Share2, Send, VideoOff } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

type UserStatus = 'online' | 'offline' | 'in-game';

interface UserProfile {
  username: string;
  avatar: string;
  status: UserStatus;
}

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{role: string, text: string, isFinal?: boolean}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  
  // New State
  const [textInput, setTextInput] = useState('');
  const [videoMode, setVideoMode] = useState<'none' | 'camera' | 'screen'>('none');
  
  // User Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : { username: 'Gestur', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gestur', status: 'online' };
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editProfile, setEditProfile] = useState<UserProfile>(profile);

  // API Key State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [editApiKey, setEditApiKey] = useState(apiKey);

  // Voice Settings State
  const [speakingRate, setSpeakingRate] = useState<number>(() => {
    const saved = localStorage.getItem('speakingRate');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [voicePitch, setVoicePitch] = useState<number>(() => {
    const saved = localStorage.getItem('voicePitch');
    return saved ? parseInt(saved) : 0;
  });
  
  const speakingRateRef = useRef(speakingRate);
  const voicePitchRef = useRef(voicePitch);

  useEffect(() => {
    speakingRateRef.current = speakingRate;
    localStorage.setItem('speakingRate', speakingRate.toString());
  }, [speakingRate]);

  useEffect(() => {
    voicePitchRef.current = voicePitch;
    localStorage.setItem('voicePitch', voicePitch.toString());
  }, [voicePitch]);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Video Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio playback queue
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const playbackContextRef = useRef<AudioContext | null>(null);

  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('geminiApiKey', apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcript]);

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
    source.playbackRate.value = speakingRateRef.current;
    
    // detune is in cents (100 cents = 1 semitone). 
    // Note: in standard Web Audio API, playbackRate and detune both affect speed and pitch together.
    source.detune.value = voicePitchRef.current; 
    
    source.connect(ctx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextInQueue();
    };
    source.start();
  };

  const stopConversation = () => {
    stopVideo();
    
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

      const currentKey = apiKey.trim() || process.env.GEMINI_API_KEY;
      if (!currentKey) {
        setError("API lykill vantar. Vinsamlegast bættu honum við í stillingum.");
        setIsConnecting(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey: currentKey });

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
          },
        });
      } catch (mediaErr: any) {
        console.error("Microphone error:", mediaErr);
        if (mediaErr.name === 'NotAllowedError') {
          setError("Aðgangur að hljóðnema var hafnaður. Vinsamlegast leyfðu hljóðnema í vafranum.");
        } else if (mediaErr.name === 'NotFoundError') {
          setError("Enginn hljóðnemi fannst.");
        } else {
          setError(`Villa við að opna hljóðnema: ${mediaErr.message || mediaErr.name}`);
        }
        setIsConnecting(false);
        return;
      }
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
                  setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'model' && !last.isFinal) {
                      const newPrev = [...prev];
                      newPrev[newPrev.length - 1] = { ...last, text: last.text + part.text };
                      return newPrev;
                    }
                    return [...prev, { role: 'model', text: part.text, isFinal: false }];
                  });
                }
              }
            }
            
            if (message.serverContent?.turnComplete) {
               setTranscript(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'model') {
                    const newPrev = [...prev];
                    newPrev[newPrev.length - 1] = { ...last, isFinal: true };
                    return newPrev;
                  }
                  return prev;
               });
            }

            if (message.serverContent?.inputTranscription) {
               const text = message.serverContent.inputTranscription.text;
               if (text) {
                 setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'user' && !last.isFinal) {
                      const newPrev = [...prev];
                      newPrev[newPrev.length - 1] = { ...last, text: last.text + text };
                      return newPrev;
                    }
                    return [...prev, { role: 'user', text: text, isFinal: false }];
                 });
               }
               if (message.serverContent.inputTranscription.finished) {
                 setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'user') {
                      const newPrev = [...prev];
                      newPrev[newPrev.length - 1] = { ...last, isFinal: true };
                      return newPrev;
                    }
                    return prev;
                 });
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
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            let errMsg = "Tengingarvilla kom upp.";
            if (err.message) {
              errMsg += ` (${err.message})`;
              if (err.message.includes("API key not valid") || err.message.includes("401") || err.message.includes("403")) {
                errMsg = "Ógildur API lykill. Vinsamlegast athugaðu stillingar.";
              }
            }
            setError(errMsg);
            stopConversation();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: "Þú ert Bók Lífsins, vitur og hjálpsamur gervigreindaraðstoðarmaður. Þú talar og skilur aðeins íslensku og ensku. You are Bók Lífsins, a wise and helpful AI assistant. You only speak and understand Icelandic and English. Never speak or transcribe Chinese or any other languages. If the audio is unclear, assume it is Icelandic or English.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Failed to start conversation:", err);
      setError(`Villa við að tengjast: ${err.message || "Óþekkt villa"}`);
      setIsConnecting(false);
      stopConversation();
    }
  };

  // Video Sharing Logic
  const startVideo = async (mode: 'camera' | 'screen') => {
    try {
      if (videoStreamRef.current) {
        stopVideo();
      }
      
      const stream = mode === 'camera' 
        ? await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        : await navigator.mediaDevices.getDisplayMedia({ video: { width: 640, height: 480 } });
        
      videoStreamRef.current = stream;
      setVideoMode(mode);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      videoIntervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 1000); // 1 fps
      
      stream.getVideoTracks()[0].onended = () => {
        stopVideo();
      };
    } catch (err) {
      console.error("Failed to start video:", err);
      setVideoMode('none');
    }
  };

  const stopVideo = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoMode('none');
  };

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !sessionRef.current || !isConnected) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Data = dataUrl.split(',')[1];
    
    sessionRef.current.then((session: any) => {
      session.sendRealtimeInput({
        video: { mimeType: 'image/jpeg', data: base64Data }
      });
    });
  };

  // Text Input Logic
  const sendTextMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !sessionRef.current || !isConnected) return;
    
    sessionRef.current.then((session: any) => {
      session.sendRealtimeInput({ text: textInput });
    });
    
    setTranscript(prev => [...prev, { role: 'user', text: textInput, isFinal: true }]);
    setTextInput('');
  };

  // Share App Logic
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Bók Lífsins - Voice AI',
          text: 'Talaðu við Bók Lífsins í gegnum rödd, myndavél og skjá!',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Hlekkur afritaður!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, []);

  const saveProfile = () => {
    setProfile(editProfile);
    setApiKey(editApiKey);
    setShowProfileModal(false);
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'text-emerald-400 bg-emerald-400/20';
      case 'offline': return 'text-slate-400 bg-slate-400/20';
      case 'in-game': return 'text-purple-400 bg-purple-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200 font-sans flex flex-col relative">
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <button className="text-slate-400 hover:text-white transition-colors text-sm tracking-widest font-medium">
            &larr; TIL BAKA
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleShare}
            className="p-3 bg-slate-800/50 text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-300 transition-colors"
            title="Deila"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setEditProfile(profile);
              setEditApiKey(apiKey);
              setShowProfileModal(true);
            }}
            className="flex items-center gap-3 p-2 pr-4 bg-[#11141a] border border-slate-800 rounded-full hover:bg-slate-800/50 transition-colors"
          >
            <div className="relative">
              <img src={profile.avatar} alt="Avatar" className="w-8 h-8 rounded-full bg-slate-800" />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#11141a] ${
                profile.status === 'online' ? 'bg-emerald-500' : 
                profile.status === 'in-game' ? 'bg-purple-500' : 'bg-slate-500'
              }`} />
            </div>
            <span className="text-sm font-medium text-slate-300">{profile.username}</span>
          </button>
          <button className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/30 transition-colors">
            <Sun className="w-5 h-5" />
          </button>
        </div>
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

            {/* Video Preview */}
            <div className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0a0c10] transition-all duration-300 ${videoMode !== 'none' ? 'h-48 opacity-100' : 'h-0 opacity-0 border-0'}`}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-xs font-medium text-white flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {videoMode === 'camera' ? 'Myndavél' : 'Skjár'}
              </div>
              <button 
                onClick={stopVideo}
                className="absolute top-3 right-3 p-1.5 bg-black/50 backdrop-blur-md rounded-md text-white hover:bg-red-500/80 transition-colors"
              >
                <VideoOff className="w-4 h-4" />
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {/* Audio Visualizer */}
            <div className={`h-32 bg-[#0a0c10] rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden relative shadow-inner transition-all duration-300 ${videoMode !== 'none' ? 'h-24' : 'h-48'}`}>
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

            <div className="flex flex-col gap-3">
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
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => videoMode === 'camera' ? stopVideo() : startVideo('camera')}
                  disabled={!isConnected}
                  className={`py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                    !isConnected ? 'opacity-50 cursor-not-allowed bg-slate-800/50 text-slate-500' :
                    videoMode === 'camera' 
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Myndavél
                </button>
                <button 
                  onClick={() => videoMode === 'screen' ? stopVideo() : startVideo('screen')}
                  disabled={!isConnected}
                  className={`py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                    !isConnected ? 'opacity-50 cursor-not-allowed bg-slate-800/50 text-slate-500' :
                    videoMode === 'screen' 
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  <MonitorUp className="w-4 h-4" />
                  Deila skjá
                </button>
              </div>
            </div>
            
            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 px-4 rounded-lg border border-red-500/20">{error}</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
          
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-widest text-slate-400">TRANSCRIPT</h2>
            </div>
            
            <div className="bg-[#11141a] border border-slate-800 rounded-3xl p-6 flex-1 min-h-[450px] flex flex-col shadow-xl shadow-black/50">
              {transcript.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-lg">
                  Smelltu á Byrja til að hefja samtal...
                </div>
              ) : (
                <div ref={transcriptContainerRef} className="flex-1 flex flex-col gap-6 overflow-y-auto pr-4 scroll-smooth mb-4">
                  {transcript.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 px-2">
                        {msg.role === 'user' ? (
                          <>
                            <span className="text-xs font-medium text-slate-500">{profile.username}</span>
                            <img src={profile.avatar} alt="" className="w-4 h-4 rounded-full" />
                          </>
                        ) : (
                          <>
                            <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-indigo-400" />
                            </div>
                            <span className="text-xs font-medium text-slate-500">Bók Lífsins</span>
                          </>
                        )}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-lg leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-tr-sm' 
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
                      }`}>
                        {msg.text}
                        {!msg.isFinal && (
                          <span className="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse opacity-50 align-middle" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Text Input */}
              <form onSubmit={sendTextMessage} className="relative flex items-center mt-auto pt-4 border-t border-slate-800/50">
                <input
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  disabled={!isConnected}
                  placeholder={isConnected ? "Skrifaðu skilaboð..." : "Tengstu til að skrifa..."}
                  className="w-full bg-[#0a0c10] border border-slate-800 rounded-2xl pl-5 pr-14 py-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!isConnected || !textInput.trim()}
                  className="absolute right-2 p-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141a] border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-white">Stillingar</h2>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white">
                <Square className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-400">Notendanafn</label>
                <input 
                  type="text" 
                  value={editProfile.username}
                  onChange={e => setEditProfile({...editProfile, username: e.target.value})}
                  className="bg-[#0a0c10] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-400">Avatar URL</label>
                <div className="flex gap-4 items-center">
                  <img src={editProfile.avatar} alt="Preview" className="w-12 h-12 rounded-full bg-slate-800" />
                  <input 
                    type="text" 
                    value={editProfile.avatar}
                    onChange={e => setEditProfile({...editProfile, avatar: e.target.value})}
                    className="flex-1 bg-[#0a0c10] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button 
                  onClick={() => setEditProfile({...editProfile, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`})}
                  className="text-xs text-indigo-400 hover:text-indigo-300 self-end mt-1"
                >
                  Slembi avatar
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-slate-400">Staða</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['online', 'offline', 'in-game'] as UserStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => setEditProfile({...editProfile, status})}
                      className={`py-2 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        editProfile.status === status 
                          ? getStatusColor(status) + ' border-current'
                          : 'bg-[#0a0c10] text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Circle className={`w-3 h-3 ${editProfile.status === status ? 'fill-current' : ''}`} />
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col gap-5">
                <h3 className="text-lg font-medium text-white">API Stillingar</h3>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-400">Gemini API Lykill (BYOK)</label>
                  <input 
                    type="password" 
                    value={editApiKey}
                    onChange={e => setEditApiKey(e.target.value)}
                    placeholder="Skildu eftir autt til að nota sjálfgefinn"
                    className="bg-[#0a0c10] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500">Notaðu þinn eigin lykil. Vistast aðeins í þínum vafra.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col gap-5">
                <h3 className="text-lg font-medium text-white">Raddstillingar (AI)</h3>
                
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-400">Hraði (Speaking Rate)</label>
                    <span className="text-sm text-indigo-400">{speakingRate.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" max="2.0" step="0.1" 
                    value={speakingRate}
                    onChange={e => setSpeakingRate(parseFloat(e.target.value))}
                    className="accent-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-400">Tónhæð (Pitch)</label>
                    <span className="text-sm text-indigo-400">{voicePitch > 0 ? '+' : ''}{voicePitch} cents</span>
                  </div>
                  <input 
                    type="range" 
                    min="-1200" max="1200" step="100" 
                    value={voicePitch}
                    onChange={e => setVoicePitch(parseInt(e.target.value))}
                    className="accent-indigo-500"
                  />
                </div>
              </div>

              <button 
                onClick={saveProfile}
                className="w-full mt-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors"
              >
                Vista stillingar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

