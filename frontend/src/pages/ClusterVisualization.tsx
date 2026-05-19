import React, { Suspense, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float, Stars, Html } from '@react-three/drei';
import { BioCard } from '../components/ui/BioCard';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/api';
import * as THREE from 'three';

const NeuralCore = ({ dangerLevel }: { dangerLevel: number }) => {
  const color = dangerLevel > 60 ? '#ff3d00' : dangerLevel > 30 ? '#ffab00' : '#00ff80';
  const emissiveIntensity = 0.3 + (dangerLevel / 100) * 0.7;

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere args={[1, 64, 64]}>
        <MeshDistortMaterial
          color={color}
          speed={3 + dangerLevel / 20}
          distort={0.3 + (dangerLevel / 200)}
          radius={1}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
};

const PodNode = ({ position, health, isUnderAttack, data }: { position: [number, number, number], health: number, isUnderAttack?: boolean, data: any }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.002;
    }
    const underAttack = isUnderAttack || data.status === 'quarantined' || data.status === 'isolated';
    if (glowRef.current && underAttack) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 8) * 0.3);
    }
  });

  const isIsolated = data.status === 'quarantined' || data.status === 'isolated';
  const color = isIsolated ? '#f50057' : isUnderAttack ? '#ff3d00' : health > 80 ? '#00ff80' : health > 50 ? '#ffab00' : '#ff3d00';

  return (
    <group position={position}>
      <mesh 
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={isUnderAttack ? 1.5 : 0.6} 
          wireframe={isUnderAttack}
        />
      </mesh>
      {(isUnderAttack || isIsolated) && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color={isIsolated ? '#f50057' : '#ff3d00'} transparent opacity={0.2} />
        </mesh>
      )}
      <line>
        <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-position[0], -position[1], -position[2])])} />
        <lineBasicMaterial attach="material" color={color} transparent opacity={isUnderAttack ? 0.3 : 0.08} />
      </line>

      {hovered && (
        <Html position={[0, 0.2, 0]} center zIndexRange={[100, 0]}>
          <div className="bg-bio-darker/95 border border-white/10 p-3 rounded-lg text-[10px] w-48 shadow-2xl backdrop-blur-md pointer-events-none transition-all duration-300">
            <div className="font-bold text-white truncate mb-2">{data.name}</div>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span className="uppercase text-[8px] font-black tracking-widest">Type</span>
                <span className="font-mono text-white">{data.type}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="uppercase text-[8px] font-black tracking-widest">CPU</span>
                <span className="font-mono text-bio-cyan">{data.cpuUsage?.toFixed(1)}%</span>
              </div>
              {data.memoryUsage !== undefined && (
                <div className="flex justify-between items-center text-slate-400">
                  <span className="uppercase text-[8px] font-black tracking-widest">MEM</span>
                  <span className="font-mono text-bio-green">{data.memoryUsage?.toFixed(1)}%</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-400">
                <span className="uppercase text-[8px] font-black tracking-widest">Status</span>
                <span className={`font-mono ${isUnderAttack ? 'text-bio-red' : color === '#00ff80' ? 'text-bio-green' : 'text-bio-amber'}`}>
                  {data.status}
                </span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

const NodeCloud = ({ entities, attackedPods }: { entities: any[], attackedPods: Set<string> }) => {
  const nodes = useMemo(() => {
    return entities.map((entity, i) => {
      // Golden ratio spiral for even distribution
      const phi = Math.acos(-1 + (2 * i) / entities.length);
      const theta = Math.sqrt(entities.length * Math.PI) * phi;
      const radius = 2.5 + Math.abs(Math.sin(i * 13.5)) * 2.0; 
      
      const isIsolated = entity.status === 'quarantined' || entity.status === 'isolated';
      const health = isIsolated ? 30 : (entity.status === 'healthy' || entity.status === 'Running') ? 100 : entity.status === 'warning' ? 50 : 20;
      const isUnderAttack = attackedPods.has(entity.id) || attackedPods.has(entity.name);
      
      return {
        id: entity.id,
        data: entity,
        position: [
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi)
        ] as [number, number, number],
        health,
        isUnderAttack
      };
    });
  }, [entities, attackedPods]);

  return (
    <group>
      {nodes.map((node) => (
        <PodNode key={node.id} position={node.position} health={node.health} isUnderAttack={node.isUnderAttack} data={node.data} />
      ))}
    </group>
  );
};

export const ClusterVisualization: React.FC = () => {
  const { isConnected, anomalies: socketAnomalies, lastTelemetry } = useSocket();
  const controlsRef = useRef<any>(null);
  const [dangerLevel, setDangerLevel] = useState(0);
  const [attackedPods, setAttackedPods] = useState<Set<string>>(new Set());
  const [pods, setPods] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [dbAnomalies, setDbAnomalies] = useState<any[]>([]);
  const [showIsolationModal, setShowIsolationModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [podsRes, nodesRes, anomaliesRes] = await Promise.all([
        apiService.pods.list(),
        apiService.nodes.list(),
        apiService.telemetry.getRecentAnomalies()
      ]);
      setPods(podsRes.data);
      setNodes(nodesRes.data);
      setDbAnomalies(anomaliesRes.data);
    } catch (err) {
      console.error("Failed to fetch cluster data", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

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

  // Combine DB and Socket anomalies
  const allAnomalies = useMemo(() => {
    const combined = [...socketAnomalies];
    dbAnomalies.forEach(dbAnom => {
      const exists = combined.some(a => a.id === dbAnom.id || (a.podId === dbAnom.podId && a.createdAt === dbAnom.createdAt));
      if (!exists && dbAnom.status !== 'resolved') {
        combined.push(dbAnom);
      }
    });
    return combined;
  }, [socketAnomalies, dbAnomalies]);

  // Track danger level from combined anomalies
  useEffect(() => {
    const dangerCount = allAnomalies.filter(a => {
      const label = (a.label || a.severity || 'INFO').toUpperCase();
      return label === 'CRITICAL' || label === 'HIGH' || label === 'DANGER';
    }).length;
    setDangerLevel(Math.min(100, dangerCount * 8));

    const attacked = new Set(allAnomalies.map((a: any) => a.podId).filter(Boolean));
    setAttackedPods(attacked as Set<string>);
  }, [allAnomalies]);

  // Combine Nodes and Pods for Visualization
  const allEntities = useMemo(() => {
    const combined = [
      ...nodes.map(n => ({ id: n.id, name: n.nodeName, type: 'NODE', cpuUsage: n.cpuUsage, memoryUsage: n.memoryUsage, status: n.nodeStatus || 'healthy' })),
      ...pods.map(p => ({ id: p.id, name: p.podName, type: 'POD', cpuUsage: p.cpuUsage, memoryUsage: p.memoryUsage, status: p.podStatus || 'healthy' }))
    ];
    return combined;
  }, [nodes, pods]);

  // Live throughput from telemetry / overall pods
  const totalCpu = pods.reduce((acc, p) => acc + (p.cpuUsage || 0), 0) + nodes.reduce((acc, n) => acc + (n.cpuUsage || 0), 0);
  const throughput = allEntities.length > 0 ? (totalCpu / allEntities.length / 10).toFixed(1) : '0.0';

  const handleFocusCore = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleIsolateSector = async () => {
    try {
      // Execute sector quarantine in database
      await apiService.actions.execute('sector-01', 'ISOLATE');
      await fetchData();
      setShowIsolationModal(true);
    } catch (e) {
      console.error("Failed to isolate sector", e);
      setShowIsolationModal(true);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-8 relative">
      <div className="flex-1 glass-panel relative overflow-hidden bg-bio-darker rounded-3xl border border-white/5 shadow-2xl">
        <div className="absolute top-8 left-8 z-10 pointer-events-none">
          <h3 className="text-3xl font-display font-extrabold text-white tracking-tighter uppercase italic">
            Macro-Ecosystem <span className="text-bio-green">View</span>
          </h3>
          <p className="text-slate-500 font-mono text-xs tracking-widest mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dangerLevel > 50 ? 'bg-bio-red' : 'bg-bio-green'} animate-pulse`} />
            {dangerLevel > 50 ? 'THREAT DETECTED — IMMUNE RESPONSE ACTIVE' : 'REAL-TIME METABOLIC TOPOLOGY ACTIVE'}
          </p>
        </div>
        
        <div className="absolute top-8 right-8 z-10 flex gap-4">
          <BioCard className="px-5 py-3 bg-bio-dark/60 backdrop-blur-md flex flex-col gap-1 border-bio-green/20">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">Stability</span>
            <span className={`font-mono text-lg font-bold ${dangerLevel > 50 ? 'text-bio-red' : 'text-bio-green'}`}>
              {(100 - dangerLevel).toFixed(1)}%
            </span>
          </BioCard>
          <BioCard className="px-5 py-3 bg-bio-dark/60 backdrop-blur-md flex flex-col gap-1 border-bio-cyan/20">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">Active Entities</span>
            <span className="text-bio-cyan font-mono text-lg font-bold">{allEntities.length}</span>
          </BioCard>
          <BioCard className={`px-5 py-3 bg-bio-dark/60 backdrop-blur-md flex flex-col gap-1 ${dangerLevel > 30 ? 'border-bio-red/30' : 'border-white/10'}`}>
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">Threat Level</span>
            <span className={`font-mono text-lg font-bold ${dangerLevel > 50 ? 'text-bio-red animate-pulse' : dangerLevel > 20 ? 'text-bio-amber' : 'text-bio-green'}`}>
              {dangerLevel > 50 ? 'HIGH' : dangerLevel > 20 ? 'MED' : 'LOW'}
            </span>
          </BioCard>
        </div>

        <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
          <color attach="background" args={['#020305']} />
          <fog attach="fog" args={['#020305', 5, 15]} />
          
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color={dangerLevel > 50 ? '#ff3d00' : '#00ff80'} />
          <pointLight position={[-10, -10, -10]} intensity={0.8} color="#00e5ff" />
          {dangerLevel > 50 && (
            <pointLight position={[0, 5, 0]} intensity={2} color="#ff3d00" distance={10} />
          )}
          
          <Suspense fallback={null}>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <NeuralCore dangerLevel={dangerLevel} />
            <NodeCloud entities={allEntities} attackedPods={attackedPods} />
            <OrbitControls 
              ref={controlsRef}
              enableZoom={true} 
              autoRotate 
              autoRotateSpeed={dangerLevel > 50 ? 1.5 : 0.5} 
              maxDistance={12}
              minDistance={3}
            />
          </Suspense>
        </Canvas>

        <div className="absolute bottom-8 left-8 z-10 flex gap-3">
          <button 
            onClick={handleFocusCore}
            className="px-6 py-3 bg-bio-green/10 border border-bio-green/30 rounded-xl text-[10px] font-black text-bio-green hover:bg-bio-green/20 transition-all uppercase tracking-widest active:scale-95"
          >
            FOCUS NEURAL CORE
          </button>
          <button 
            onClick={handleIsolateSector}
            className="px-6 py-3 bg-bio-amber/10 border border-bio-amber/30 rounded-xl text-[10px] font-black text-bio-amber hover:bg-bio-amber/20 transition-all uppercase tracking-widest active:scale-95 shadow-[0_0_15px_rgba(255,171,0,0.1)]"
          >
            ISOLATE SECTOR 01
          </button>
        </div>

        <div className="absolute bottom-8 right-8 z-10 p-4 bg-bio-dark/60 backdrop-blur-md rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest uppercase">
            <div className="w-2 h-2 rounded-full bg-bio-green" /> <span className="text-slate-400">Optimal (Healthy)</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest uppercase">
            <div className="w-2 h-2 rounded-full bg-bio-amber" /> <span className="text-slate-400">Metabolic Stress</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest uppercase">
            <div className="w-2 h-2 rounded-full bg-bio-red" /> <span className="text-slate-400">Pathogen Detected</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest uppercase">
            <div className="w-2 h-2 rounded-full bg-[#f50057]" /> <span className="text-slate-400">Quarantined Sector</span>
          </div>
        </div>
      </div>

      <div className="h-48 grid grid-cols-1 md:grid-cols-4 gap-6">
        <BioCard className="p-6 flex flex-col justify-center gap-2 border-bio-green/10">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Neural Throughput</span>
          <div className="text-3xl font-display font-extrabold text-white italic">{throughput}<span className="text-bio-green">GB/s</span></div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-bio-green rounded-full animate-pulse shadow-[0_0_10px_#00ff80]" style={{ width: `${Math.min(100, parseFloat(throughput) * 30)}%` }} />
          </div>
        </BioCard>
        <BioCard className="p-6 flex flex-col justify-center gap-2 border-bio-cyan/10">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Synaptic Latency</span>
          <div className="text-3xl font-display font-extrabold text-white italic">0.12<span className="text-bio-cyan">ms</span></div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-bio-cyan w-[40%] rounded-full animate-pulse shadow-[0_0_10px_#00e5ff]" />
          </div>
        </BioCard>
        <BioCard className={`p-6 flex flex-col justify-center gap-2 ${dangerLevel > 30 ? 'border-bio-red/20' : 'border-bio-amber/10'}`}>
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Threat Resistance</span>
          <div className="text-3xl font-display font-extrabold text-white italic">
            {(100 - dangerLevel * 0.2).toFixed(1)}<span className={dangerLevel > 30 ? 'text-bio-red' : 'text-bio-amber'}>%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2">
            <div className={`h-full rounded-full animate-pulse ${dangerLevel > 30 ? 'bg-bio-red shadow-[0_0_10px_#ff3d00]' : 'bg-bio-amber shadow-[0_0_10px_#ffab00]'}`} style={{ width: `${100 - dangerLevel * 0.2}%` }} />
          </div>
        </BioCard>
        <BioCard className={`p-6 flex flex-col justify-center gap-2 ${isConnected ? 'border-bio-green/10' : 'border-bio-red/10'}`}>
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Ecosystem Status</span>
          <div className="text-2xl font-display font-extrabold text-white uppercase tracking-tighter italic">
            {isConnected ? 'NEURAL LINK: ' : 'OFFLINE'}
            <span className={isConnected ? 'text-bio-green' : 'text-bio-red'}>{isConnected ? 'SYNCED' : 'ERR'}</span>
          </div>
        </BioCard>
      </div>      {/* Sector Isolation Modal */}
      {showIsolationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-bio-darker border border-white/10 rounded-3xl p-8 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-display font-bold text-bio-amber tracking-tighter italic uppercase">Sector Quarantine Log</h2>
                <p className="text-slate-400 font-mono text-sm mt-1">Metabolic stabilization protocol engaged. Outbound routes severed.</p>
              </div>
              <div className="w-12 h-12 rounded-full border border-bio-amber/30 flex items-center justify-center bg-bio-amber/10 animate-pulse text-bio-amber">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-300">
                  Quarantined Entities ({allEntities.filter(e => e.status === 'quarantined' || e.status === 'isolated').length})
                </h4>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-bio-red/10 text-bio-red rounded text-[10px] font-bold uppercase">
                    {allEntities.filter(e => e.status === 'quarantined' || e.status === 'isolated').length} Quarantined
                  </span>
                </div>
              </div>
              <div className="overflow-auto flex-1 p-0 custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-black/40 sticky top-0 backdrop-blur-md">
                    <tr className="text-slate-500 text-[10px] uppercase tracking-widest">
                      <th className="p-4 font-bold">Entity Name</th>
                      <th className="p-4 font-bold">Type</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">CPU Load</th>
                      <th className="p-4 font-bold">Mem Load</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allEntities.filter(e => e.status === 'quarantined' || e.status === 'isolated').length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                          No entities currently in quarantine. Sector Alpha operating optimally.
                        </td>
                      </tr>
                    ) : (
                      allEntities
                        .filter(e => e.status === 'quarantined' || e.status === 'isolated')
                        .map(entity => {
                          return (
                            <tr key={entity.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4 font-bold text-white flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-bio-red animate-pulse" />
                                {entity.name}
                              </td>
                              <td className="p-4 font-mono text-xs">{entity.type}</td>
                              <td className="p-4">
                                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-bio-red/10 text-bio-red">
                                  {entity.status}
                                </span>
                              </td>
                              <td className="p-4 font-mono text-bio-cyan">{entity.cpuUsage?.toFixed(1)}%</td>
                              <td className="p-4 font-mono text-bio-green">{entity.memoryUsage?.toFixed(1)}%</td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
 
            <div className="mt-6 flex justify-between items-center">
              <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Awaiting further instruction from T-Cell Command.</p>
              <button 
                onClick={() => setShowIsolationModal(false)} 
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white hover:bg-white/10 transition-all uppercase tracking-widest active:scale-95"
              >
                DISMISS QUARANTINE LOG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
