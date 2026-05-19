import React, { useState, useEffect } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { Brain, Network, Activity, Cpu } from 'lucide-react';
import { apiService } from '../services/api';
import { useSocket } from '../hooks/useSocket';

interface Pod {
  id: string;
  podName: string;
  cpuUsage: number;
  memoryUsage: number;
  podStatus: string;
  dangerLevel: string;
  immunityState: string;
  dependencyCount: number;
}

export const PodIntelligence: React.FC = () => {
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);
  const { lastTelemetry } = useSocket();

  useEffect(() => {
    const fetchPods = async () => {
      try {
        const response = await apiService.pods.list();
        setPods(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch pods", err);
        setLoading(false);
      }
    };
    fetchPods();
  }, []);

  useEffect(() => {
    if (lastTelemetry && lastTelemetry.podId) {
      setPods(prevPods => prevPods.map(pod => {
        if (pod.podName === lastTelemetry.podId || pod.id === lastTelemetry.podId) {
          return {
            ...pod,
            cpuUsage: lastTelemetry.metrics?.cpu ?? pod.cpuUsage,
            memoryUsage: lastTelemetry.metrics?.memory ?? pod.memoryUsage,
          };
        }
        return pod;
      }));
    }
  }, [lastTelemetry]);

  const totalCognitiveLoad = pods.length > 0 ? (pods.reduce((acc, p) => acc + (p.cpuUsage || 0), 0) / pods.length).toFixed(1) : '0.0';
  const totalMemory = pods.length > 0 ? (pods.reduce((acc, p) => acc + (p.memoryUsage || 0), 0) / 100).toFixed(1) : '0.0';
  const evolutionGen = pods.length > 0 ? Math.max(...pods.map(p => p.dependencyCount || 1)) : 1;

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
            {loading ? (
              <div className="p-8 text-center text-bio-green animate-pulse">Scanning neural net...</div>
            ) : pods.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No active organisms detected.</div>
            ) : pods.map((pod, i) => {
              const cpu = pod.cpuUsage || 0;
              const mem = pod.memoryUsage || 0;
              const isHealthy = pod.podStatus === 'healthy' || pod.podStatus === 'Running';
              const statusColor = isHealthy ? 'text-bio-green' : 'text-bio-amber';
              const statusBg = isHealthy ? 'bg-bio-green' : 'bg-bio-amber';
              const borderHover = isHealthy ? 'hover:border-bio-green/30' : 'hover:border-bio-amber/30';

              return (
                <div key={pod.id} className={`p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between group ${borderHover} transition-all gap-4`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg bg-bio-darker border border-white/10 flex items-center justify-center font-mono text-xs ${statusColor} uppercase`}>
                      {pod.podName ? pod.podName.substring(0, 2) : 'P'+i}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm truncate max-w-[200px]" title={pod.podName}>{pod.podName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                        Metabolic Index: {((cpu + mem) / 2).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-slate-400" />
                      <span className="text-xs text-slate-300 font-mono">{cpu.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-slate-400" />
                      <span className="text-xs text-slate-300 font-mono">{mem.toFixed(1)}%</span>
                    </div>

                    <div className="flex items-center gap-4 ml-auto md:ml-4">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-slate-500 block uppercase">Stability</span>
                        <span className={`font-mono text-sm ${statusColor}`}>{pod.podStatus || 'Unknown'}</span>
                      </div>
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full w-full rounded-full ${statusBg}`} 
                          style={{ width: `${Math.min(100, Math.max(5, cpu))}%`, transition: 'width 0.5s ease' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
              <div className="text-2xl font-bold text-white">{totalCognitiveLoad}%</div>
            </div>
            <div className="p-4 bg-bio-darker rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase block mb-1">Memory Synthesis</span>
              <div className="text-2xl font-bold text-bio-cyan">{totalMemory} GB</div>
            </div>
            <div className="p-4 bg-bio-darker rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase block mb-1">Evolutionary Cycle</span>
              <div className="text-2xl font-bold text-bio-amber">Gen {evolutionGen}</div>
            </div>
          </div>
        </BioCard>
      </div>
    </div>
  );
};
