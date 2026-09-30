import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Brain, ChevronRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

interface ReasoningStep {
  podId: string;
  step: string;
  content: string;
  timestamp: string;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export const ReasoningTerminal: React.FC = () => {
  const [logs, setLogs] = useState<ReasoningStep[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    
    socket.on('ai:reasoning', (data: ReasoningStep) => {
      setLogs((prev) => [...prev, { ...data, timestamp: new Date().toLocaleTimeString() }].slice(-20));
    });

    // Also listen for threat:detected to show T-Cell responses
    socket.on('threat:detected', (data: any) => {
      setLogs((prev) => [...prev, {
        podId: data.podId || 'unknown',
        step: 'T-CELL RESPONSE',
        content: JSON.stringify({
          threat_severity: data.label || 'MEDIUM',
          root_cause_analysis: data.details || 'Autonomic analysis complete',
          action_command: data.action || 'isolate --pod ' + (data.podId || 'unknown'),
          expected_outcome: 'Threat contained and neutralized'
        }, null, 2),
        timestamp: new Date().toLocaleTimeString()
      }].slice(-20));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-bio-darker/90 border border-bio-cyan/30 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.1)] h-full flex flex-col">
      <div className="bg-bio-cyan/10 px-4 py-3 border-b border-bio-cyan/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-bio-cyan" />
          <span className="text-[10px] font-black text-bio-cyan uppercase tracking-widest">Ollama AI Reasoning Terminal</span>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-bio-red animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-bio-amber animate-pulse delay-75" />
          <div className="w-1.5 h-1.5 rounded-full bg-bio-green animate-pulse delay-150" />
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 p-4 font-mono text-[10px] overflow-y-auto space-y-4 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-40 italic">
              <Brain size={32} className="mb-2" />
              <span>Waiting for T-Cell synaptic events...</span>
            </div>
          ) : (
            logs.map((log, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-1"
              >
                <div className="flex items-center gap-2 text-bio-cyan/60">
                  <span className="text-[8px] font-black">[{log.timestamp}]</span>
                  <span className="text-[8px] font-black uppercase tracking-tighter">NODE: {log.podId}</span>
                  <Activity size={10} className="animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <ChevronRight size={12} className="text-bio-green flex-shrink-0 mt-0.5" />
                  <div className="text-slate-300 w-full">
                    <span className="text-bio-green font-bold mr-2">{log.step}:</span>
                    <pre className="mt-2 bg-black/40 p-3 rounded-lg border border-white/5 text-bio-green/80 whitespace-pre-wrap break-all text-[9px]">
                      {log.content}
                    </pre>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
