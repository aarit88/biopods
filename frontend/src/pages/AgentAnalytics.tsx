import React, { useState, useEffect } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react';
import { apiService } from '../services/api';

export const AgentAnalytics: React.FC = () => {
  const [agents, setAgents] = useState<any[]>([]);
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data } = await apiService.agents.list();
        setAgents(data);
      } catch (e) {
        console.error("Failed to fetch agents", e);
      }
    };
    fetchAgents();
  }, []);

  const stats = [
    { label: 'Total Agents', val: agents.length.toString(), icon: Users, color: 'text-bio-cyan' },
    { label: 'Avg Confidence', val: (agents.reduce((acc, a) => acc + (a.confidenceScore || 0), 0) / (agents.length || 1)).toFixed(1) + '%', icon: TrendingUp, color: 'text-bio-green' },
    { label: 'Learning Load', val: (agents.reduce((acc, a) => acc + (a.learningScore || 0), 0) / (agents.length || 1)).toFixed(1) + '%', icon: Target, color: 'text-bio-red' },
    { label: 'Uptime', val: 'Active', icon: BarChart3, color: 'text-bio-amber' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-bio-green/10 border border-bio-green/20 flex items-center justify-center">
          <BarChart3 className="text-bio-green" size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">AI Agent Analytics</h2>
          <p className="text-slate-400">Performance metrics and evolutionary growth of immune agents</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <BioCard key={i} className="p-6">
            <stat.icon size={20} className={`${stat.color} mb-4`} />
            <div className="text-3xl font-display font-bold text-white">{stat.val}</div>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{stat.label}</div>
          </BioCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BioCard className="p-8">
          <h3 className="text-lg font-bold text-white mb-8">Agent Efficiency Trends</h3>
          <div className="h-64 flex items-end gap-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-1 bg-bio-green/30 hover:bg-bio-green transition-colors rounded-t-sm"
                style={{ height: `${Math.random() * 60 + 40}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-slate-600 font-mono">
            <span>30 DAYS AGO</span>
            <span>TODAY</span>
          </div>
        </BioCard>

        <BioCard className="p-8">
          <h3 className="text-lg font-bold text-white mb-8">Containment Efficacy</h3>
          <div className="space-y-6">
            {[
              { type: 'Malware Purge', val: 98 },
              { type: 'DDoS Containment', val: 92 },
              { type: 'Intrusion Blocking', val: 96 },
              { type: 'Metabolic Balancing', val: 89 },
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 uppercase font-mono tracking-widest">{item.type}</span>
                  <span className="text-white font-bold">{item.val}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-bio-cyan rounded-full" style={{ width: `${item.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </BioCard>
      </div>
    </div>
  );
};
