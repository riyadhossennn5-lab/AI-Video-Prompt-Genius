
import React, { useState, useEffect } from 'react';
import { AppState, AnalysisResult } from './types';
import VideoUploader from './components/VideoUploader';
import CharacterCard from './components/CharacterCard';
import SegmentItem from './components/SegmentItem';
import { analyzeVideo } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: 'idle',
    progress: 0,
    result: null,
    error: null,
  });

  const [loadingMessage, setLoadingMessage] = useState('Initializing analysis...');

  useEffect(() => {
    if (state.status === 'analyzing') {
      const messages = [
        'Encoding video buffer...',
        'Tracking emotional continuity...',
        'Mapping visual bridges between segments...',
        'Constructing character appearance memory...',
        'Generating consistent AI prompt chains...',
        'Scanning full timeline (up to 20m)...',
        'Finalizing narrative flow...'
      ];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingMessage(messages[i % messages.length]);
        i++;
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [state.status]);

  // Memory-safe frame extraction for large videos
  const extractFramesFromVideo = async (file: File): Promise<{ parts: any[], duration: number }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.muted = true;

      video.onloadedmetadata = async () => {
        const duration = video.duration;
        // Sample 250 frames for maximum density on long videos
        const maxFrames = 250;
        const interval = duration / maxFrames;
        const frames: any[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Target optimized resolution for deep vision analysis
        const targetHeight = 448; // Optimized for Gemini's internal vision grid
        const scale = Math.min(1, targetHeight / video.videoHeight);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;

        setLoadingMessage(`Scanning ${Math.floor(duration/60)}m ${Math.floor(duration%60)}s footage (${maxFrames} density anchors)...`);

        for (let i = 0; i < maxFrames; i++) {
          const time = i * interval;
          video.currentTime = time;
          await new Promise(r => { video.onseeked = r; });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.45).split(',')[1];
            frames.push({
              inlineData: {
                data: base64,
                mimeType: 'image/jpeg'
              }
            });
          }
        }
        URL.revokeObjectURL(video.src);
        resolve({ parts: frames, duration });
      };
      video.onerror = (e) => reject(new Error("Failed to process video file. Ensure it is a valid MP4/MOV/WebM."));
    });
  };

  const handleVideoSelection = async (file: File | null, url: string) => {
    setState(prev => ({ ...prev, status: 'uploading', error: null }));
    try {
      let parts: any[] = [];
      let totalDuration = 0;

      if (file) {
        setState(prev => ({ ...prev, status: 'analyzing' }));
        const result = await extractFramesFromVideo(file);
        parts = result.parts;
        totalDuration = result.duration;
      } else {
        const response = await fetch(url);
        const blob = await response.blob();
        const tempFile = new File([blob], "video_source", { type: blob.type });
        setState(prev => ({ ...prev, status: 'analyzing' }));
        const result = await extractFramesFromVideo(tempFile);
        parts = result.parts;
        totalDuration = result.duration;
      }

      setState(prev => ({ ...prev, status: 'analyzing' }));
      const result = await analyzeVideo(parts, totalDuration);
      setState(prev => ({ ...prev, status: 'completed', result }));
    } catch (err: any) {
      console.error('Analysis Error:', err);
      let errorMessage = err.message || "An unexpected error occurred.";
      if (errorMessage.includes("string length") || errorMessage.includes("memory") || errorMessage.includes("allocation")) {
        errorMessage = "Memory overflow. The video analysis hit a technical limit. Try a shorter file.";
      }
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
    }
  };

  const copyAllPrompts = () => {
    if (!state.result) return;
    const all = state.result.segments.map((s, i) => `[Segment ${i+1}] ${s.startTime}-${s.endTime}\nPROMPT: ${s.generatedPrompt}\nBRIDGE: ${s.transitionBridge}`).join('\n\n');
    navigator.clipboard.writeText(all);
    alert('Full prompt chain copied!');
  };

  const downloadJson = () => {
    if (!state.result) return;
    const blob = new Blob([JSON.stringify(state.result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "storyboard_continuity_export.json";
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 pb-0 font-sans selection:bg-blue-500/30 flex flex-col">
      <nav className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/><rect width="12" height="12" x="2" y="6" rx="2"/></svg>
            </div>
            <span className="font-black text-xl tracking-tighter uppercase text-white">PROMPT GENIUS <span className="text-blue-500 text-xs ml-1 font-bold tracking-widest">PRO</span></span>
          </div>
          {state.result && (
            <div className="flex gap-2">
              <button onClick={copyAllPrompts} className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                Copy All
              </button>
              <button onClick={downloadJson} className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-lg shadow-blue-600/20">Export JSON</button>
              <button onClick={() => setState({status: 'idle', progress: 0, result: null, error: null})} className="p-1.5 text-slate-400 hover:text-white transition bg-slate-800 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 mt-12 flex-grow w-full">
        {state.status === 'idle' && (
          <div className="text-center space-y-12 py-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Full Duration Logic (00:00 - END) Active
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none text-white">
                Cinematic Video <br/> <span className="text-blue-500">Continuity.</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                Optimized for 20-minute masterclips. We analyze the full timeline to generate 
                interlocked prompt chains for professional AI video pipelines.
              </p>
            </div>
            <div className="flex justify-center">
              <VideoUploader onVideoSelected={handleVideoSelection} disabled={false} />
            </div>
          </div>
        )}

        {(state.status === 'uploading' || state.status === 'analyzing') && (
          <div className="py-32 text-center space-y-10 max-w-xl mx-auto">
            <div className="inline-flex relative">
               <div className="w-24 h-24 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center text-blue-500">
                 <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
               </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-white">{loadingMessage}</h2>
              <p className="text-slate-500 text-lg animate-pulse font-medium italic">Mapping the entire video duration to ensure 100% storyboard coverage...</p>
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="max-w-2xl mx-auto bg-red-900/10 border border-red-500/20 rounded-3xl p-10 text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Continuity Interrupted</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{state.error}</p>
            </div>
            <button 
              onClick={() => setState({status: 'idle', progress: 0, result: null, error: null})} 
              className="px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-slate-200 transition shadow-xl uppercase text-xs tracking-widest"
            >
              Restart Session
            </button>
          </div>
        )}

        {state.status === 'completed' && state.result && (
          <div className="space-y-16">
            {/* Global Continuity Summary */}
            <section className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-3xl p-10 border border-slate-700/50 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div className="flex flex-col md:flex-row gap-10 relative z-10">
                <div className="flex-grow space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase bg-blue-600 px-3 py-1 rounded-full tracking-[0.2em] text-white shadow-sm mb-4 inline-block">Full Duration Narrative</span>
                    <h2 className="text-4xl font-black text-white leading-tight">{state.result.globalSummary}</h2>
                  </div>
                  <div className="bg-black/40 p-6 rounded-2xl border border-slate-800 font-mono text-sm text-slate-300 leading-relaxed italic shadow-inner">
                    {state.result.fullVideoSummaryPrompt}
                  </div>
                </div>
                <div className="md:w-72 bg-slate-900/80 p-6 rounded-2xl border border-slate-700/50 space-y-4">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Master Arc</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{state.result.emotionalArc}</p>
                </div>
              </div>
            </section>

            {/* Character Repository */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">Identity Persistence</h3>
                  <p className="text-slate-500 text-sm font-medium">Verified character descriptors for consistent generations</p>
                </div>
                <div className="h-px flex-grow mx-8 bg-slate-800 hidden md:block"></div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{state.result.characterMemory.length} Persona Models</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.result.characterMemory.map(char => (
                  <CharacterCard key={char.id} character={char} />
                ))}
              </div>
            </section>

            {/* Chained Timeline */}
            <section className="space-y-12">
              <div className="flex items-center justify-between border-b border-slate-800 pb-8">
                <h3 className="text-3xl font-black text-white">Full Length Prompt Chain</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bridged Coverage</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">100% Narrative Mapped</span>
                </div>
              </div>
              <div className="space-y-12">
                {state.result.segments.map((seg, idx) => (
                  <SegmentItem key={idx} index={idx} segment={seg} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="group mt-auto w-full border-t border-slate-800/30 bg-[#020617] py-6 px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 -left-[100%] w-[200%] h-full bg-gradient-to-r from-transparent via-blue-500/[0.03] to-transparent skew-x-12 animate-[shimmer_8s_infinite_linear]"></div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4 relative z-10">
          <div className="flex flex-col items-center">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">
              © {new Date().getFullYear()} PROMPT GENIUS PRO
            </p>
            <div className="flex flex-col items-center mt-2">
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-700 text-center">
                THIS TOOL CREATED BY
              </p>
              <span className="text-[13px] text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 bg-[length:200%_auto] animate-[shimmer_4s_infinite_linear] font-black tracking-[0.2em] inline-block drop-shadow-[0_0_8px_rgba(59,130,246,0.2)]">
                RK RIYAD
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
