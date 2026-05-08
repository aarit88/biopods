import React, { useState, useEffect } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { BioButton } from '../components/ui/BioButton';
import {
  ShieldCheck,
  ShieldAlert,
  Zap,
  Activity,
  Database,
  Crosshair
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';

export const ImmuneDashboard: React.FC = () => {
  const { lastTelemetry, anomalies: socketAnomalies, isConnected } = useSocket();
  const [healthScore, setHealthScore] = useState(98);
  const [activeThreats, setActiveThreats] = useState(0);
  const [protocolActive, setProtocolActive] = useState<string | null>(null);
  const [memoryCount, setMemoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [clustersRes, anomaliesRes, memoryRes] = await Promise.all([
          apiService.clusters.list(),
          apiService.telemetry.getRecentAnomalies(),
          apiService.memoryCells.list()
        ]);
        
        if (clustersRes.data.length > 0) {
          setHealthScore(clustersRes.data[0].immunityScore || 98);
        }
        
        setActiveThreats(anomaliesRes.data.filter((a: any) => a.severity === 'critical' || a.severity === 'high').length);
        setMemoryCount(memoryRes.data.length);
      } catch (e) {
        console.error("Failed to fetch dashboard data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (socketAnomalies.length > 0) {
      setActiveThreats(prev => Math.max(prev, socketAnomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length));
    }
  }, [socketAnomalies]);

  const executeProtocol = async (type: string, label: string) => {
    setProtocolActive(label);
    try {
      await apiService.actions.execute('all', type);
      setTimeout(() => setProtocolActive(null), 3000);
    } catch (e) {
      console.error(`${label} failed`, e);
      setProtocolActive(null);
    }
  };

  const handlePurge = () => executeProtocol('PURGE', 'Global Purge');
  const handleDeployAntibody = () => executeProtocol('MITIGATE', 'Antibody Deployment');
  const handleOptimizeMetabolism = () => executeProtocol('OPTIMIZE', 'Metabolic Optimization');

  return (
    <div className="w-full space-y-8">
      {/* Cinematic Scanning Line */}
      <motion.div 
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="fixed left-0 right-0 h-px bg-gradient-to-r from-transparent via-bio-green/20 to-transparent z-[5] pointer-events-none shadow-[0_0_15px_rgba(0,255,128,0.5)]"
      />

      {/* Protocol Overlay */}
      <AnimatePresence>
        {protocolActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-bio-green/20 backdrop-blur-xl border border-bio-green/50 px-8 py-4 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(0,255,128,0.3)]"
          >
            <div className="w-3 h-3 rounded-full bg-bio-green animate-ping" />
            <span className="text-white font-black text-xs tracking-widest uppercase italic">
              {protocolActive} Initiated
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vital Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <BioCard glowColor="green" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-bio-green/10 flex items-center justify-center text-bio-green border border-bio-green/20">
                <ShieldCheck size={24} />
              </div>
              <span className="text-xs font-mono text-bio-green">STABLE</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {loading ? <Skeleton className="h-8 w-16" /> : `${healthScore}%`}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Immunity Level</div>
            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-bio-green transition-all duration-1000" style={{ width: `${healthScore}%` }} />
            </div>
          </BioCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <BioCard glowColor={activeThreats > 0 ? "red" : "cyan"} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg ${activeThreats > 0 ? 'bg-bio-red/10 text-bio-red border-bio-red/20' : 'bg-bio-cyan/10 text-bio-cyan border-bio-cyan/20'} border flex items-center justify-center`}>
                <ShieldAlert size={24} />
              </div>
              <span className={`text-xs font-mono ${activeThreats > 0 ? 'text-bio-red animate-pulse' : 'text-bio-cyan'}`}>
                {activeThreats > 0 ? 'THREATS DETECTED' : 'CLEAR'}
              </span>
            </div>
            <div className={`text-3xl font-bold text-white mb-1 ${activeThreats > 0 ? 'glitch-text' : ''}`}>
              {loading ? <Skeleton className="h-8 w-10" /> : activeThreats}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Active Pathogens</div>
          </BioCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <BioCard glowColor="amber" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-bio-amber/10 flex items-center justify-center text-bio-amber border border-bio-amber/20">
                <Zap size={24} />
              </div>
              <span className="text-xs font-mono text-bio-amber">OPTIMIZING</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {loading ? <Skeleton className="h-8 w-20" /> : (lastTelemetry?.metrics?.cpu ? lastTelemetry.metrics.cpu.toFixed(1) + '%' : '42.1%')}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Metabolic Load</div>
          </BioCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <BioCard glowColor="cyan" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-bio-cyan/10 flex items-center justify-center text-bio-cyan border border-bio-cyan/20">
                <Database size={24} />
              </div>
              <span className="text-xs font-mono text-bio-cyan">SYNCED</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {loading ? <Skeleton className="h-8 w-20" /> : memoryCount}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Neural Memory Cells</div>
          </BioCard>
        </motion.div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <BioCard className="lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="text-bio-green" size={20} />
              <h3 className="text-lg font-bold text-white">Cluster Vitals Stream</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-bio-green' : 'bg-bio-red'} animate-pulse`} />
              <span className="text-[10px] font-mono text-slate-400 uppercase">{isConnected ? 'NEURAL LINK ACTIVE' : 'DISCONNECTED'}</span>
            </div>
          </div>
          <div className="p-8 h-[300px] flex items-end gap-2">
            {[...Array(24)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.random() * 60 + 20}%` }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: Math.random() * 2 + 1 }}
                className={`flex-1 ${i % 3 === 0 ? 'bg-bio-cyan/40' : 'bg-bio-green/20'} rounded-t-sm hover:bg-bio-green transition-all duration-300`}
              />
            ))}
          </div>
        </BioCard>

        <BioCard className="p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Crosshair size={20} className="text-bio-red" />
            Quick Response
          </h3>

          <div className="space-y-4">
            <div
              className="p-4 bg-white/5 rounded-xl border border-white/10 group hover:border-bio-red/50 transition-all cursor-pointer hover:bg-bio-red/5 active:scale-95"
              onClick={handlePurge}
            >
              <h4 className="text-sm font-bold text-white mb-1 group-hover:text-bio-red transition-colors">Immediate Purge</h4>
              <p className="text-xs text-slate-500">Isolate and eliminate detected infected pods across all namespaces.</p>
            </div>
            <div
              className="p-4 bg-white/5 rounded-xl border border-white/10 group hover:border-bio-cyan/50 transition-all cursor-pointer hover:bg-bio-cyan/5 active:scale-95"
              onClick={handleDeployAntibody}
            >
              <h4 className="text-sm font-bold text-white mb-1 group-hover:text-bio-cyan transition-colors">Deploy Antibody</h4>
              <p className="text-xs text-slate-500">Inject mitigation patch into deployment descriptors.</p>
            </div>
            <div
              className="p-4 bg-white/5 rounded-xl border border-white/10 group hover:border-bio-green/50 transition-all cursor-pointer hover:bg-bio-green/5 active:scale-95"
              onClick={handleOptimizeMetabolism}
            >
              <h4 className="text-sm font-bold text-white mb-1 group-hover:text-bio-green transition-colors">Optimize Metabolism</h4>
              <p className="text-xs text-slate-500">Re-balance resource allocations to stabilize vital signs.</p>
            </div>
          </div>

          <BioButton variant="primary" className="w-full py-4 text-xs tracking-widest font-black" onClick={handlePurge}>
            INITIATE GLOBAL PURGE
          </BioButton>
        </BioCard>
      </div>
    </div>
  );
};
