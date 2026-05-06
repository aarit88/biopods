import React, { useEffect } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-login for Demo
    const autoLogin = async () => {
      try {
        const { data } = await apiService.auth.login({ email: 'admin@biopods.io', password: 'password' });
        localStorage.setItem('biopods_token', data.accessToken);
        console.log("Demo Authentication Successful");
      } catch (e) {
        console.error("Demo Auth Failed", e);
      }
    };
    autoLogin();
  }, []);

  const titleLetters = "BIOPODS".split("");

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.04 * i },
    }),
  };

  const child: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <div className="min-h-screen bg-bio-darker flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Neural Grid */}
      <div className="absolute inset-0 neural-bg opacity-20" />
      
      {/* Dynamic Background Glows */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1] 
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-bio-green/20 blur-[150px] rounded-full pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1] 
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-bio-cyan/20 blur-[150px] rounded-full pointer-events-none" 
      />
      
      <div className="relative z-10 max-w-5xl text-center space-y-16">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-6 py-2 rounded-full bg-bio-green/5 border border-bio-green/20 text-bio-green text-[10px] font-black tracking-[0.4em] uppercase"
        >
          Autonomous Cluster Immunity v4.0
        </motion.div>
        
        {/* ANIMATED TRENDY TITLE */}
        <div className="relative">
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-center gap-2 md:gap-4"
          >
            {titleLetters.map((letter, index) => (
              <motion.span
                key={index}
                variants={child}
                className="text-7xl md:text-9xl font-display font-black tracking-tighter italic uppercase relative"
              >
                {/* Foreground Layer */}
                <span className={index > 2 ? 'text-bio-green' : 'text-white'}>
                  {letter}
                </span>
                
                {/* Glitch/Shadow Layers */}
                <motion.span
                  animate={{ 
                    x: [0, -2, 2, 0],
                    opacity: [0, 0.5, 0]
                  }}
                  transition={{ duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 5 }}
                  className="absolute inset-0 text-bio-cyan opacity-50 blur-[2px] pointer-events-none"
                >
                  {letter}
                </motion.span>
              </motion.span>
            ))}
          </motion.div>
          
          {/* Decorative underline animation */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 1, duration: 1 }}
            className="h-1 bg-gradient-to-r from-transparent via-bio-green to-transparent mt-4 opacity-50"
          />
        </div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-xl md:text-4xl text-slate-500 font-medium max-w-3xl mx-auto leading-tight font-display italic"
        >
          Your cluster doesn't need a manager. <br />
          <motion.span 
            animate={{ color: ['#ffffff', '#00ff80', '#ffffff'] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-white"
          >
            It needs an immune system.
          </motion.span>
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-10 pt-16"
        >
          <button 
            onClick={() => navigate('/dashboard')}
            className="group relative px-14 py-6 bg-bio-green text-bio-dark text-sm font-black tracking-[0.2em] rounded-2xl shadow-[0_20px_50px_rgba(0,255,128,0.25)] hover:scale-110 active:scale-95 transition-all uppercase italic overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
            Enter Command Center
          </button>
          <button 
            onClick={() => navigate('/healing')}
            className="px-14 py-6 border-2 border-white/10 text-white text-sm font-black tracking-[0.2em] rounded-2xl hover:bg-white/5 hover:border-bio-green/30 active:scale-95 transition-all uppercase italic"
          >
            View Protocols
          </button>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl w-full relative z-10"
      >
        <BioCard className="p-12 bg-bio-dark/60 border-white/5 group hover:border-bio-green/40 transition-all hover:-translate-y-2">
          <h3 className="text-bio-green mb-8 font-black uppercase tracking-[0.3em] text-xs italic">Self-Healing</h3>
          <p className="text-slate-500 text-sm font-mono leading-relaxed group-hover:text-slate-300 transition-colors">
            Autonomous antibodies detect and neutralize pod infections in milliseconds before they spread across the namespace.
          </p>
        </BioCard>
        <BioCard className="p-12 bg-bio-dark/60 border-white/5 group hover:border-bio-cyan/40 transition-all hover:-translate-y-2">
          <h3 className="text-bio-cyan mb-8 font-black uppercase tracking-[0.3em] text-xs italic">Neural Mapping</h3>
          <p className="text-slate-500 text-sm font-mono leading-relaxed group-hover:text-slate-300 transition-colors">
            Real-time synaptic visualization of your cluster's metabolic health, providing deep observability into sub-atomic pod interactions.
          </p>
        </BioCard>
        <BioCard className="p-12 bg-bio-dark/60 border-white/5 group hover:border-bio-red/40 transition-all hover:-translate-y-2">
          <h3 className="text-bio-red mb-8 font-black uppercase tracking-[0.3em] text-xs italic">Threat Memory</h3>
          <p className="text-slate-500 text-sm font-mono leading-relaxed group-hover:text-slate-300 transition-colors">
            AI agents evolve to remember and prevent recurring infrastructure anomalies, creating a permanent genetic record of cluster stability.
          </p>
        </BioCard>
      </motion.div>
    </div>
  );
};
