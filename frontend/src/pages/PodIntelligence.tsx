import React from 'react';
import { BioCard } from '../components/ui/BioCard';
import { Brain, Network } from 'lucide-react';

export const PodIntelligence: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BioCard className="p-6 md:col-span-2">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-bio-green/10 border border-bio-green/20 flex items-center justify-center">
              <Brain size={32} className="text-bio-green" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Pod Intelligence Scan</h2>
              <p className="text-slate-400 text-sm">Deep metabolic analysis of active container organisms</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group hover:border-bio-green/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-bio-darker border border-white/10 flex items-center justify-center font-mono text-xs text-bio-green">
                    P{i}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Organism-Sigma-{i*100}</h4>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Metabolic Index: {90 + i}.4</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase">Stability</span>
                    <span className="text-bio-green font-mono text-sm">Optimal</span>
                  </div>
                  <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-bio-green w-full rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BioCard>

        <BioCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Network size={18} className="text-bio-cyan" />
            Neural Synapse
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-bio-darker rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase block mb-1">Cognitive Load</span>
              <div className="text-2xl font-bold text-white">24.8%</div>
            </div>
            <div className="p-4 bg-bio-darker rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase block mb-1">Memory Synthesis</span>
              <div className="text-2xl font-bold text-bio-cyan">8.2 GB</div>
            </div>
            <div className="p-4 bg-bio-darker rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase block mb-1">Evolutionary Cycle</span>
              <div className="text-2xl font-bold text-bio-amber">Gen 4</div>
            </div>
          </div>
        </BioCard>
      </div>
    </div>
  );
};
