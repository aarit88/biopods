import React, { useState, useEffect } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldAlert, X } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Login Modal States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState('/dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Clear token on visit to force login
    localStorage.removeItem('biopods_token');
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { data } = await apiService.auth.login({ email, password });
      localStorage.setItem('biopods_token', data.accessToken);
      navigate(redirectTarget);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Authentication rejected. Verify security key.');
    } finally {
      setIsSubmitting(false);
    }
  };


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
            onClick={() => {
              setRedirectTarget('/dashboard');
              setShowLoginModal(true);
            }}
            className="group relative px-14 py-6 bg-bio-green text-bio-dark text-sm font-black tracking-[0.2em] rounded-2xl shadow-[0_20px_50px_rgba(0,255,128,0.25)] hover:scale-110 active:scale-95 transition-all uppercase italic overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
            Enter Command Center
          </button>
          <button 
            onClick={() => {
              setRedirectTarget('/healing');
              setShowLoginModal(true);
            }}
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

      {/* Visually Stunning Glassmorphic Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-bio-darker/95 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,255,128,0.15)] backdrop-blur-2xl relative overflow-hidden"
            >
              {/* Glowing header accent */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-bio-green to-transparent" />
              
              <button 
                onClick={() => setShowLoginModal(false)}
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-bio-green/10 border border-bio-green/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(0,255,128,0.1)]">
                  <Lock className="text-bio-green" size={20} />
                </div>
                <h3 className="text-2xl font-display font-black text-white italic tracking-tight uppercase">Command Center Authentication</h3>
                <p className="text-[10px] font-mono text-slate-500 tracking-wider uppercase mt-1">Identity validation protocol active</p>
              </div>

              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-6 p-4 bg-bio-red/10 border border-bio-red/20 rounded-2xl text-bio-red flex items-start gap-3 text-xs animate-pulse"
                >
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span className="font-mono">{errorMessage}</span>
                </motion.div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-mono">SECURE EMAIL ADDRESS</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-bio-green transition-colors" size={16} />
                    <input 
                      type="email" 
                      required
                      placeholder="admin@biopods.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-bio-dark border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs font-mono text-white focus:outline-none focus:border-bio-green/50 focus:bg-bio-darker transition-all placeholder:text-slate-700 shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-mono">ENCRYPTED KEYWORD</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-bio-green transition-colors" size={16} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-bio-dark border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-xs font-mono text-white focus:outline-none focus:border-bio-green/50 focus:bg-bio-darker transition-all placeholder:text-slate-700 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-bio-green text-bio-dark text-xs font-black tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase italic flex items-center justify-center gap-2 shadow-[0_15px_30px_rgba(0,255,128,0.2)] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        VALIDATING METABOLIC LINK...
                      </>
                    ) : (
                      <>
                        INITIALIZE DECRYPT SEQUENCE
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Seamless autofill trigger for hackathon presentation ease */}
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase">
                <span>Demo Profile:</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@biopods.io');
                    setPassword('password');
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-bio-green/10 hover:text-bio-green border border-white/10 rounded-xl transition-all font-bold tracking-widest hover:border-bio-green/30 text-slate-400"
                >
                  AUTO-LOAD CREDENTIALS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
