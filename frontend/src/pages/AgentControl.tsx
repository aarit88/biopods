import React, { useState, useEffect } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { Microscope, Zap, Play, Square, RefreshCcw, Terminal as TerminalIcon, Shield, X, Loader2 } from 'lucide-react';
import { BioButton } from '../components/ui/BioButton';
import { apiService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface Agent {
  id: string;
  agentName: string;
  status: string;
  agentType: string;
  confidenceScore: number;
}

export const AgentControl: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<{msg: string, time: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthProgress, setSynthProgress] = useState(0);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data } = await apiService.agents.list();
        setAgents(data);
        addLog("Neural connection to agent swarm established.");
      } catch (e) {
        addLog("Failed to sync with agent swarm.");
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ msg, time }, ...prev].slice(0, 50));
  };

  const handleControl = async (id: string, name: string, action: string) => {
    addLog(`Transmitting ${action} signal to agent ${name}...`);
    try {
      await apiService.agents.control(id, action);
      addLog(`Signal ACK: ${name} is now processing ${action} protocol.`);
      setAgents(prev => prev.map(a => 
        a.id === id ? { ...a, status: action === 'START' ? 'active' : action === 'STOP' ? 'standby' : 'resetting' } : a
      ));
    } catch (e) {
      addLog(`Error: Agent ${name} failed to acknowledge ${action} signal.`);
    }
  };

  const handleSynthesize = () => {
    setIsSynthesizing(true);
    setSynthProgress(0);
    addLog("Initiating agent protein synthesis...");
    
    const interval = setInterval(() => {
      setSynthProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          completeSynthesis();
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };

  const completeSynthesis = () => {
    const newId = `syn-${Math.floor(Math.random() * 1000)}`;
    const newAgent: Agent = {
      id: newId,
      agentName: `Antibody-${newId.split('-')[1]}`,
      status: 'active',
      agentType: 'Defense',
      confidenceScore: 100
    };
    
    setAgents(prev => [newAgent, ...prev]);
    setIsSynthesizing(false);
    addLog(`Agent ${newAgent.agentName} successfully synthesized and deployed.`);
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00ff80', '#00e5ff', '#ffffff']
    });
  };

  return (
    <div className="space-y-8 relative">
      {/* Cinematic Neural Stream Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden -z-10">
        <div className="flex gap-4 h-full">
          {[...Array(10)].map((_, i) => (
            <motion.div 
              key={i}
              animate={{ y: ['-100%', '100%'] }}
              transition={{ duration: Math.random() * 20 + 20, repeat: Infinity, ease: "linear", delay: i * 2 }}
              className="text-[10px] font-mono break-all w-8 leading-none text-bio-green"
            >
              {Array.from({ length: 50 }).map(() => Math.round(Math.random())).join('\n')}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Synthesis Modal */}
      <AnimatePresence>
        {isSynthesizing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-bio-darker/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-bio-dark border border-bio-green/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,255,128,0.2)]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-display font-black text-white uppercase italic">Agent <span className="text-bio-green">Synthesis</span></h3>
                <Loader2 className="animate-spin text-bio-green" size={24} />
              </div>

              <div className="space-y-6">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  <span>{synthProgress < 30 ? 'Sequencing DNA...' : synthProgress < 60 ? 'Folding Proteins...' : 'Coating Neural Membrane...'}</span>
                  <span className="text-bio-green">{synthProgress}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${synthProgress}%` }}
                    className="h-full bg-bio-green shadow-[0_0_15px_#00ff80]"
                  />
                </div>
              </div>

              <div className="mt-12 p-4 bg-bio-green/5 border border-bio-green/20 rounded-2xl flex items-center gap-4">
                <Zap className="text-bio-green animate-pulse" size={20} />
                <p className="text-[10px] text-slate-400 font-mono">WARNING: High metabolic load detected during neuro-genesis.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-black text-white tracking-tighter uppercase italic">
            Agent <span className="text-bio-green">Control</span> Center
          </h2>
          <p className="text-slate-500 font-mono text-xs tracking-widest mt-1">Manage autonomous AI immune agents</p>
        </div>
        <BioButton 
          variant="primary" 
          className="flex items-center gap-2 px-6 py-4 text-[10px] font-black tracking-widest active:scale-95"
          onClick={handleSynthesize}
          disabled={isSynthesizing}
        >
          <Zap size={16} />
          SYNTHESIZE NEW AGENT
        </BioButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agent Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {agents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                layout
              >
                <BioCard className="p-6 border-white/5 hover:border-bio-green/20 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1">
                    <div className="w-16 h-16 bg-bio-green/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-bio-green/5 border border-bio-green/10 flex items-center justify-center group-hover:bg-bio-green/10 transition-colors">
                        <Microscope className="text-bio-green" size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white group-hover:text-bio-green transition-colors">{agent.agentName}</h4>
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{agent.agentType} Module</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 ${agent.status === 'active' ? 'bg-bio-green/10 border-bio-green/20 text-bio-green' : 'bg-white/5 text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-bio-green animate-pulse' : 'bg-slate-600'}`} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{agent.status}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-8 px-5 py-4 bg-bio-darker rounded-2xl border border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-bio-green/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Confidence Index</span>
                      <div className="text-2xl font-display font-black text-white italic">{agent.confidenceScore}%</div>
                    </div>
                    <div className="relative z-10 w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${agent.confidenceScore}%` }}
                        className="h-full bg-bio-green rounded-full shadow-[0_0_10px_rgba(0,255,128,0.5)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => handleControl(agent.id, agent.agentName, 'START')}
                      className="flex items-center justify-center gap-2 py-2.5 bg-white/5 rounded-xl border border-white/10 text-[9px] font-black text-slate-400 hover:text-bio-green hover:bg-bio-green/10 hover:border-bio-green/20 transition-all uppercase tracking-widest active:scale-95"
                    >
                      <Play size={14} fill="currentColor" /> START
                    </button>
                    <button 
                      onClick={() => handleControl(agent.id, agent.agentName, 'STOP')}
                      className="flex items-center justify-center gap-2 py-2.5 bg-white/5 rounded-xl border border-white/10 text-[9px] font-black text-slate-400 hover:text-bio-red hover:bg-bio-red/10 hover:border-bio-red/20 transition-all uppercase tracking-widest active:scale-95"
                    >
                      <Square size={14} fill="currentColor" /> STOP
                    </button>
                    <button 
                      onClick={() => handleControl(agent.id, agent.agentName, 'RESET')}
                      className="flex items-center justify-center gap-2 py-2.5 bg-white/5 rounded-xl border border-white/10 text-[9px] font-black text-slate-400 hover:text-bio-cyan hover:bg-bio-cyan/10 hover:border-bio-cyan/20 transition-all uppercase tracking-widest active:scale-95"
                    >
                      <RefreshCcw size={14} /> RESET
                    </button>
                  </div>
                </BioCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Activity Log */}
        <BioCard className="p-0 border-white/5 flex flex-col h-full bg-bio-darker/50">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-bio-dark/30">
            <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest italic">
              <TerminalIcon size={18} className="text-bio-green" />
              Agent Activity Stream
            </h3>
            <span className="text-[10px] font-mono text-slate-500 animate-pulse">LIVE FEED</span>
          </div>
          <div className="flex-1 p-6 overflow-y-auto font-mono text-[11px] space-y-4 max-h-[600px] scrollbar-thin scrollbar-thumb-white/10">
            {logs.map((log, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 text-slate-400"
              >
                <span className="text-bio-cyan opacity-50">[{log.time}]</span>
                <span className={log.msg.includes('ACK') || log.msg.includes('established') || log.msg.includes('successfully') ? 'text-bio-green' : ''}>
                  {log.msg}
                </span>
              </motion.div>
            ))}
          </div>
          <div className="p-6 border-t border-white/5 bg-bio-dark/30">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <Shield size={12} className="text-bio-green" />
              Neural Encryption: AES-256-BIO
            </div>
          </div>
        </BioCard>
      </div>
    </div>
  );
};
