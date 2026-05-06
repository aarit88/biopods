import React from 'react';
import { BioCard } from '../components/ui/BioCard';
import { Settings as SettingsIcon, Shield, Bell, Save } from 'lucide-react';
import { BioButton } from '../components/ui/BioButton';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100/10 border border-white/10 flex items-center justify-center">
          <SettingsIcon className="text-slate-400" size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">System Settings</h2>
          <p className="text-slate-400">Configure immune protocols and neural thresholds</p>
        </div>
      </div>

      <div className="space-y-6">
        <BioCard className="p-8">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
            <Shield size={20} className="text-bio-green" />
            <h3 className="text-lg font-bold text-white">Immune Protocols</h3>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Autonomous Purge</h4>
                <p className="text-xs text-slate-500">Automatically isolate and delete pods detected as infected</p>
              </div>
              <div className="w-12 h-6 bg-bio-green/20 rounded-full relative border border-bio-green/50 cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-bio-green rounded-full shadow-[0_0_8px_rgba(0,255,128,0.8)]" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Heuristic Learning</h4>
                <p className="text-xs text-slate-500">Allow AI agents to evolve defense strategies based on cluster history</p>
              </div>
              <div className="w-12 h-6 bg-bio-green/20 rounded-full relative border border-bio-green/50 cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-bio-green rounded-full shadow-[0_0_8px_rgba(0,255,128,0.8)]" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Aggressive Balancing</h4>
                <p className="text-xs text-slate-500">Re-route traffic immediately when metabolic instability is detected</p>
              </div>
              <div className="w-12 h-6 bg-white/10 rounded-full relative border border-white/20 cursor-pointer">
                <div className="absolute left-1 top-1 w-4 h-4 bg-slate-500 rounded-full" />
              </div>
            </div>
          </div>
        </BioCard>

        <BioCard className="p-8">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
            <Bell size={20} className="text-bio-cyan" />
            <h3 className="text-lg font-bold text-white">Alert Thresholds</h3>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Critical Sensitivity</span>
                <span className="text-bio-cyan">85%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full relative">
                <div className="h-full bg-bio-cyan w-[85%] rounded-full shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
                <div className="absolute top-1/2 -translate-y-1/2 left-[85%] w-4 h-4 bg-white border-2 border-bio-cyan rounded-full cursor-pointer" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Metabolic Warning</span>
                <span className="text-bio-amber">40%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full relative">
                <div className="h-full bg-bio-amber w-[40%] rounded-full shadow-[0_0_10px_rgba(255,171,0,0.5)]" />
                <div className="absolute top-1/2 -translate-y-1/2 left-[40%] w-4 h-4 bg-white border-2 border-bio-amber rounded-full cursor-pointer" />
              </div>
            </div>
          </div>
        </BioCard>

        <div className="flex justify-end gap-4">
          <BioButton variant="ghost">CANCEL</BioButton>
          <BioButton variant="primary" className="gap-2">
            <Save size={18} /> SAVE PROTOCOLS
          </BioButton>
        </div>
      </div>
    </div>
  );
};
