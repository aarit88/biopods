import React, { useState, useEffect } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { Search, Filter, ZoomIn, ZoomOut, Maximize2, ShieldAlert, Cpu, HardDrive, Network, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';

interface ClusterNode {
  id: string;
  label: string;
  x: number;
  y: number;
  status: 'healthy' | 'warning' | 'danger' | 'rebooting';
  cpu: string;
  ram: string;
  pods: number;
  infectedPods?: Array<{ name: string; namespace: string; threatType: string; severity: string; status: string }>;
}

export const TopologyMap: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<ClusterNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoom, setZoom] = useState(1);
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const reloadTopology = async () => {
    try {
      const { data: clusters } = await apiService.clusters.list();
      if (clusters.length > 0) {
        const dbNodes = clusters[0].nodes || [];
        
        // Combine infra nodes with database nodes
        const combined = [
          { 
            id: 'turbine', 
            label: 'TURBINE CORE 01', 
            status: 'healthy', 
            cpu: '45.2%', 
            ram: '7.2GB', 
            pods: 8,
            infectedPods: []
          },
          { 
            id: 'control', 
            label: 'CONTROL SYSTEM', 
            status: 'healthy', 
            cpu: '22.1%', 
            ram: '3.5GB', 
            pods: 4,
            infectedPods: []
          },
          { 
            id: 'grid', 
            label: 'POWER GRID LINK', 
            status: 'healthy', 
            cpu: '15.8%', 
            ram: '2.1GB', 
            pods: 2,
            infectedPods: []
          },
          ...dbNodes.map((n: any) => {
            const infected = (n.pods || []).filter((p: any) => p.podStatus === 'critical' || p.dangerLevel === 'high' || p.immunityState === 'infected');
            const infectedPodsList = infected.flatMap((p: any) => {
              const activeEvents = (p.dangerEvents || []).filter((e: any) => e.status !== 'resolved');
              if (activeEvents.length === 0) {
                return [{
                  name: p.podName || 'unknown-pod',
                  namespace: p.namespace || 'default',
                  threatType: 'Incipient Pathogen Leak',
                  severity: p.dangerLevel || 'medium',
                  status: p.podStatus || 'warning'
                }];
              }
              return activeEvents.map((e: any) => ({
                name: p.podName || 'unknown-pod',
                namespace: p.namespace || 'default',
                threatType: e.eventType || 'Pathogen Vector',
                severity: e.severity || 'high',
                status: e.status || 'active'
              }));
            });

            return {
              id: n.id,
              label: n.nodeName?.toUpperCase() || 'UNKNOWN NODE',
              status: n.nodeStatus?.toLowerCase() || 'healthy',
              cpu: (n.cpuUsage || 0).toFixed(1) + '%',
              ram: ((n.memoryUsage || 0) * 0.16).toFixed(1) + 'GB',
              pods: n.pods?.length || 0,
              infectedPods: infectedPodsList
            };
          })
        ];

        // Position nodes symmetrically around the central CORE
        const radius = 280;
        const mappedNodes: ClusterNode[] = [
          { 
            id: 'core', 
            label: 'IMMUNE CORE', 
            x: 500, 
            y: 400, 
            status: 'healthy', 
            cpu: '12.4%', 
            ram: '4.2GB', 
            pods: 12,
            infectedPods: []
          },
          ...combined.map((node, i) => {
            const angle = (i * 2 * Math.PI) / combined.length - Math.PI / 2;
            return {
              ...node,
              x: 500 + Math.cos(angle) * radius,
              y: 400 + Math.sin(angle) * radius
            } as ClusterNode;
          })
        ];

        setNodes(mappedNodes);
        
        // Update selected node details in real-time
        if (selectedNode) {
          const freshSelected = mappedNodes.find(n => n.id === selectedNode.id);
          if (freshSelected) {
            setSelectedNode(freshSelected);
          }
        }
      }
    } catch (e) {
      console.error("Failed to reload topology nodes", e);
    }
  };

  useEffect(() => {
    setLoading(true);
    reloadTopology().finally(() => setLoading(false));
  }, []);

  const handleDeployAntibodies = async (node: ClusterNode) => {
    if (node.id === 'core' || node.id === 'turbine' || node.id === 'control' || node.id === 'grid') {
      setActionLoading(true);
      setTimeout(() => {
        setActionLoading(false);
        setNodes(prev => prev.map(n => n.id === node.id ? { ...n, status: 'healthy', infectedPods: [] } : n));
        setSelectedNode(prev => prev ? { ...prev, status: 'healthy', infectedPods: [] } : null);
        alert(`Antibody deployment sequence completed successfully. Sector ${node.label} secured.`);
      }, 1500);
      return;
    }

    try {
      setActionLoading(true);
      await apiService.nodes.mitigate(node.id);
      await reloadTopology();
      alert(`Antibodies successfully deployed to dynamic sector ${node.label}. Database updated and pathogen infection vectors purged!`);
    } catch (err) {
      console.error(err);
      alert(`Failed to deploy antibodies for node ${node.label}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNeuralReboot = async (node: ClusterNode) => {
    if (node.id === 'core' || node.id === 'turbine' || node.id === 'control' || node.id === 'grid') {
      setActionLoading(true);
      setNodes(prev => prev.map(n => n.id === node.id ? { ...n, status: 'warning', cpu: '0%', ram: '1.0GB' } : n));
      setSelectedNode(prev => prev ? { ...prev, status: 'warning', cpu: '0%', ram: '1.0GB' } : null);
      setTimeout(() => {
        setActionLoading(false);
        setNodes(prev => prev.map(n => n.id === node.id ? { ...n, status: 'healthy', cpu: '15%', ram: '4.0GB' } : n));
        setSelectedNode(prev => prev ? { ...prev, status: 'healthy', cpu: '15%', ram: '4.0GB' } : null);
        alert(`Neural reboot cycle complete for ${node.label}. Sector returned to optimal state.`);
      }, 3000);
      return;
    }

    try {
      setActionLoading(true);
      await apiService.nodes.reboot(node.id);
      
      setNodes(prev => prev.map(n => n.id === node.id ? { ...n, status: 'warning', cpu: '0%', ram: '1.0GB' } : n));
      setSelectedNode(prev => prev ? { ...prev, status: 'warning', cpu: '0%', ram: '1.0GB' } : null);

      setTimeout(async () => {
        await reloadTopology();
      }, 3000);

      alert(`Neural reboot cycle successfully initiated for dynamic sector ${node.label} in the database. Node is power cycling.`);
    } catch (err) {
      console.error(err);
      alert(`Failed to reboot node ${node.label}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredNodes = nodes.filter(n => 
    n.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#00ff80';
      case 'warning': return '#ffaa00';
      case 'danger': return '#ff3d00';
      case 'critical': return '#ff3d00';
      case 'rebooting': return '#ffaa00';
      default: return '#ffffff';
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 relative overflow-hidden">
      <AnimatePresence>
        {(loading || actionLoading) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bio-dark/50 backdrop-blur-xl rounded-3xl"
          >
            <Loader2 className="text-bio-green animate-spin mb-4" size={48} />
            <span className="text-[10px] font-black font-mono text-bio-green tracking-[0.3em] uppercase animate-pulse">Syncing Neural Map...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between z-20">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-bio-green transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search neural topology..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bio-darker border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-mono text-white focus:outline-none focus:border-bio-green/50 transition-all shadow-inner"
            />
          </div>
          <button className="p-3.5 bg-bio-darker border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:border-white/20 transition-all shadow-lg">
            <Filter size={20} />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-3.5 bg-bio-darker border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg">
            <ZoomIn size={20} />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-3.5 bg-bio-darker border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg">
            <ZoomOut size={20} />
          </button>
          <button className="p-3.5 bg-bio-darker border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg">
            <Maximize2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-bio-darker/30 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-sm shadow-2xl">
        {/* Cinematic Neural Background */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,128,0.1)_0%,transparent_70%)]"
          />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        </div>

        <motion.svg 
          viewBox="0 0 1000 800" 
          className="w-full h-full cursor-grab active:cursor-grabbing relative z-10"
          animate={{ scale: zoom }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <defs>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="15" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ff80" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#00ff80" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00ff80" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          
          {/* Neural Connections */}
          <g>
            {filteredNodes.filter(n => n.id !== 'core').map((node) => (
              <React.Fragment key={`line-${node.id}`}>
                <motion.line 
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.2 }}
                  transition={{ duration: 2 }}
                  x1={500} y1={400} x2={node.x} y2={node.y} 
                  stroke={getStatusColor(node.status)} 
                  strokeWidth="2" 
                  strokeDasharray="10,10"
                />
                {/* Moving Packet Signals */}
                <motion.circle 
                  r="3" 
                  fill={getStatusColor(node.status)}
                  animate={{ 
                    cx: [500, node.x],
                    cy: [400, node.y],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                />
              </React.Fragment>
            ))}
          </g>

          {/* Neural Nodes */}
          {filteredNodes.map((node) => (
            <motion.g 
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: Math.random() * 0.5 }}
              onClick={() => setSelectedNode(node)}
              className="cursor-pointer group"
            >
              <circle 
                cx={node.x} cy={node.y} r={node.id === 'core' ? 60 : 40} 
                fill={getStatusColor(node.status)} 
                fillOpacity="0.05" 
                stroke={getStatusColor(node.status)} 
                strokeWidth={selectedNode?.id === node.id ? 4 : 2}
                className="transition-all duration-300 group-hover:fill-opacity-20"
              />
              <circle 
                cx={node.x} cy={node.y} r={node.id === 'core' ? 50 : 30} 
                fill={getStatusColor(node.status)} 
                fillOpacity="0.1" 
                className="animate-pulse"
              />
              <text 
                x={node.x} y={node.y} 
                textAnchor="middle" dy=".3em" 
                fill="white" fontSize={node.id === 'core' ? "14" : "10"} 
                className="font-black tracking-widest uppercase italic pointer-events-none"
              >
                {node.label}
              </text>
              
              {/* Status Ring */}
              {node.status !== 'healthy' && (
                <motion.circle 
                  cx={node.x} cy={node.y} r={node.id === 'core' ? 70 : 50} 
                  fill="none" 
                  stroke={getStatusColor(node.status)} 
                  strokeWidth="1" 
                  strokeDasharray="4,4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
              )}
            </motion.g>
          ))}
        </motion.svg>

        {/* Node Detail Sidebar */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div 
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="absolute top-0 right-0 h-full w-80 bg-bio-dark/95 backdrop-blur-2xl border-l border-white/10 z-30 p-8 shadow-2xl shadow-black overflow-y-auto scrollbar-none"
            >
              <button 
                onClick={() => setSelectedNode(null)}
                className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="space-y-8 mt-10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center`} style={{ backgroundColor: `${getStatusColor(selectedNode.status)}20`, color: getStatusColor(selectedNode.status) }}>
                    <Network size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-white italic uppercase">{selectedNode.label}</h3>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Neural Metadata</span>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center gap-3`} style={{ backgroundColor: `${getStatusColor(selectedNode.status)}10`, borderColor: `${getStatusColor(selectedNode.status)}30` }}>
                  <ShieldAlert size={18} style={{ color: getStatusColor(selectedNode.status) }} />
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: getStatusColor(selectedNode.status) }}>
                    {selectedNode.status === 'danger' ? 'Critical Infection' : selectedNode.status === 'warning' ? 'Metabolic Stress' : selectedNode.status === 'rebooting' ? 'System Rebooting' : 'Neural Stability'}
                  </span>
                </div>

                {/* Dynamic Database active threats list */}
                {selectedNode.infectedPods && selectedNode.infectedPods.length > 0 && (
                  <div className="space-y-4 p-5 rounded-2xl bg-bio-red/10 border border-bio-red/20 shadow-inner">
                    <div className="flex items-center gap-2 text-bio-red">
                      <ShieldAlert size={16} className="animate-pulse" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Active Threat Detected</h4>
                    </div>
                    {selectedNode.infectedPods.map((threat, idx) => (
                      <div key={idx} className="space-y-3 font-mono text-[10px] border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
                        <div>
                          <span className="text-slate-500 uppercase font-black block">Infected Target</span>
                          <span className="text-white font-bold text-xs uppercase">{threat.name}</span>
                          <span className="text-slate-400 text-[8px] block lowercase">Namespace: {threat.namespace}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase font-black block">Signature</span>
                          <span className="text-bio-red font-black uppercase italic">{threat.threatType}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase font-black block">Action Guideline</span>
                          <span className="text-bio-green font-bold uppercase">👉 Click "DEPLOY ANTIBODIES" below to trigger autonomous remediation</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <BioCard className="p-4 bg-white/5 border-white/5">
                    <Cpu size={14} className="text-bio-green mb-2" />
                    <span className="text-[9px] text-slate-500 uppercase font-black block">CPU Load</span>
                    <span className="text-lg font-display font-black text-white italic">{selectedNode.cpu}</span>
                  </BioCard>
                  <BioCard className="p-4 bg-white/5 border-white/5">
                    <HardDrive size={14} className="text-bio-cyan mb-2" />
                    <span className="text-[9px] text-slate-500 uppercase font-black block">RAM Usage</span>
                    <span className="text-lg font-display font-black text-white italic">{selectedNode.ram}</span>
                  </BioCard>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Pod Population</h4>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(selectedNode.pods / 50) * 100}%` }}
                      className="h-full bg-bio-green shadow-[0_0_10px_#00ff80]"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>{selectedNode.pods} Active Units</span>
                    <span>50 Capacity</span>
                  </div>
                </div>

                <div className="pt-8 space-y-3">
                  <button 
                    onClick={() => handleDeployAntibodies(selectedNode)}
                    className="w-full py-4 bg-bio-green/10 border border-bio-green/20 rounded-2xl text-[10px] font-black text-bio-green hover:bg-bio-green/20 transition-all uppercase tracking-widest italic active:scale-95"
                  >
                    DEPLOY ANTIBODIES
                  </button>
                  <button 
                    onClick={() => handleNeuralReboot(selectedNode)}
                    className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest italic active:scale-95"
                  >
                    NEURAL REBOOT
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend / Overlay */}
        {!selectedNode && (
          <div className="absolute bottom-10 left-10 space-y-4 pointer-events-none">
            <BioCard className="p-6 bg-bio-dark/80 border-bio-red/50 animate-pulse w-72" glowColor="red">
              <div className="flex items-center gap-3 mb-3">
                <ShieldAlert className="text-bio-red" size={20} />
                <h4 className="text-bio-red text-xs font-black uppercase tracking-widest">Infection Vector</h4>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed font-mono uppercase">
                Neural breach detected in <span className="text-white font-bold">NODE-BETA-02</span>. Pathogen propagation at 88%. Deploying mitigation.
              </p>
            </BioCard>
          </div>
        )}
      </div>
    </div>
  );
};
