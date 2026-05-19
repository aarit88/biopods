import React, { useState, useMemo } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { ShieldAlert, AlertTriangle, Bug, Skull, ShieldCheck, Filter, Search } from 'lucide-react';
import { BioButton } from '../components/ui/BioButton';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

import { ReasoningTerminal } from '../components/ReasoningTerminal';

export const ThreatDetection: React.FC = () => {
  const { anomalies } = useSocket();
  const [filter, setFilter] = useState<'ALL' | 'DANGER' | 'WARNING' | 'INFO'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isolatingId, setIsolatingId] = useState<string | null>(null);
  const [isolatedThreats, setIsolatedThreats] = useState<Set<string>>(new Set());
  const [expandedThreat, setExpandedThreat] = useState<string | null>(null);

  const filteredThreats = useMemo(() => {
    return anomalies
      .map(a => ({
        ...a,
        type: a.type || a.eventType || 'Unknown Threat',
        details: a.details || 'No additional metadata available',
        label: (() => {
          const raw = (a.label || a.severity || 'INFO').toUpperCase();
          if (raw === 'CRITICAL' || raw === 'HIGH') return 'DANGER';
          if (raw === 'MEDIUM') return 'WARNING';
          return raw;
        })(),
      }))
      .filter(threat => {
        const matchesFilter = filter === 'ALL' || threat.label === filter;
        const matchesSearch = threat.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             threat.details.toLowerCase().includes(searchTerm.toLowerCase());
        const isNotIsolated = !isolatedThreats.has(`${threat.podId}-${threat.type}`);
        return matchesFilter && matchesSearch && isNotIsolated;
      });
  }, [anomalies, filter, searchTerm, isolatedThreats]);

  React.useEffect(() => {
    const handleMitigateAll = () => {
      setIsolatedThreats(prev => {
        const next = new Set(prev);
        anomalies.forEach(t => next.add(`${t.podId}-${t.type}`));
        return next;
      });
    };
    const handlePurgeAllGlobal = () => {
      setIsolatedThreats(prev => {
        const next = new Set(prev);
        anomalies.filter(t => {
          const raw = (t.label || t.severity || 'INFO').toUpperCase();
          return raw === 'CRITICAL' || raw === 'HIGH' || raw === 'MEDIUM' || raw === 'DANGER' || raw === 'WARNING';
        }).forEach(t => next.add(`${t.podId}-${t.type}`));
        return next;
      });
    };
    
    window.addEventListener('bio-mitigate-all', handleMitigateAll);
    window.addEventListener('bio-purge-all', handlePurgeAllGlobal);
    
    return () => {
      window.removeEventListener('bio-mitigate-all', handleMitigateAll);
      window.removeEventListener('bio-purge-all', handlePurgeAllGlobal);
    };
  }, [anomalies]);

  const handleInjectThreat = async (threatType: string) => {
    const scenarios: Record<string, { podId: string; type: string; metrics: Record<string, number> }> = {
      thermal: { podId: 'turbine-core-01', type: 'THERMAL SURGE', metrics: { cpu: 45, memory: 60, temp: 92 } },
      ddos: { podId: 'control-system-01', type: 'DDOS SPIKE', metrics: { cpu: 98, memory: 40, temp: 42 } },
      sqli: { podId: 'power-grid-link', type: 'SQL INJECTION', metrics: { cpu: 40, memory: 96, temp: 38 } },
    };
    const scenario = scenarios[threatType] || scenarios.thermal;
    try {
      await axios.post('http://localhost:5000/api/telemetry', scenario);
    } catch (e) {
      console.error("Injection failed", e);
    }
  };

  const handlePurgeAll = async () => {
    if (confirm("Execute Global Purge: This will terminate all pods in DANGER or WARNING states. Proceed?")) {
      try {
        await apiService.actions.execute('all', 'PURGE');
        const threatsToPurge = filteredThreats.filter(t => t.label === 'DANGER' || t.label === 'WARNING');
        setIsolatedThreats(prev => {
          const next = new Set(prev);
          threatsToPurge.forEach(t => next.add(`${t.podId}-${t.type}`));
          return next;
        });
        alert("Global Purge sequence initiated across all namespaces.");
      } catch (e) {
        console.error("Purge failed", e);
      }
    }
  };

  const handleIsolate = async (threat: { podId: string; type: string; action?: string }) => {
    const id = `${threat.podId}-${threat.type}`;
    setIsolatingId(id);
    const actionType = (threat.action || '').toUpperCase().includes('MITIGATE') ? 'MITIGATE' : 'ISOLATE';
    try {
      await apiService.actions.execute(threat.podId, actionType); 
      setTimeout(() => {
        setIsolatingId(null);
        setIsolatedThreats(prev => new Set(prev).add(id));
      }, 1500);
    } catch {
      setIsolatingId(null);
    }
  };

  const getSeverityIcon = (label: string) => {
    switch (label) {
      case 'DANGER': return Skull;
      case 'WARNING': return AlertTriangle;
      default: return Bug;
    }
  };

  const getSeverityColor = (label: string) => {
    switch (label) {
      case 'DANGER': return 'text-bio-red';
      case 'WARNING': return 'text-bio-amber';
      default: return 'text-bio-cyan';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-bio-red/10 border border-bio-red/20 flex items-center justify-center shadow-[0_0_20px_rgba(255,61,0,0.1)]">
            <ShieldAlert className="text-bio-red" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-white tracking-tighter uppercase italic">
              Immune <span className="text-bio-red">Response</span>
            </h2>
            <p className="text-slate-500 font-mono text-xs tracking-widest mt-1">Autonomic threat neutralisation and containment</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <BioButton 
            variant="ghost" 
            className="border-bio-amber/30 text-bio-amber text-[10px]"
            onClick={() => handleInjectThreat('thermal')}
          >
            INJECT THERMAL SURGE
          </BioButton>
          <BioButton 
            variant="ghost" 
            className="border-bio-red/30 text-bio-red text-[10px]"
            onClick={() => handleInjectThreat('ddos')}
          >
            INJECT DDOS SPIKE
          </BioButton>
          <BioButton 
            variant="ghost" 
            className="border-bio-cyan/30 text-bio-cyan text-[10px]"
            onClick={() => handleInjectThreat('sqli')}
          >
            SQL INJECTION CAMPAIGN
          </BioButton>
          <BioButton 
            variant="danger" 
            className="animate-pulse shadow-[0_0_20px_rgba(255,61,0,0.3)] px-8 py-4 font-black tracking-[0.2em] italic"
            onClick={handlePurgeAll}
          >
            PURGE ALL
          </BioButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Filters & Terminal */}
        <div className="space-y-6 flex flex-col h-full">
          <BioCard className="p-6 space-y-6 bg-bio-dark/30 border-white/5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} /> Refine Neural Feed
            </h3>
            
            <div className="space-y-2">
              {(['ALL', 'DANGER', 'WARNING', 'INFO'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-[10px] font-black tracking-widest uppercase flex items-center justify-between ${
                    filter === f 
                    ? 'bg-bio-green/10 border-bio-green/30 text-bio-green shadow-[0_0_15px_rgba(0,255,128,0.1)]' 
                    : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {f} 
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-[9px]">
                    {f === 'ALL' ? anomalies.length : anomalies.filter(a => (a.label || a.severity || 'INFO').toUpperCase().replace('CRITICAL', 'DANGER').replace('HIGH', 'DANGER') === f).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input 
                  type="text" 
                  placeholder="Search signatures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-bio-darker border border-white/10 rounded-xl py-3 pl-10 pr-4 text-[10px] font-mono text-white focus:outline-none focus:border-bio-green/50 transition-all"
                />
              </div>
            </div>
          </BioCard>

          <BioCard className="p-6 bg-bio-red/5 border-bio-red/10">
            <h4 className="text-bio-red text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <ShieldCheck size={14} /> Protocol Active
            </h4>
            <p className="text-slate-400 text-[10px] leading-relaxed font-mono">
              Autonomic T-Cell response is ENABLED. High-severity threats are automatically mitigated via Ollama LLM reasoning.
            </p>
          </BioCard>

          <div className="flex-1 min-h-[400px]">
            <ReasoningTerminal />
          </div>
        </div>

        {/* Threat Table */}
        <BioCard className="lg:col-span-3 overflow-hidden border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bio-dark/50 border-b border-white/10">
                  <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Signature ID</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Threat Type</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Severity</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Source Metadata</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Detected</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Containment</th>
                </tr>
              </thead>
              <AnimatePresence mode="popLayout">
                  {filteredThreats.map((threat, i) => {
                    const Icon = getSeverityIcon(threat.label);
                    const uniqueId = `${threat.podId}-${threat.type}-${i}`;
                    const isIsolating = isolatingId === `${threat.podId}-${threat.type}`;
                    const isExpanded = expandedThreat === uniqueId;
                    
                    return (
                      <motion.tbody 
                        key={uniqueId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: i * 0.05 }}
                        className="group"
                      >
                        <tr className="hover:bg-bio-green/5 transition-colors border-b border-white/5">
                        <td className="px-6 py-4 font-mono text-[10px] text-slate-500">#{threat.dbEventId ? threat.dbEventId.substring(0, 8).toUpperCase() : btoa(uniqueId).substring(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-current/10 ${getSeverityColor(threat.label)}`}>
                              <Icon size={14} />
                            </div>
                            <span className="text-sm font-bold text-white uppercase tracking-tight">{threat.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            threat.label === 'DANGER' ? 'bg-bio-red text-white' : 
                            threat.label === 'WARNING' ? 'bg-bio-amber/20 text-bio-amber border border-bio-amber/20' :
                            'bg-bio-cyan/20 text-bio-cyan border border-bio-cyan/20'
                          }`}>
                            {threat.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-slate-400 font-mono italic">
                          {threat.details.split(' ')[0]} / {threat.details.split(' ').slice(-1)}
                        </td>
                        <td className="px-6 py-4 text-[10px] text-slate-500 font-mono">
                          {new Date().toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-80 hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleIsolate(threat)}
                              disabled={isIsolating}
                              className="px-4 py-1.5 bg-bio-red/10 border border-bio-red/20 rounded-lg text-[9px] font-black text-bio-red hover:bg-bio-red transition-all hover:text-white uppercase tracking-widest disabled:opacity-50"
                            >
                              {isIsolating ? 'ISOLATING...' : 'ISOLATE'}
                            </button>
                            <button 
                              onClick={() => setExpandedThreat(isExpanded ? null : uniqueId)}
                              className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest"
                            >
                              DETAILS
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-white/5 border-b border-white/10">
                          <td colSpan={6} className="px-6 py-4 text-xs font-mono text-slate-300">
                            <div className="p-4 bg-bio-dark/50 rounded-lg border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div>
                                <h4 className="text-bio-cyan font-bold uppercase mb-2">Threat Metadata:</h4>
                                <p className="mb-2"><strong>Pod Target:</strong> {threat.podId || 'Unknown'}</p>
                                <p className="mb-2"><strong>Details:</strong> {threat.details || 'No additional metadata available.'}</p>
                                {threat.action && <p className="text-bio-amber"><strong>Recommended Action:</strong> {threat.action}</p>}
                              </div>
                              
                              <div className="flex-shrink-0">
                                <BioButton 
                                  variant="danger"
                                  onClick={() => handleIsolate(threat)}
                                  disabled={isIsolating}
                                  className="gap-2 text-[10px] font-mono shadow-[0_0_15px_rgba(255,61,0,0.3)] animate-pulse"
                                >
                                  <ShieldAlert size={14} /> EXECUTE MITIGATION
                                </BioButton>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      </motion.tbody>
                    );
                  })}
                </AnimatePresence>
                {filteredThreats.length === 0 && (
                  <tbody>
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                      <ShieldCheck className="mx-auto mb-4 text-bio-green opacity-20" size={48} />
                      No threats detected in the current neural slice.
                    </td>
                  </tr>
                  </tbody>
                )}
            </table>
          </div>
        </BioCard>
      </div>
    </div>
  );
};
