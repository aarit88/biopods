import React, { useState, useEffect } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { Settings as SettingsIcon, Shield, Bell, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { BioButton } from '../components/ui/BioButton';
import { apiService } from '../services/api';

export const Settings: React.FC = () => {
  // Database Persisted Config State
  const [autonomousPurge, setAutonomousPurge] = useState(true);
  const [heuristicLearning, setHeuristicLearning] = useState(true);
  const [aggressiveBalancing, setAggressiveBalancing] = useState(false);
  const [criticalSensitivity, setCriticalSensitivity] = useState(85);
  const [metabolicWarning, setMetabolicWarning] = useState(40);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Fetch persistent database settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiService.settings.get();
        if (res.data) {
          setAutonomousPurge(res.data.autonomousPurge ?? true);
          setHeuristicLearning(res.data.heuristicLearning ?? true);
          setAggressiveBalancing(res.data.aggressiveBalancing ?? false);
          setCriticalSensitivity(res.data.criticalSensitivity ?? 85);
          setMetabolicWarning(res.data.metabolicWarning ?? 40);
        }
      } catch (err) {
        console.error('Failed to load database settings', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // 2. Persist configurations into SQLite DB
  const handleSave = async () => {
    setSaving(true);
    setToastMessage(null);
    try {
      const payload = {
        autonomousPurge,
        heuristicLearning,
        aggressiveBalancing,
        criticalSensitivity,
        metabolicWarning
      };
      await apiService.settings.save(payload);
      setToastMessage('IMMUNE PROTOCOLS SUCCESSFULLY PERSISTED IN SQLITE DATABASE');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to persist settings', err);
      setToastMessage('ERROR: FAILED TO PERSIST PROTOCOLS TO DATABASE');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-8 h-8 border-2 border-bio-green border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono uppercase text-slate-500 tracking-widest">Accessing central database memory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 font-mono text-xs font-bold tracking-wider ${toastMessage.includes('ERROR') ? 'bg-bio-red/10 border-bio-red/30 text-bio-red shadow-[0_0_15px_rgba(255,61,0,0.1)]' : 'bg-bio-green/10 border-bio-green/30 text-bio-green shadow-[0_0_15px_rgba(0,255,128,0.15)]'}`}>
          {toastMessage.includes('ERROR') ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-bio-green/10 border border-bio-green/20 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,128,0.1)]">
          <SettingsIcon className="text-bio-green" size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-display font-extrabold text-white tracking-tighter uppercase italic">
            System <span className="text-bio-green font-normal">Settings</span>
          </h2>
          <p className="text-slate-400 font-mono text-xs tracking-widest mt-1 uppercase">
            Configure immune protocols and neural thresholds
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Immune Protocols Card */}
        <BioCard className="p-8 border-white/5 bg-bio-dark/40 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
            <Shield size={20} className="text-bio-green" />
            <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider">Immune Protocols</h3>
          </div>
          
          <div className="space-y-6">
            {/* Auto Purge Switch */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white font-mono">Autonomous Purge</h4>
                <p className="text-xs text-slate-500">Automatically isolate and delete pods detected as infected</p>
              </div>
              <div 
                onClick={() => setAutonomousPurge(!autonomousPurge)}
                className={`w-12 h-6 rounded-full relative cursor-pointer border transition-all duration-300 ${autonomousPurge ? 'bg-bio-green/20 border-bio-green/50' : 'bg-white/5 border-white/10'}`}
              >
                <div 
                  className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all duration-300 ${autonomousPurge ? 'right-0.5 bg-bio-green shadow-[0_0_8px_#00ff80]' : 'left-0.5 bg-slate-500'}`} 
                />
              </div>
            </div>

            {/* Heuristic Learning Switch */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white font-mono">Heuristic Learning</h4>
                <p className="text-xs text-slate-500">Allow AI agents to evolve defense strategies based on cluster history</p>
              </div>
              <div 
                onClick={() => setHeuristicLearning(!heuristicLearning)}
                className={`w-12 h-6 rounded-full relative cursor-pointer border transition-all duration-300 ${heuristicLearning ? 'bg-bio-green/20 border-bio-green/50' : 'bg-white/5 border-white/10'}`}
              >
                <div 
                  className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all duration-300 ${heuristicLearning ? 'right-0.5 bg-bio-green shadow-[0_0_8px_#00ff80]' : 'left-0.5 bg-slate-500'}`} 
                />
              </div>
            </div>

            {/* Aggressive Balancing Switch */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white font-mono">Aggressive Balancing</h4>
                <p className="text-xs text-slate-500">Re-route traffic immediately when metabolic instability is detected</p>
              </div>
              <div 
                onClick={() => setAggressiveBalancing(!aggressiveBalancing)}
                className={`w-12 h-6 rounded-full relative cursor-pointer border transition-all duration-300 ${aggressiveBalancing ? 'bg-bio-green/20 border-bio-green/50' : 'bg-white/5 border-white/10'}`}
              >
                <div 
                  className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all duration-300 ${aggressiveBalancing ? 'right-0.5 bg-bio-green shadow-[0_0_8px_#00ff80]' : 'left-0.5 bg-slate-500'}`} 
                />
              </div>
            </div>
          </div>
        </BioCard>

        {/* Alert Thresholds Card */}
        <BioCard className="p-8 border-white/5 bg-bio-dark/40 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
            <Bell size={20} className="text-bio-cyan" />
            <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider">Alert Thresholds</h3>
          </div>
          
          <div className="space-y-8">
            {/* Critical Sensitivity Slider */}
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Critical Sensitivity</span>
                <span className="text-bio-cyan font-bold">{criticalSensitivity}%</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={criticalSensitivity}
                  onChange={(e) => setCriticalSensitivity(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-bio-cyan focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #00e5ff 0%, #00e5ff ${criticalSensitivity}%, rgba(255,255,255,0.05) ${criticalSensitivity}%, rgba(255,255,255,0.05) 100%)`
                  }}
                />
              </div>
            </div>

            {/* Metabolic Warning Slider */}
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Metabolic Warning</span>
                <span className="text-bio-amber font-bold">{metabolicWarning}%</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={metabolicWarning}
                  onChange={(e) => setMetabolicWarning(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-bio-amber focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #ffab00 0%, #ffab00 ${metabolicWarning}%, rgba(255,255,255,0.05) ${metabolicWarning}%, rgba(255,255,255,0.05) 100%)`
                  }}
                />
              </div>
            </div>
          </div>
        </BioCard>

        {/* Buttons Panel */}
        <div className="flex justify-end gap-4">
          <BioButton variant="ghost">CANCEL</BioButton>
          <BioButton 
            variant="primary" 
            className="gap-2 font-mono font-bold uppercase"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={18} />
            {saving ? 'PERSISTING...' : 'SAVE PROTOCOLS'}
          </BioButton>
        </div>
      </div>
    </div>
  );
};

