import React from 'react';
import { BioCard } from '../components/ui/BioCard';
import { Timeline } from 'lucide-react';

export const EventTimeline: React.FC = () => {
  const events = [
    { time: '14:02:11', event: 'New synaptic pathway established at Sector 7', type: 'info' },
    { time: '14:01:45', event: 'Traffic bottleneck detected in Metabolic Processor', type: 'warning' },
    { time: '13:59:22', event: 'Automated purge sequence completed for Ransom-C-4', type: 'success' },
    { time: '13:55:10', event: 'Antibody-X synthesized for node Node-Beta', type: 'success' },
    { time: '13:50:00', event: 'Cluster heartbeat stabilized at 92%', type: 'info' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-bio-cyan/10 border border-bio-cyan/20 flex items-center justify-center">
          <Timeline className="text-bio-cyan" size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Realtime Event Timeline</h2>
          <p className="text-slate-400">Chronological history of cluster metabolism and immune actions</p>
        </div>
      </div>

      <BioCard className="p-8">
        <div className="space-y-0 relative before:absolute before:left-[107px] before:top-0 before:bottom-0 before:w-px before:bg-white/10">
          {events.map((event, i) => (
            <div key={i} className="flex gap-12 pb-12 last:pb-0 relative">
              <div className="w-20 text-right shrink-0">
                <span className="text-xs font-mono text-slate-500">{event.time}</span>
              </div>
              
              <div className="relative">
                <div className={`absolute left-[-17px] top-1.5 w-3 h-3 rounded-full border-2 border-bio-dark z-10 ${
                  event.type === 'success' ? 'bg-bio-green' : 
                  event.type === 'warning' ? 'bg-bio-amber' : 'bg-bio-cyan'
                }`} />
                
                <div className="flex flex-col gap-1">
                  <h4 className={`text-sm font-bold ${
                    event.type === 'success' ? 'text-bio-green' : 
                    event.type === 'warning' ? 'text-bio-amber' : 'text-bio-cyan'
                  }`}>
                    {event.type.toUpperCase()} SIGNAL
                  </h4>
                  <p className="text-slate-300 leading-relaxed max-w-2xl">{event.event}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </BioCard>
    </div>
  );
};
