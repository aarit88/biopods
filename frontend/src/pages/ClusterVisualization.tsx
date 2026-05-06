import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float, Stars } from '@react-three/drei';
import { BioCard } from '../components/ui/BioCard';
import { useSocket } from '../hooks/useSocket';
import * as THREE from 'three';

const NeuralCore = () => {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#00ff80"
          speed={3}
          distort={0.4}
          radius={1}
          emissive="#00ff80"
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
};

const PodNode = ({ position, health }: { position: [number, number, number], health: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.002;
    }
  });

  const color = health > 80 ? '#00ff80' : health > 50 ? '#ffab00' : '#ff3d00';

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={1} 
        />
      </mesh>
      <line>
        <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-position[0], -position[1], -position[2])])} />
        <lineBasicMaterial attach="material" color={color} transparent opacity={0.2} />
      </line>
    </group>
  );
};

const NodeCloud = () => {
  const nodes = useMemo(() => {
    return [...Array(30)].map((_, i) => {
      const angle = (i / 30) * Math.PI * 2;
      const radius = 2.5 + Math.random() * 1.5;
      return {
        id: i,
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 3,
          Math.sin(angle) * radius
        ] as [number, number, number],
        health: Math.random() * 100
      };
    });
  }, []);

  return (
    <group>
      {nodes.map((node) => (
        <PodNode key={node.id} position={node.position} health={node.health} />
      ))}
    </group>
  );
};

export const ClusterVisualization: React.FC = () => {
  const { isConnected } = useSocket();
  const controlsRef = useRef<any>(null);

  const handleFocusCore = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleIsolateSector = () => {
    alert("Isolating Sector 01: Initiating metabolic stabilization...");
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-8">
      <div className="flex-1 glass-panel relative overflow-hidden bg-bio-darker rounded-3xl border border-white/5 shadow-2xl">
        <div className="absolute top-8 left-8 z-10 pointer-events-none">
          <h3 className="text-3xl font-display font-extrabold text-white tracking-tighter uppercase italic">
            Macro-Ecosystem <span className="text-bio-green">View</span>
          </h3>
          <p className="text-slate-500 font-mono text-xs tracking-widest mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-bio-green animate-pulse" />
            REAL-TIME METABOLIC TOPOLOGY ACTIVE
          </p>
        </div>
        
        <div className="absolute top-8 right-8 z-10 flex gap-4">
          <BioCard className="px-5 py-3 bg-bio-dark/60 backdrop-blur-md flex flex-col gap-1 border-bio-green/20">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">Stability</span>
            <span className="text-bio-green font-mono text-lg font-bold">94.2%</span>
          </BioCard>
          <BioCard className="px-5 py-3 bg-bio-dark/60 backdrop-blur-md flex flex-col gap-1 border-bio-cyan/20">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">Active Nodes</span>
            <span className="text-bio-cyan font-mono text-lg font-bold">42</span>
          </BioCard>
        </div>

        <Canvas camera={{ position: [0, 2, 7], fov: 60 }}>
          <color attach="background" args={['#020305']} />
          <fog attach="fog" args={['#020305', 5, 15]} />
          
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#00ff80" />
          <pointLight position={[-10, -10, -10]} intensity={0.8} color="#00e5ff" />
          
          <Suspense fallback={null}>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <NeuralCore />
            <NodeCloud />
            <OrbitControls 
              ref={controlsRef}
              enableZoom={true} 
              autoRotate 
              autoRotateSpeed={0.5} 
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
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:bg-white/10 transition-all uppercase tracking-widest active:scale-95"
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
        </div>
      </div>

      <div className="h-48 grid grid-cols-1 md:grid-cols-4 gap-6">
        <BioCard className="p-6 flex flex-col justify-center gap-2 border-bio-green/10">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Neural Throughput</span>
          <div className="text-3xl font-display font-extrabold text-white italic">2.4<span className="text-bio-green">GB/s</span></div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-bio-green w-[70%] rounded-full animate-pulse shadow-[0_0_10px_#00ff80]" />
          </div>
        </BioCard>
        <BioCard className="p-6 flex flex-col justify-center gap-2 border-bio-cyan/10">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Synaptic Latency</span>
          <div className="text-3xl font-display font-extrabold text-white italic">0.12<span className="text-bio-cyan">ms</span></div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-bio-cyan w-[40%] rounded-full animate-pulse shadow-[0_0_10px_#00e5ff]" />
          </div>
        </BioCard>
        <BioCard className="p-6 flex flex-col justify-center gap-2 border-bio-amber/10">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Threat Resistance</span>
          <div className="text-3xl font-display font-extrabold text-white italic">99.8<span className="text-bio-amber">%</span></div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-bio-amber w-[95%] rounded-full animate-pulse shadow-[0_0_10px_#ffab00]" />
          </div>
        </BioCard>
        <BioCard className={`p-6 flex flex-col justify-center gap-2 ${isConnected ? 'border-bio-green/10' : 'border-bio-red/10'}`}>
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Ecosystem Status</span>
          <div className="text-2xl font-display font-extrabold text-white uppercase tracking-tighter italic">
            {isConnected ? 'NEURAL LINK: ' : 'OFFLINE'}
            <span className={isConnected ? 'text-bio-green' : 'text-bio-red'}>{isConnected ? 'SYNCED' : 'ERR'}</span>
          </div>
        </BioCard>
      </div>
    </div>
  );
};
