import React, { useState, useMemo } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { ShieldAlert, AlertTriangle, Bug, Lock, Skull, ShieldCheck, Filter, Search } from 'lucide-react';
import { BioButton } from '../components/ui/BioButton';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export const ThreatDetection: React.FC = () => {
  const { anomalies } = useSocket();
  const [filter, setFilter] = useState<'ALL' | 'DANGER' | 'WARNING' | 'INFO'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isolatingId, setIsolatingId] = useState<string | null>(null);

  const filteredThreats = useMemo(() => {
    return anomalies.filter(a => {
      const matchesFilter = filter === 'ALL' || a.label === filter;
      const matchesSearch = a.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           a.details.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [anomalies, filter, searchTerm]);

  const handlePurgeAll = async () => {
    if (confirm("Execute Global Purge: This will terminate all pods in DANGER or WARNING states. Proceed?")) {
      try {
        await apiService.actions.execute('all', 'PURGE');
        alert("Global Purge sequence initiated across all namespaces.");
      } catch (e) {
        console.error("Purge failed", e);
      }
    }
  };

  const handleIsolate = async (id: string) => {
    setIsolatingId(id);
    try {
      await apiService.actions.execute('all', 'MITIGATE'); // Simulated isolation
      setTimeout(() => {
        setIsolatingId(null);
        alert(`Target ${id} has been isolated in a secure bio-containment buffer.`);
      }, 1500);
    } catch (e) {
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
              Threat <span className="text-bio-red">Detection</span>
            </h2>
            <p className="text-slate-500 font-mono text-xs tracking-widest mt-1">Real-time anomaly monitoring and containment</p>
          </div>
        </div>
        <BioButton 
          variant="danger" 
          className="animate-pulse shadow-[0_0_20px_rgba(255,61,0,0.3)] px-8 py-4 font-black tracking-[0.2em] italic"
          onClick={handlePurgeAll}
        >
          PURGE ALL THREATS
        </BioButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="space-y-6">
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
                    {f === 'ALL' ? anomalies.length : anomalies.filter(a => a.label === f).length}
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
              Auto-containment is ENABLED. Pathogens exceeding 80% threat probability will be auto-purged.
            </p>
          </BioCard>
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
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {filteredThreats.map((threat, i) => {
                    const Icon = getSeverityIcon(threat.label);
                    return (
                      <motion.tr 
                        key={`${threat.type}-${i}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-bio-green/5 transition-colors group"
                      >
                        <td className="px-6 py-4 font-mono text-[10px] text-slate-500">#{Math.random().toString(36).substring(7).toUpperCase()}</td>
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
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleIsolate(threat.type)}
                              disabled={isolatingId === threat.type}
                              className="px-4 py-1.5 bg-bio-red/10 border border-bio-red/20 rounded-lg text-[9px] font-black text-bio-red hover:bg-bio-red transition-all hover:text-white uppercase tracking-widest disabled:opacity-50"
                            >
                              {isolatingId === threat.type ? 'ISOLATING...' : 'ISOLATE'}
                            </button>
                            <button className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest">
                              DETAILS
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {filteredThreats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                      <ShieldCheck className="mx-auto mb-4 text-bio-green opacity-20" size={48} />
                      No threats detected in the current neural slice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </BioCard>
      </div>
    </div>
  );
};
