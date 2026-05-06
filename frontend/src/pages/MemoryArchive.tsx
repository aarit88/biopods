import React, { useState } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { Database, Search, History, Download, HardDrive, Cpu, Archive, FileJson, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MemoryArchive: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [storageUsed] = useState(72);
  const [historyData] = useState([40, 60, 35, 80, 55, 90, 75, 85, 45, 95]);

  const recentExtractions = [
    { id: 'MEM-01X', type: 'THREAT_SIG', size: '24KB', date: '2026-05-06 14:22', hash: 'SHA256:8821...AF22' },
    { id: 'MEM-02X', type: 'AGENT_LOG', size: '1.2MB', date: '2026-05-06 14:10', hash: 'SHA256:7732...BB11' },
    { id: 'MEM-03X', type: 'HEURISTIC', size: '440KB', date: '2026-05-06 13:55', hash: 'SHA256:1120...CC09' },
    { id: 'MEM-04X', type: 'DNA_SNAPSHOT', size: '4.8MB', date: '2026-05-06 12:30', hash: 'SHA256:9901...DD88' },
  ];

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert("Neural Knowledge Base exported successfully. Filename: biopods_knowledge_gen4.json");
    }, 2000);
  };

  const handleRestore = (id: string) => {
    if (confirm(`INITIATE NEURAL REINTEGRATION: Are you sure you want to restore cluster state from ${id}?`)) {
      alert(`Reintegrating ${id}... Neural buffers cleared. Cluster DNA stabilized.`);
    }
  };

  const filteredExtractions = recentExtractions.filter(ex => 
    ex.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ex.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-bio-cyan/10 border border-bio-cyan/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.1)]">
            <Database className="text-bio-cyan" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-white tracking-tighter uppercase italic">
              Memory <span className="text-bio-cyan">Archive</span>
            </h2>
            <p className="text-slate-500 font-mono text-xs tracking-widest mt-1">Evolutionary history and long-term threat memory</p>
          </div>
        </div>
        
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-bio-cyan transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search neural signatures..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bio-darker border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs font-mono text-white focus:outline-none focus:border-bio-cyan/50 focus:bg-bio-dark transition-all placeholder:text-slate-600 shadow-inner"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <BioCard className="p-8 lg:col-span-2 bg-bio-dark/40 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <History size={120} />
          </div>
          
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-xl font-display font-black text-white uppercase italic tracking-wider">Historical Evolutionary Cycles</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">Metabolic stability variance across generations</p>
            </div>
            <div className="flex items-center gap-6 text-[9px] font-black tracking-widest uppercase">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-bio-green" /> Success</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-bio-red" /> Failure</div>
            </div>
          </div>
          
          <div className="h-64 flex items-end gap-3 px-4 relative z-10">
            {historyData.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group/bar">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 1, delay: i * 0.05 }}
                  className={`w-full rounded-t-xl transition-all duration-500 cursor-pointer ${
                    i === 2 
                    ? 'bg-bio-red/40 hover:bg-bio-red shadow-[0_0_20px_rgba(255,61,0,0.2)]' 
                    : 'bg-bio-cyan/30 hover:bg-bio-cyan hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                  }`}
                />
                <span className="text-[8px] font-black font-mono text-slate-500 tracking-tighter opacity-50 group-hover/bar:opacity-100">CY-{i+1}</span>
              </div>
            ))}
          </div>
        </BioCard>

        <BioCard className="p-8 space-y-8 bg-bio-dark/40 border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Archive Status</h3>
            <Archive size={16} className="text-bio-cyan" />
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                <motion.circle 
                  cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="12" fill="transparent" 
                  strokeDasharray="465"
                  initial={{ strokeDashoffset: 465 }}
                  animate={{ strokeDashoffset: 465 - (465 * storageUsed / 100) }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="text-bio-cyan shadow-[0_0_20px_rgba(0,229,255,0.5)]" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-display font-black text-white italic"
                >
                  {storageUsed}%
                </motion.span>
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">CAPACITY</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Cpu size={14} className="text-bio-cyan" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Signatures</span>
              </div>
              <span className="text-xs font-mono text-white">12.4K</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <HardDrive size={14} className="text-bio-cyan" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Heuristics</span>
              </div>
              <span className="text-xs font-mono text-white">8.4GB</span>
            </div>
          </div>

          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-4 bg-bio-cyan/10 border border-bio-cyan/20 rounded-2xl text-[10px] font-black text-bio-cyan hover:bg-bio-cyan/20 transition-all flex items-center justify-center gap-3 tracking-[0.2em] uppercase active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {isExporting ? 'ENCRYPTING ARCHIVE...' : 'EXPORT KNOWLEDGE BASE'}
          </button>
        </BioCard>
      </div>

      <BioCard className="p-0 border-white/5 overflow-hidden bg-bio-dark/40">
        <div className="p-6 border-b border-white/5 bg-bio-dark/20 flex items-center justify-between">
          <h3 className="text-xs font-black text-white flex items-center gap-3 uppercase tracking-widest italic">
            <History size={16} className="text-bio-cyan" />
            Recent Neural Extractions
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-bio-cyan animate-pulse" />
            <span className="text-[9px] font-mono text-slate-500 uppercase">Indexing Active</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bio-darker/30 border-b border-white/5">
                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Cell ID</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Extraction Type</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Payload Size</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Neural Hash</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Archived At</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredExtractions.map((ex, i) => (
                  <motion.tr 
                    key={ex.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="hover:bg-bio-cyan/5 group transition-colors"
                  >
                    <td className="px-8 py-4 font-mono text-[10px] text-bio-cyan font-bold">{ex.id}</td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <FileJson size={14} className="text-slate-500 group-hover:text-bio-cyan transition-colors" />
                        <span className="text-xs font-bold text-white tracking-tight uppercase">{ex.type}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-[10px] text-slate-400 font-mono italic">{ex.size}</td>
                    <td className="px-8 py-4 text-[10px] text-slate-600 font-mono uppercase">{ex.hash}</td>
                    <td className="px-8 py-4 text-[10px] text-slate-500 font-mono">{ex.date}</td>
                    <td className="px-8 py-4 text-right">
                      <button 
                        onClick={() => handleRestore(ex.id)}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest group-hover:border-bio-cyan/30 active:scale-95"
                      >
                        RESTORE
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </BioCard>
    </div>
  );
};
