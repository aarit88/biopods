import React, { useState, useEffect } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { Stethoscope, Activity, Heart, RefreshCw, Zap, ShieldAlert, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { BioButton } from '../components/ui/BioButton';
import { motion, AnimatePresence } from 'framer-motion';

interface Procedure {
  id: string;
  name: string;
  progress: number;
  time: string;
  status: 'healing' | 'completed' | 'failed';
}

export const HealingCenter: React.FC = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([
    { id: '1', name: 'Antibody Synthesis: Node-Beta', progress: 65, time: '2:40 remaining', status: 'healing' },
    { id: '2', name: 'Pod-Sigma Rejuvenation', progress: 42, time: '1:15 remaining', status: 'healing' },
    { id: '3', name: 'Neural Spine Recalibration', progress: 88, time: '0:12 remaining', status: 'healing' },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [vitals, setVitals] = useState({ metabolic: 94, antibody: 88 });

  useEffect(() => {
    const interval = setInterval(() => {
      setProcedures(prev => prev.map(p => {
        if (p.status === 'completed') return p;
        const newProgress = Math.min(100, p.progress + Math.random() * 2);
        return {
          ...p,
          progress: newProgress,
          status: newProgress === 100 ? 'completed' : 'healing'
        };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setVitals({
        metabolic: Math.floor(Math.random() * 15) + 85,
        antibody: Math.floor(Math.random() * 20) + 80
      });
      setIsRefreshing(false);
    }, 1500);
  };

  const handleInitialize = (name: string) => {
    const id = Math.random().toString(36).substring(7);
    const newProc: Procedure = {
      id,
      name: `${name} Protocol`,
      progress: 0,
      time: 'In Progress...',
      status: 'healing'
    };
    setProcedures(prev => [newProc, ...prev]);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-bio-green/10 border border-bio-green/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,128,0.1)]">
            <Stethoscope className="text-bio-green" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-white tracking-tighter uppercase italic">
              Self-Healing <span className="text-bio-green">Action</span> Center
            </h2>
            <p className="text-slate-500 font-mono text-xs tracking-widest mt-1">Autonomous recovery and antibody deployment</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <BioCard className="p-8 lg:col-span-2 relative overflow-hidden bg-bio-dark/40 border-white/5 group">
          <div className="relative z-10">
            <h3 className="text-xl font-display font-black text-white mb-10 uppercase italic tracking-wider">Active Healing Procedures</h3>
            <div className="space-y-10">
              <AnimatePresence>
                {procedures.map((item) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${item.status === 'completed' ? 'bg-bio-green/20 text-bio-green' : 'bg-bio-cyan/20 text-bio-cyan animate-pulse'}`}>
                          {item.status === 'completed' ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-tight">{item.name}</h4>
                          <p className="text-[10px] text-slate-500 font-mono uppercase">{item.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black font-mono ${item.status === 'completed' ? 'text-bio-green' : 'text-bio-cyan'}`}>
                          {item.progress.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.status === 'completed' 
                          ? 'bg-bio-green shadow-[0_0_10px_#00ff80]' 
                          : 'bg-gradient-to-r from-bio-green to-bio-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]'
                        }`}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Heart size={150} className="text-bio-green animate-pulse" />
          </div>
        </BioCard>

        <BioCard className="p-8 space-y-8 bg-bio-dark/40 border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Vitality Indicators</h3>
            <Sparkles size={16} className="text-bio-green" />
          </div>
          
          <div className="space-y-8">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-bio-green/5 flex items-center justify-center text-bio-green border border-bio-green/10 shadow-[0_0_15px_rgba(0,255,128,0.05)]">
                <Activity size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                  <span className="text-slate-500">Metabolic Stability</span>
                  <span className="text-bio-green">{vitals.metabolic}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${vitals.metabolic}%` }}
                    className="h-full bg-bio-green rounded-full shadow-[0_0_8px_#00ff80]" 
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-bio-cyan/5 flex items-center justify-center text-bio-cyan border border-bio-cyan/10 shadow-[0_0_15px_rgba(0,229,255,0.05)]">
                <Zap size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                  <span className="text-slate-500">Antibody Potency</span>
                  <span className="text-bio-cyan">{vitals.antibody}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${vitals.antibody}%` }}
                    className="h-full bg-bio-cyan rounded-full shadow-[0_0_8px_#00e5ff]" 
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
              <BioButton 
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="primary" 
                className="w-full py-4 text-[10px] font-black tracking-widest uppercase italic gap-3 active:scale-95"
              >
                {isRefreshing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                {isRefreshing ? 'SCANNING BIOMETRICS...' : 'REFRESH VITALS'}
              </BioButton>
            </div>
          </div>
        </BioCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Cell Recovery', color: 'bio-green' },
          { label: 'Infection Purge', color: 'bio-red' },
          { label: 'DNA Repair', color: 'bio-cyan' },
          { label: 'Auto-Scaling', color: 'bio-amber' }
        ].map((proto, i) => (
          <BioCard key={i} className="p-8 flex flex-col items-center text-center gap-6 hover:border-bio-green/30 group transition-all cursor-pointer bg-bio-dark/40 border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-bio-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-${proto.color} group-hover:bg-${proto.color}/10 group-hover:scale-110 transition-all duration-500`}>
              <Zap size={28} />
            </div>
            <div className="relative z-10">
              <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-1">{proto.label}</h4>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Protocol v4.2</span>
            </div>
            <BioButton 
              onClick={() => handleInitialize(proto.label)}
              variant="ghost" 
              size="sm" 
              className="w-full py-3 text-[9px] font-black tracking-[0.2em] border-white/10 group-hover:border-bio-green/50 group-hover:text-bio-green active:scale-95 transition-all"
            >
              INITIALIZE
            </BioButton>
          </BioCard>
        ))}
      </div>

      {/* Healing Log Section */}
      <BioCard className="p-6 bg-bio-dark/40 border-white/5">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
          <Activity size={14} className="text-bio-green" />
          Autonomous Recovery Log
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-mono">
            <span className="text-bio-green">[SUCCESS]</span>
            <span className="text-slate-400">Node-Gamma metabolism stabilized. No intervention required.</span>
            <span className="ml-auto text-slate-600">14:22:10</span>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-mono">
            <span className="text-bio-red">[PURGED]</span>
            <span className="text-slate-400">Pod-Alpha-9 exhibited pathogenic behavior. DNA sequence flused.</span>
            <span className="ml-auto text-slate-600">14:15:05</span>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-mono">
            <span className="text-bio-cyan">[INFO]</span>
            <span className="text-slate-400">Antibody level restored to 88%. Swarm efficiency optimized.</span>
            <span className="ml-auto text-slate-600">13:58:30</span>
          </div>
        </div>
      </BioCard>
    </div>
  );
};
