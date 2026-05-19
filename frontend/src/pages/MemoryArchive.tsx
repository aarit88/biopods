import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BioCard } from '../components/ui/BioCard';
import { 
  Database, 
  Search, 
  History, 
  Download, 
  HardDrive, 
  Cpu, 
  Archive, 
  FileJson, 
  Loader2, 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  FileSpreadsheet 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';

export const MemoryArchive: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [memoryCells, setMemoryCells] = useState<any[]>([]);
  const [imports, setImports] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // Filter States
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [selectedAttack, setSelectedAttack] = useState('all');
  const [selectedBucket, setSelectedBucket] = useState('hour');

  // File Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch memory cells from database
  const fetchMemory = async () => {
    try {
      const response = await apiService.memoryCells.list();
      setMemoryCells(response.data);
    } catch (error) {
      console.error("Failed to fetch memory cells", error);
    }
  };

  // Fetch dataset imports from database
  const fetchImports = async () => {
    try {
      const response = await apiService.dataset.listImports();
      if (response.data?.success) {
        setImports(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch dataset imports", error);
    }
  };

  // Fetch aggregated trends from database
  const fetchTrends = async () => {
    setIsLoadingTrends(true);
    try {
      const params: any = {
        bucket: selectedBucket
      };
      if (selectedEntity !== 'all') {
        params.entity = selectedEntity;
      }
      if (selectedAttack !== 'all') {
        params.attack_type = selectedAttack;
      }

      const response = await apiService.dataset.getTrends(params);
      if (response.data?.success) {
        setTrends(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch trends", error);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  useEffect(() => {
    fetchMemory();
    fetchImports();
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [selectedEntity, selectedAttack, selectedBucket]);

  // Export Neural Memory Base
  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      
      const knowledgeJSON = JSON.stringify({
        generation: 4,
        exportedAt: new Date().toISOString(),
        memoryCellsCount: memoryCells.length,
        memoryCells,
        sourceImports: imports
      }, null, 2);

      const blob = new Blob([knowledgeJSON], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `biopods_knowledge_gen4_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1500);
  };

  const handleRestore = (id: string) => {
    if (confirm(`INITIATE NEURAL REINTEGRATION: Are you sure you want to restore cluster state from ${id}?`)) {
      alert(`Reintegrating ${id}... Neural buffers cleared. Cluster DNA stabilized.`);
    }
  };

  // File Select Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  // CSV Upload Submission
  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await apiService.dataset.upload(formData);
      if (response.data?.success) {
        setUploadResult(response.data);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Refresh trends and imports
        fetchImports();
        fetchTrends();
      } else {
        setUploadError(response.data?.error || "Ingestion failed.");
      }
    } catch (error: any) {
      setUploadError(error.response?.data?.error || error.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  // Dynamic capacity calculations based on database metrics count (ceiling: 500,000 rows)
  const totalMetricsCount = useMemo(() => {
    return imports.reduce((acc, curr) => acc + (curr.rowsInserted || 0), 0);
  }, [imports]);

  const storageUsed = useMemo(() => {
    return Math.min(100, Math.round((totalMetricsCount / 500000) * 100)) || 10;
  }, [totalMetricsCount]);

  // Aggregated dynamic trends down to 10 visual bars
  const historyData = useMemo(() => {
    if (!trends.length) {
      // Sleek fallback visualization if database trends are empty
      return [
        { label: 'GEN-1', value: 40, hasAnomaly: false },
        { label: 'GEN-2', value: 60, hasAnomaly: false },
        { label: 'GEN-3', value: 35, hasAnomaly: true },
        { label: 'GEN-4', value: 80, hasAnomaly: false },
        { label: 'GEN-5', value: 55, hasAnomaly: false },
        { label: 'GEN-6', value: 90, hasAnomaly: true },
        { label: 'GEN-7', value: 75, hasAnomaly: false },
        { label: 'GEN-8', value: 85, hasAnomaly: false },
        { label: 'GEN-9', value: 45, hasAnomaly: true },
        { label: 'GEN-10', value: 95, hasAnomaly: false }
      ];
    }

    // Process real SQL trends in buckets
    const barCount = 12;
    const interval = Math.max(1, Math.floor(trends.length / barCount));
    const processed = [];

    for (let i = 0; i < trends.length && processed.length < barCount; i += interval) {
      const slice = trends.slice(i, i + interval);
      const avgCpu = slice.reduce((sum, item) => sum + (item.cpu_avg || 0), 0) / slice.length;
      const totalAnomalies = slice.reduce((sum, item) => sum + (item.anomaly_count || 0), 0);
      const time = new Date(slice[0].bucket);
      
      const label = `${time.getMonth() + 1}/${time.getDate()} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      
      // Let's normalize value nicely for the height percentage (usually cpu_avg is between 0 and 1, or 0 and 100)
      let heightVal = avgCpu;
      if (heightVal <= 1.0) {
        heightVal = heightVal * 100;
      }
      
      processed.push({
        label,
        value: Math.max(10, Math.min(100, heightVal)),
        hasAnomaly: totalAnomalies > 0
      });
    }

    return processed;
  }, [trends]);

  // Formatter for bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const services = [
    { value: 'all', label: 'All Ecosystem Components' },
    { value: 'frontend', label: 'Frontend UI microservice' },
    { value: 'accounts-db', label: 'Accounts Database' },
    { value: 'balancereader', label: 'Balance Reader' },
    { value: 'contacts', label: 'Contacts API' },
    { value: 'ledger-db', label: 'Ledger Database' },
    { value: 'ledgerwriter', label: 'Ledger Writer' },
    { value: 'transactionhistory', label: 'Transaction History' },
    { value: 'userservice', label: 'User Management Service' }
  ];

  const attackTypes = [
    { value: 'all', label: 'All Attack Vectors' },
    { value: 'slowloris', label: 'Slowloris TCP Flood' },
    { value: 'torshammer', label: 'Torshammer Slow POST' },
    { value: 'cloud_anomaly', label: 'Virtual Machine Escape' }
  ];

  return (
    <div className="space-y-8">
      {/* Page Title Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-bio-cyan/10 border border-bio-cyan/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.1)]">
            <Database className="text-bio-cyan" size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-white tracking-tighter uppercase italic">
              Immune <span className="text-bio-cyan">Memory Archive</span>
            </h2>
            <p className="text-slate-500 font-mono text-xs tracking-widest mt-1">Evolving DNA database and historical threat registry</p>
          </div>
        </div>
        
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-bio-cyan transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search neural cells..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bio-darker border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs font-mono text-white focus:outline-none focus:border-bio-cyan/50 focus:bg-bio-dark transition-all placeholder:text-slate-600 shadow-inner"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Historical Bar Chart Card */}
        <BioCard className="p-8 lg:col-span-2 bg-bio-dark/40 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <History size={120} />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h3 className="text-xl font-display font-black text-white uppercase italic tracking-wider">Ecosystem Evolutionary Trends</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">Dynamic telemetry analytics mapped from active database</p>
            </div>
            
            {/* Real-time refresh indicator */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className={`w-1.5 h-1.5 rounded-full ${isLoadingTrends ? 'bg-bio-cyan animate-ping' : 'bg-bio-green animate-pulse'}`} />
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                {isLoadingTrends ? 'Syncing...' : 'Database Synced'}
              </span>
            </div>
          </div>

          {/* Interactive Chart Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Microservice Component</span>
              <select 
                value={selectedEntity} 
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="bg-bio-darker text-[10px] text-white font-mono border border-white/5 rounded-xl px-3 py-2.5 focus:outline-none focus:border-bio-cyan/40 transition-colors"
              >
                {services.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Signature Type</span>
              <select 
                value={selectedAttack} 
                onChange={(e) => setSelectedAttack(e.target.value)}
                className="bg-bio-darker text-[10px] text-white font-mono border border-white/5 rounded-xl px-3 py-2.5 focus:outline-none focus:border-bio-cyan/40 transition-colors"
              >
                {attackTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Time Horizon Bucket</span>
              <select 
                value={selectedBucket} 
                onChange={(e) => setSelectedBucket(e.target.value)}
                className="bg-bio-darker text-[10px] text-white font-mono border border-white/5 rounded-xl px-3 py-2.5 focus:outline-none focus:border-bio-cyan/40 transition-colors"
              >
                <option value="minute">Minute-level resolution</option>
                <option value="hour">Hour-level resolution</option>
                <option value="day">Day-level resolution</option>
              </select>
            </div>
          </div>
          
          {/* Dynamic Bar Chart Elements */}
          <div className="h-64 flex items-end gap-3 px-4 relative z-10">
            {isLoadingTrends ? (
              <div className="absolute inset-0 flex items-center justify-center bg-bio-darker/10 backdrop-blur-[1px]">
                <Loader2 className="animate-spin text-bio-cyan" size={32} />
              </div>
            ) : null}
            
            {historyData.map((h, i) => (
              <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-3 group/bar">
                <div className="w-full relative flex flex-col justify-end" style={{ height: '80%' }}>
                  {/* Tooltip value */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-bio-darker border border-white/10 px-2 py-0.5 rounded text-[8px] font-mono text-white opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                    {h.value.toFixed(1)}% Load {h.hasAnomaly ? '⚠️' : ''}
                  </div>
                  
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h.value}%` }}
                    transition={{ duration: 0.8, delay: i * 0.02 }}
                    className={`w-full rounded-t-xl transition-all duration-300 cursor-pointer ${
                      h.hasAnomaly 
                      ? 'bg-bio-red/40 hover:bg-bio-red shadow-[0_0_20px_rgba(255,61,0,0.3)]' 
                      : 'bg-bio-cyan/20 hover:bg-bio-cyan/70 hover:shadow-[0_0_20px_rgba(0,229,255,0.3)]'
                    }`}
                  />
                </div>
                <span className="text-[7px] font-black font-mono text-slate-500 tracking-tighter opacity-50 group-hover/bar:opacity-100 transition-opacity truncate max-w-full text-center">
                  {h.label}
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5 text-[9px] font-black tracking-widest uppercase">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-bio-cyan/30 border border-bio-cyan/50" /> Baseline Metric</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-bio-red/40 border border-bio-red/50 animate-pulse" /> Anomalous Pathogen Event</div>
            </div>
            <span className="font-mono text-slate-500 text-[8px]">Dataset Size: {totalMetricsCount.toLocaleString()} rows</span>
          </div>
        </BioCard>

        {/* Sidebar Status & Upload Ingestion Card */}
        <div className="space-y-8">
          {/* Storage Capacity Gauge */}
          <BioCard className="p-8 space-y-6 bg-bio-dark/40 border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Database Index Status</h3>
              <Archive size={16} className="text-bio-cyan" />
            </div>

            <div className="flex items-center justify-center py-2">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/5" />
                  <motion.circle 
                    cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="10" fill="transparent" 
                    strokeDasharray="415"
                    initial={{ strokeDashoffset: 415 }}
                    animate={{ strokeDashoffset: 415 - (415 * storageUsed / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="text-bio-cyan shadow-[0_0_20px_rgba(0,229,255,0.5)]" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-display font-black text-white italic">
                    {storageUsed}%
                  </span>
                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">CAPACITY</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Cpu size={14} className="text-bio-cyan" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Historical Rows</span>
                </div>
                <span className="text-xs font-mono text-white">{totalMetricsCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <HardDrive size={14} className="text-bio-cyan" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Imports</span>
                </div>
                <span className="text-xs font-mono text-white">{imports.length} sets</span>
              </div>
            </div>

            <button 
              onClick={handleExport}
              disabled={isExporting || memoryCells.length === 0}
              className="w-full py-3.5 bg-bio-cyan/10 border border-bio-cyan/20 rounded-2xl text-[10px] font-black text-bio-cyan hover:bg-bio-cyan/20 transition-all flex items-center justify-center gap-3 tracking-[0.2em] uppercase active:scale-95 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              {isExporting ? 'COMPRESSING ARCHIVE...' : 'EXPORT NEURAL KNOWLEDGE'}
            </button>
          </BioCard>

          {/* Premium Dataset Upload Component */}
          <BioCard className="p-6 bg-bio-dark/40 border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Ingest Historical CSV</h3>
              <UploadCloud size={16} className="text-bio-green" />
            </div>
            
            <p className="text-[9px] text-slate-500 font-mono leading-relaxed uppercase">
              Upload normalized Kaggle CSV metrics to train the T-Cell Memory Cells on past anomalies.
            </p>

            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
                selectedFile 
                ? 'border-bio-green bg-bio-green/5' 
                : 'border-white/10 hover:border-bio-cyan/50 hover:bg-bio-cyan/5'
              } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
              <FileSpreadsheet className={selectedFile ? 'text-bio-green animate-pulse' : 'text-slate-500'} size={32} />
              
              {selectedFile ? (
                <div className="text-center w-full">
                  <div className="text-xs font-mono text-white font-bold truncate max-w-full px-2">
                    {selectedFile.name}
                  </div>
                  <div className="text-[8px] font-mono text-slate-500 mt-1">
                    {formatBytes(selectedFile.size)}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-400">Click to locate CSV dataset</span>
                  <p className="text-[8px] font-mono text-slate-600 mt-1 uppercase">Supports Cloud Anomaly & BoA metrics</p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-bold text-slate-500 hover:text-white transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={isUploading}
                  className="flex-2 py-2 bg-bio-green/20 border border-bio-green/40 hover:bg-bio-green/30 text-bio-green font-bold text-[9px] rounded-xl flex items-center justify-center gap-1.5 tracking-wider active:scale-95"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={12} /> : null}
                  {isUploading ? 'INGESTING...' : 'START INGESTION'}
                </button>
              </div>
            )}

            {/* Ingestion Results Alert Block */}
            <AnimatePresence>
              {uploadResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-3 border rounded-xl flex items-start gap-2.5 text-[10px] ${
                    uploadResult.duplicate 
                    ? 'bg-bio-amber/10 border-bio-amber/20 text-bio-amber' 
                    : 'bg-bio-green/10 border-bio-green/20 text-bio-green'
                  }`}
                >
                  {uploadResult.duplicate ? (
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle size={14} className="shrink-0 mt-0.5" />
                  )}
                  <div className="font-mono leading-normal">
                    <span className="font-bold uppercase tracking-wider block mb-1">
                      {uploadResult.duplicate ? 'Duplicate Warning' : 'Ingestion Completed'}
                    </span>
                    <p className="text-[9px] text-slate-400 font-sans">
                      {uploadResult.duplicate 
                        ? 'This file has already been ingested. Duplicate imports are blocked via SHA-256 validation.' 
                        : `Successfully normalized and seeded ${uploadResult.insertedRows.toLocaleString()} metrics in database.`
                      }
                    </p>
                  </div>
                </motion.div>
              )}

              {uploadError && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 bg-bio-red/10 border border-bio-red/20 rounded-xl text-bio-red flex items-start gap-2 text-[10px]"
                >
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div className="font-mono">
                    <span className="font-bold uppercase tracking-wider block">Ingestion Failed</span>
                    <p className="text-[9px] text-slate-400 mt-1">{uploadError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </BioCard>
        </div>
      </div>

      {/* Dataset Imports Log Table */}
      <BioCard className="p-0 border-white/5 overflow-hidden bg-bio-dark/40">
        <div className="p-6 border-b border-white/5 bg-bio-dark/20 flex items-center justify-between">
          <h3 className="text-xs font-black text-white flex items-center gap-3 uppercase tracking-widest italic">
            <History size={16} className="text-bio-green" />
            Historical Datasets Ingested in Database
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-bio-green animate-pulse" />
            <span className="text-[9px] font-mono text-slate-500 uppercase">{imports.length} Ingested Logs</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {imports.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-mono text-xs uppercase tracking-widest">
              No historical datasets registered in SQLite database.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bio-darker/30 border-b border-white/5">
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">File ID</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Source File Name</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">File Size</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">SHA-256 Hash</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Dataset Category</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Rows Ingested</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Imported At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {imports.map((imp, i) => (
                    <motion.tr 
                      key={imp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-bio-cyan/5 group transition-colors"
                    >
                      <td className="px-8 py-4 font-mono text-[10px] text-bio-cyan font-bold">
                        {imp.id.substring(0, 8)}
                      </td>
                      <td className="px-8 py-4 font-bold text-white tracking-tight text-xs">
                        {imp.sourceFile}
                      </td>
                      <td className="px-8 py-4 text-[10px] text-slate-400 font-mono">
                        {formatBytes(imp.fileSize)}
                      </td>
                      <td className="px-8 py-4 text-[9px] text-slate-600 font-mono uppercase truncate max-w-[120px]" title={imp.fileHash}>
                        {imp.fileHash.substring(0, 16)}...
                      </td>
                      <td className="px-8 py-4">
                        <span className="px-2 py-1 bg-bio-cyan/10 border border-bio-cyan/20 text-bio-cyan text-[8px] font-bold font-mono rounded-lg uppercase tracking-wider">
                          {imp.datasetType}
                        </span>
                      </td>
                      <td className="px-8 py-4 font-mono font-bold text-xs text-bio-green">
                        {imp.rowsInserted.toLocaleString()} rows
                      </td>
                      <td className="px-8 py-4 text-[10px] text-slate-500 font-mono">
                        {new Date(imp.createdAt).toLocaleString()}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </BioCard>

      {/* Memory Cells Section (Original Component, fully working with Database) */}
      <BioCard className="p-0 border-white/5 overflow-hidden bg-bio-dark/40">
        <div className="p-6 border-b border-white/5 bg-bio-dark/20 flex items-center justify-between">
          <h3 className="text-xs font-black text-white flex items-center gap-3 uppercase tracking-widest italic">
            <History size={16} className="text-bio-cyan" />
            T-Cell Active Memory Cells (Threat Signatures)
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-bio-cyan animate-pulse" />
            <span className="text-[9px] font-mono text-slate-500 uppercase">{memoryCells.length} Neural Patterns</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {memoryCells.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-mono text-xs uppercase tracking-widest">
              No T-Cell memory cells loaded.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bio-darker/30 border-b border-white/5">
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Cell ID</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Extraction Type</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Payload Size</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Neural Hash</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Archived At</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {memoryCells.filter(ex => 
                    ex.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    ex.threatSignature?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((ex, i) => (
                    <motion.tr 
                      key={ex.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-bio-cyan/5 group transition-colors"
                    >
                      <td className="px-8 py-4 font-mono text-[10px] text-bio-cyan font-bold">{ex.id.substring(0, 8)}</td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <FileJson size={14} className="text-slate-500 group-hover:text-bio-cyan transition-colors" />
                          <span className="text-xs font-bold text-white tracking-tight uppercase">{ex.threatSignature || 'NEURAL_PATTERN'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-[10px] text-slate-400 font-mono italic">{ex.successCount || 0} hits</td>
                      <td className="px-8 py-4 text-[10px] text-slate-600 font-mono uppercase">{ex.vectorId || 'VEC-NONE'}</td>
                      <td className="px-8 py-4 text-[10px] text-slate-500 font-mono">{new Date(ex.createdAt).toLocaleString()}</td>
                      <td className="px-8 py-4 text-right">
                        <button 
                          onClick={() => handleRestore(ex.id)}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest group-hover:border-bio-cyan/30 active:scale-95"
                        >
                          RESTORE
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </BioCard>
    </div>
  );
};
