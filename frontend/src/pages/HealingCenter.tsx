import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BioCard } from '../components/ui/BioCard';
import {
  Stethoscope, Activity, Heart, RefreshCw, CheckCircle2,
  Loader2, Sparkles, ShieldCheck, Database, Clock, TrendingUp,
  AlertTriangle, Trash2, Scale
} from 'lucide-react';
import { BioButton } from '../components/ui/BioButton';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImmuneResponse {
  id: string;
  eventId: string | null;
  responseType: string;
  actionTaken: string;
  successRate: number;
  responseTimeMs: number;
  triggeredBy: string;
  responseStatus: string;
  createdAt: string;
  dangerEvent?: {
    eventType: string;
    severity: string;
    status: string;
  } | null;
}

interface AuditLogEntry {
  id: string;
  actionType: string;
  actionDescription: string;
  performedBy: string;
  targetResource: string;
  status: string;
  createdAt: string;
}

interface HealingStats {
  totalResponses: number;
  completedResponses: number;
  memoryCells: number;
  avgSuccessRate: number;
}

interface ActiveProcedure {
  id: string;
  podId: string;
  actionType: string;
  label: string;
  progress: number;
  status: 'healing' | 'completed' | 'failed';
  startedAt: number;
}

// ─── Protocol Definitions ─────────────────────────────────────────────────────

const PROTOCOLS = [
  {
    label: 'Cell Recovery',
    actionType: 'cell-recovery',
    icon: Heart,
    color: 'bio-green',
    description: 'Restore degraded pods to healthy state',
    podTarget: 'pod-alpha-1',
  },
  {
    label: 'Infection Purge',
    actionType: 'infection-purge',
    icon: Trash2,
    color: 'bio-red',
    description: 'Flush pathogenic processes from infected pods',
    podTarget: 'pod-beta-2',
  },
  {
    label: 'DNA Repair',
    actionType: 'dna-repair',
    icon: Scale,
    color: 'bio-cyan',
    description: 'Rebalance resource allocation across nodes',
    podTarget: 'pod-gamma-3',
  },
  {
    label: 'Auto-Scaling',
    actionType: 'auto-scale',
    icon: TrendingUp,
    color: 'bio-amber',
    description: 'Scale replicas to absorb traffic surge',
    podTarget: 'pod-delta-4',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: 'text-bio-green',
  completed: 'text-bio-green',
  PENDING: 'text-bio-amber',
  FAILED: 'text-bio-red',
  failed: 'text-bio-red',
  MITIGATION_DEPLOYED: 'text-bio-cyan',
  NODE_REBOOT: 'text-bio-amber',
  NODE_REBOOT_COMPLETE: 'text-bio-green',
  TCELL_OLLAMA_ANALYSIS: 'text-bio-purple',
};

const BADGE: Record<string, string> = {
  SUCCESS: '[SUCCESS]',
  completed: '[SUCCESS]',
  PENDING: '[PENDING]',
  FAILED: '[FAILED]',
  NODE_REBOOT: '[REBOOT]',
  NODE_REBOOT_COMPLETE: '[RESTORED]',
  TCELL_OLLAMA_ANALYSIS: '[AI-TCELL]',
  MITIGATION_DEPLOYED: '[PATCHED]',
  SELF_HEAL_CELL_RECOVERY: '[RECOVERY]',
  SELF_HEAL_INFECTION_PURGE: '[PURGED]',
  SELF_HEAL_DNA_REPAIR: '[REPAIRED]',
  SELF_HEAL_AUTO_SCALE: '[SCALED]',
};

function badge(actionType: string, status: string) {
  return BADGE[actionType] || BADGE[status] || `[${status}]`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false });
}

function fmtMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const HealingCenter: React.FC = () => {
  const { immuneResponses: socketResponses } = useSocket();

  // DB data
  const [immuneResponses, setImmuneResponses] = useState<ImmuneResponse[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<HealingStats>({ totalResponses: 0, completedResponses: 0, memoryCells: 0, avgSuccessRate: 0 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active in-progress procedures (optimistic UI)
  const [activeProcedures, setActiveProcedures] = useState<ActiveProcedure[]>([]);

  // ── Fetch DB data ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [responsesRes, auditRes, statsRes] = await Promise.allSettled([
        apiService.immuneResponses.list(30),
        apiService.auditLogs.list(50),
        apiService.selfHeal.getStats(),
      ]);

      if (responsesRes.status === 'fulfilled') {
        setImmuneResponses(responsesRes.value.data);
      }
      if (auditRes.status === 'fulfilled') {
        setAuditLogs(auditRes.value.data);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
    } catch (err) {
      console.error('HealingCenter fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling every 8 seconds
  useEffect(() => {
    fetchData();
    pollingRef.current = setInterval(() => fetchData(true), 8000);

    const handleGlobalUpdate = () => {
      fetchData(true);
    };
    window.addEventListener('bio-mitigate-all', handleGlobalUpdate);
    window.addEventListener('bio-purge-all', handleGlobalUpdate);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      window.removeEventListener('bio-mitigate-all', handleGlobalUpdate);
      window.removeEventListener('bio-purge-all', handleGlobalUpdate);
    };
  }, [fetchData]);

  // Refresh stats only (lightweight)
  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiService.selfHeal.getStats();
      setStats(res.data);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Animate active procedures ─────────────────────────────────────────────

  useEffect(() => {
    if (activeProcedures.length === 0) return;

    const tick = setInterval(() => {
      setActiveProcedures(prev => {
        const updated = prev.map(p => {
          if (p.status === 'completed' || p.status === 'failed') return p;
          const elapsed = (Date.now() - p.startedAt) / 1000;
          const progress = Math.min(100, elapsed * 4); // ~25s to complete
          return {
            ...p,
            progress,
            status: progress >= 100 ? 'completed' : 'healing',
          } as ActiveProcedure;
        });

        // If all done, refresh DB data
        const allDone = updated.every(p => p.status === 'completed' || p.status === 'failed');
        if (allDone && prev.some(p => p.status === 'healing')) {
          setTimeout(() => fetchData(true), 2000);
        }

        return updated;
      });
    }, 300);

    return () => clearInterval(tick);
  }, [activeProcedures.length, fetchData]);

  // ── Socket responses → optimistic update ──────────────────────────────────

  useEffect(() => {
    if (socketResponses.length > 0) {
      fetchData(true);
    }
  }, [socketResponses, fetchData]);

  // ── Execute healing protocol ───────────────────────────────────────────────

  const handleInitialize = useCallback(async (proto: typeof PROTOCOLS[0]) => {
    const tempId = `proc-${Date.now()}`;

    // Optimistic UI
    setActiveProcedures(prev => [{
      id: tempId,
      podId: proto.podTarget,
      actionType: proto.actionType,
      label: proto.label,
      progress: 0,
      status: 'healing' as const,
      startedAt: Date.now(),
    }, ...prev].slice(0, 8));

    try {
      await apiService.actions.execute(proto.podTarget, proto.actionType);
    } catch (err) {
      console.error('Healing action failed:', err);
      setActiveProcedures(prev =>
        prev.map(p => p.id === tempId ? { ...p, status: 'failed' } : p)
      );
    }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  const allProcedures = [
    ...activeProcedures,
    ...immuneResponses.slice(0, 8 - activeProcedures.length).map(r => ({
      id: r.id,
      podId: r.triggeredBy || 'self-heal-engine',
      actionType: r.responseType,
      label: r.responseType.replace(/-/g, ' ').toUpperCase(),
      progress: r.responseStatus === 'completed' ? 100 : 75,
      status: (r.responseStatus === 'completed' ? 'completed' : 'healing') as 'completed' | 'healing',
      startedAt: new Date(r.createdAt).getTime(),
    })),
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-bio-green/10 border border-bio-green/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,128,0.1)]">
            <Stethoscope className="text-bio-green" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-white tracking-tighter uppercase italic">
              Self-Healing <span className="text-bio-green">Action</span> Center
            </h2>
            <p className="text-slate-500 font-mono text-xs tracking-widest mt-1">
              DB-integrated autonomous recovery engine
            </p>
          </div>
        </div>
        <BioButton
          onClick={() => fetchData()}
          disabled={loading}
          variant="ghost"
          size="sm"
          className="gap-2 text-xs border-white/10 hover:border-bio-green/40"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          REFRESH
        </BioButton>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Responses',
            value: stats.totalResponses,
            icon: ShieldCheck,
            color: 'bio-green',
            suffix: '',
          },
          {
            label: 'Completed',
            value: stats.completedResponses,
            icon: CheckCircle2,
            color: 'bio-cyan',
            suffix: '',
          },
          {
            label: 'Avg Success Rate',
            value: stats.avgSuccessRate.toFixed(1),
            icon: TrendingUp,
            color: 'bio-amber',
            suffix: '%',
          },
          {
            label: 'Memory Cells',
            value: stats.memoryCells,
            icon: Database,
            color: 'bio-purple',
            suffix: '',
          },
        ].map((s, i) => (
          <BioCard key={i} className="p-5 flex items-center gap-4 bg-bio-dark/40 border-white/5">
            <div className={`w-10 h-10 rounded-xl bg-${s.color}/10 flex items-center justify-center text-${s.color} border border-${s.color}/20 flex-shrink-0`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-black font-mono text-${s.color}`}>
                {loading ? '–' : `${s.value}${s.suffix}`}
              </p>
            </div>
          </BioCard>
        ))}
      </div>

      {/* Main Grid: Procedures + Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Procedures */}
        <BioCard className="p-8 lg:col-span-2 relative overflow-hidden bg-bio-dark/40 border-white/5 group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-display font-black text-white uppercase italic tracking-wider">
                Active Healing Procedures
              </h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-bio-green animate-pulse" />
                <span className="text-[10px] font-mono text-bio-green uppercase tracking-widest">
                  {activeProcedures.filter(p => p.status === 'healing').length} ACTIVE
                </span>
              </div>
            </div>

            <div className="space-y-6 max-h-80 overflow-y-auto pr-1 custom-scroll">
              <AnimatePresence>
                {allProcedures.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-slate-600"
                  >
                    <Heart size={40} className="mb-3 opacity-30" />
                    <p className="text-xs font-mono uppercase tracking-widest">No active procedures</p>
                    <p className="text-[10px] font-mono text-slate-700 mt-1">Initialize a protocol below to start healing</p>
                  </motion.div>
                ) : (
                  allProcedures.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-3"
                    >
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${item.status === 'completed' ? 'bg-bio-green/20 text-bio-green' : item.status === 'failed' ? 'bg-bio-red/20 text-bio-red' : 'bg-bio-cyan/20 text-bio-cyan animate-pulse'}`}>
                            {item.status === 'completed' ? <CheckCircle2 size={16} /> : item.status === 'failed' ? <AlertTriangle size={16} /> : <RefreshCw size={16} />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-tight">{item.label}</h4>
                            <p className="text-[10px] text-slate-500 font-mono uppercase">→ {item.podId}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-black font-mono ${item.status === 'completed' ? 'text-bio-green' : item.status === 'failed' ? 'text-bio-red' : 'text-bio-cyan'}`}>
                            {item.progress.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full rounded-full ${
                            item.status === 'completed'
                              ? 'bg-bio-green shadow-[0_0_10px_#00ff80]'
                              : item.status === 'failed'
                              ? 'bg-bio-red shadow-[0_0_10px_rgba(255,50,50,0.5)]'
                              : 'bg-gradient-to-r from-bio-green to-bio-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]'
                          }`}
                        />
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Heart size={150} className="text-bio-green animate-pulse" />
          </div>
        </BioCard>

        {/* Vitals + Recent Immune Responses */}
        <BioCard className="p-8 space-y-6 bg-bio-dark/40 border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Response Vitals</h3>
            <Sparkles size={16} className="text-bio-green" />
          </div>

          {/* Recent DB Immune Responses */}
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scroll">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-bio-green/50" />
              </div>
            ) : immuneResponses.length === 0 ? (
              <p className="text-[10px] font-mono text-slate-600 text-center py-4 uppercase tracking-widest">
                No DB responses yet
              </p>
            ) : (
              immuneResponses.slice(0, 6).map(r => (
                <div key={r.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-bio-green uppercase tracking-wider">
                      {r.responseType.replace(/-/g, ' ')}
                    </span>
                    <span className="text-[9px] font-mono text-bio-cyan">
                      {r.successRate?.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                    <Clock size={8} />
                    <span>{fmtTime(r.createdAt)}</span>
                    <span>•</span>
                    <span>{fmtMs(r.responseTimeMs)}</span>
                  </div>
                  {r.responseStatus === 'completed' && (
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-bio-green rounded-full shadow-[0_0_6px_#00ff80]"
                        style={{ width: `${r.successRate}%` }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-white/5">
            <BioButton
              onClick={refreshStats}
              disabled={statsLoading}
              variant="primary"
              className="w-full py-3 text-[10px] font-black tracking-widest uppercase italic gap-3"
            >
              {statsLoading ? <Loader2 className="animate-spin" size={14} /> : <Activity size={14} />}
              {statsLoading ? 'SCANNING DB...' : 'REFRESH STATS'}
            </BioButton>
          </div>
        </BioCard>
      </div>

      {/* Protocol Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {PROTOCOLS.map((proto, i) => {
          const Icon = proto.icon;
          const isRunning = activeProcedures.some(
            p => p.actionType === proto.actionType && p.status === 'healing'
          );

          return (
            <BioCard
              key={i}
              className={`p-8 flex flex-col items-center text-center gap-5 hover:border-bio-green/30 group transition-all cursor-pointer bg-bio-dark/40 border-white/5 relative overflow-hidden ${isRunning ? 'border-bio-cyan/30' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-bio-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-${proto.color} group-hover:bg-${proto.color}/10 group-hover:scale-110 transition-all duration-500 ${isRunning ? 'animate-pulse' : ''}`}>
                <Icon size={28} />
              </div>
              <div className="relative z-10">
                <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-1">{proto.label}</h4>
                <p className="text-[9px] font-mono text-slate-500 leading-relaxed">{proto.description}</p>
              </div>
              <BioButton
                onClick={() => handleInitialize(proto)}
                disabled={isRunning}
                variant="ghost"
                size="sm"
                className="w-full py-3 text-[9px] font-black tracking-[0.2em] border-white/10 group-hover:border-bio-green/50 group-hover:text-bio-green active:scale-95 transition-all"
              >
                {isRunning ? (
                  <><Loader2 size={10} className="animate-spin" /> RUNNING</>
                ) : 'INITIALIZE'}
              </BioButton>
            </BioCard>
          );
        })}
      </div>

      {/* Live Audit Log from DB */}
      <BioCard className="p-6 bg-bio-dark/40 border-white/5">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
          <Activity size={14} className="text-bio-green" />
          Autonomous Recovery Log
          <span className="ml-auto text-[9px] font-mono text-slate-600 normal-case tracking-normal">
            {auditLogs.length} entries from database
          </span>
        </h3>

        <div className="space-y-2 max-h-72 overflow-y-auto custom-scroll">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-bio-green/40" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-slate-600">
              <Database size={28} className="mb-2 opacity-40" />
              <p className="text-[10px] font-mono uppercase tracking-widest">No audit entries yet</p>
              <p className="text-[9px] font-mono text-slate-700 mt-1">Initialize a protocol to generate entries</p>
            </div>
          ) : (
            <AnimatePresence>
              {auditLogs.map((log, idx) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] font-mono hover:bg-white/8 transition-colors"
                >
                  <span className={`flex-shrink-0 font-black ${STATUS_COLOR[log.actionType] || STATUS_COLOR[log.status] || 'text-slate-400'}`}>
                    {badge(log.actionType, log.status)}
                  </span>
                  <span className="text-slate-400 flex-1 leading-relaxed">{log.actionDescription}</span>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-slate-600">{fmtTime(log.createdAt)}</span>
                    {log.targetResource && (
                      <span className="text-slate-700 text-[8px] uppercase">{log.targetResource}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </BioCard>
    </div>
  );
};
