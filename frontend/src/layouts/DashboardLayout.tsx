import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ShieldAlert, Zap, X, Check, Home, Menu } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/api';

interface Notification {
  id: string;
  type: string;
  label: string;
  details: string;
  time: string;
  read: boolean;
}

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { anomalies } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sync anomalies to notifications
  useEffect(() => {
    if (anomalies.length > 0) {
      const latest = anomalies[0];
      const newNotif: Notification = {
        id: Math.random().toString(36).substring(7),
        type: latest.type,
        label: latest.label,
        details: latest.details,
        time: new Date().toLocaleTimeString(),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 10));
    }
  }, [anomalies]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowDropdown(false);
  };

  const handleDeployAntibody = async () => {
    try {
      await apiService.actions.execute('all', 'MITIGATE');
      alert("Antibody Deployment sequence initiated. Injecting mitigation patches...");
    } catch (e) {
      console.error("Deployment failed", e);
    }
  };

  return (
    <div className="flex min-h-screen bg-bio-dark text-slate-300 relative overflow-hidden">
      {/* Sidebar Overlay (for mobile-like feel) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className={`flex-1 min-h-screen relative overflow-hidden transition-all duration-500 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-bio-green/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-bio-cyan/5 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 bg-bio-dark/80 backdrop-blur-xl z-40">
          <div className="flex items-center gap-6">
            {/* Sidebar Toggle Button (3 Bars) */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 ${isSidebarOpen ? 'bg-bio-green/10 border-bio-green/30 text-bio-green' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-4">
              <h2 className="text-xl font-display font-bold text-white tracking-tight capitalize">
                {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
              </h2>
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500">
                <span className="w-2 h-2 rounded-full bg-bio-green animate-pulse" />
                LIVE TELEMETRY ACTIVE
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-bio-green hover:bg-bio-green/5 hover:border-bio-green/20 transition-all cursor-pointer group"
              title="Return to Landing Page"
            >
              <Home size={20} className="group-hover:scale-110 transition-transform" />
            </button>

            <div 
              onClick={handleDeployAntibody}
              className="hidden md:flex px-4 py-2 bg-bio-green/5 border border-bio-green/20 rounded-full text-bio-green text-[10px] font-black tracking-widest items-center gap-2 cursor-pointer hover:bg-bio-green/10 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,255,128,0.1)]"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bio-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-bio-green"></span>
              </span>
              DEPLOY ANTIBODY
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowDropdown(!showDropdown);
                  if (!showDropdown) markAllRead();
                }}
                className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all ${showDropdown ? 'text-bio-green border-bio-green/30 bg-bio-green/5' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                <Bell size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-bio-red text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-bio-dark shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              <AnimatePresence>
                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-[-1]" onClick={() => setShowDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 bg-bio-dark border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Neural Notifications</h3>
                        <button onClick={clearNotifications} className="text-[9px] font-black text-slate-500 hover:text-bio-red uppercase tracking-widest transition-colors">Clear All</button>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto scrollbar-none">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-600 space-y-3">
                            <Check className="mx-auto opacity-20" size={32} />
                            <p className="text-[10px] font-mono uppercase tracking-widest">Neural silence achieved.</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className={`p-4 border-b border-white/5 hover:bg-white/5 transition-all cursor-default ${!n.read ? 'bg-bio-green/5' : ''}`}>
                              <div className="flex items-start gap-3">
                                <div className={`p-1.5 rounded-lg ${n.label === 'DANGER' ? 'bg-bio-red/10 text-bio-red' : 'bg-bio-green/10 text-bio-green'}`}>
                                  {n.label === 'DANGER' ? <ShieldAlert size={14} /> : <Zap size={14} />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-black text-white uppercase tracking-tight">{n.type}</span>
                                    <span className="text-[8px] font-mono text-slate-500">{n.time}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-mono leading-tight">{n.details}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="p-3 bg-bio-darker/50 text-center">
                        <button className="text-[9px] font-black text-bio-green uppercase tracking-widest hover:underline">View Neural History</button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <section className="p-8 relative z-10 w-full min-h-[calc(100vh-80px)] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex-1 w-full h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
};
