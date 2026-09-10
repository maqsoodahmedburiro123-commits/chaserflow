import React, { useState, useEffect } from 'react';
import { Invoice, ChaserSettings } from '../../types/chaserflow';
import { 
  X, 
  Download, 
  Upload, 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Users, 
  Database,
  ArrowRight,
  FileJson,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { 
  downloadWorkspaceBackup, 
  parseBackupJson, 
  mergeInvoices, 
  pushCloudSync, 
  pullCloudSync, 
  generateRandomWorkspaceKey,
  ChaserBackupSnapshot 
} from '../../lib/syncService';

interface BackupSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  settings: ChaserSettings;
  onUpdateInvoices: (invoices: Invoice[]) => void;
  onUpdateSettings?: (settings: ChaserSettings) => void;
}

const STORAGE_SYNC_KEY = 'chaserflow_cloud_workspace_key';
const STORAGE_SYNC_ENABLED = 'chaserflow_cloud_sync_enabled';

export const BackupSyncModal: React.FC<BackupSyncModalProps> = ({
  isOpen,
  onClose,
  invoices,
  settings,
  onUpdateInvoices,
  onUpdateSettings
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'backup' | 'cloud'>('backup');
  
  // Backup & Restore State
  const [dragActive, setDragActive] = useState(false);
  const [parsedSnapshot, setParsedSnapshot] = useState<ChaserBackupSnapshot | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [backupNotice, setBackupNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cloud Sync State
  const [workspaceKey, setWorkspaceKey] = useState<string>(() => {
    return localStorage.getItem(STORAGE_SYNC_KEY) || generateRandomWorkspaceKey();
  });
  const [isCloudEnabled, setIsCloudEnabled] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_SYNC_ENABLED) === 'true';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [cloudNotice, setCloudNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Persist workspace key changes
  useEffect(() => {
    if (workspaceKey) {
      localStorage.setItem(STORAGE_SYNC_KEY, workspaceKey.trim().toUpperCase());
    }
  }, [workspaceKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SYNC_ENABLED, isCloudEnabled ? 'true' : 'false');
  }, [isCloudEnabled]);

  if (!isOpen) return null;

  const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const paidCount = invoices.filter(inv => inv.status === 'paid').length;
  const unpaidCount = invoices.length - paidCount;

  // Handle Download Backup
  const handleDownload = () => {
    downloadWorkspaceBackup(invoices, settings, workspaceKey);
    setBackupNotice({
      type: 'success',
      message: `Exported ${invoices.length} invoices to JSON backup file successfully.`
    });
    setTimeout(() => setBackupNotice(null), 4000);
  };

  // Handle JSON File Upload
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setBackupNotice(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseBackupJson(content);
      if (result.valid && result.snapshot) {
        setParsedSnapshot(result.snapshot);
      } else {
        setBackupNotice({
          type: 'error',
          message: result.error || 'Invalid backup file format'
        });
      }
    };
    reader.readAsText(file);
  };

  // Apply Restore
  const handleApplyRestore = () => {
    if (!parsedSnapshot) return;

    let targetInvoices: Invoice[] = [];
    if (restoreMode === 'replace') {
      targetInvoices = parsedSnapshot.invoices;
    } else {
      targetInvoices = mergeInvoices(invoices, parsedSnapshot.invoices);
    }

    onUpdateInvoices(targetInvoices);

    if (parsedSnapshot.settings && onUpdateSettings && Object.keys(parsedSnapshot.settings).length > 0) {
      onUpdateSettings(parsedSnapshot.settings);
    }

    setBackupNotice({
      type: 'success',
      message: `Successfully restored ${parsedSnapshot.invoices.length} invoices (${restoreMode === 'merge' ? 'merged' : 'replaced'})!`
    });
    setParsedSnapshot(null);
  };

  // Cloud Sync: Push to remote
  const handlePushCloud = async () => {
    if (!workspaceKey.trim()) {
      setCloudNotice({ type: 'error', message: 'Please enter a valid Workspace Key.' });
      return;
    }
    setIsSyncing(true);
    setCloudNotice(null);

    const res = await pushCloudSync(workspaceKey, invoices, settings);
    setIsSyncing(false);

    if (res.success) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncedAt(nowStr);
      setCloudNotice({
        type: 'success',
        message: `Pushed ${invoices.length} invoices to cloud workspace "${workspaceKey.toUpperCase()}" at ${nowStr}.`
      });
    } else {
      setCloudNotice({
        type: 'error',
        message: res.error || 'Failed to push to cloud.'
      });
    }
  };

  // Cloud Sync: Pull from remote
  const handlePullCloud = async () => {
    if (!workspaceKey.trim()) {
      setCloudNotice({ type: 'error', message: 'Please enter a valid Workspace Key.' });
      return;
    }
    setIsSyncing(true);
    setCloudNotice(null);

    const res = await pullCloudSync(workspaceKey);
    setIsSyncing(false);

    if (res.status === 'ok') {
      if (res.found && res.invoices) {
        onUpdateInvoices(res.invoices);
        if (res.settings && onUpdateSettings) {
          onUpdateSettings(res.settings);
        }
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncedAt(nowStr);
        setCloudNotice({
          type: 'success',
          message: `Pulled ${res.invoices.length} invoices from cloud workspace "${workspaceKey.toUpperCase()}"!`
        });
      } else {
        setCloudNotice({
          type: 'info',
          message: `Cloud workspace "${workspaceKey.toUpperCase()}" is ready. Click "Push to Cloud" to upload current local invoices.`
        });
      }
    } else {
      setCloudNotice({
        type: 'error',
        message: res.message || 'Failed to pull cloud data.'
      });
    }
  };

  // Copy Workspace Key to clipboard
  const handleCopyKey = () => {
    navigator.clipboard.writeText(workspaceKey.trim().toUpperCase());
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-5 border-b ${
          isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800/80 bg-slate-900/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Backup &amp; Cloud Database Sync</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Cross-Device
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                1-click file portability &amp; multi-device cloud synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex border-b px-6 pt-2 gap-4 ${isLight ? 'border-slate-200 bg-slate-50/30' : 'border-slate-800 bg-slate-950/20'}`}>
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>1-Click Backup &amp; Restore</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
              activeTab === 'cloud'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Cloud Database Sync</span>
            {isCloudEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: 1-CLICK BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6">

              {/* Status Notice */}
              {backupNotice && (
                <div className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs font-medium border ${
                  backupNotice.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                }`}>
                  {backupNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{backupNotice.message}</span>
                </div>
              )}

              {/* Download Section */}
              <div className={`p-5 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      Download Workspace Snapshot
                    </h4>
                    <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Save a complete backup of your ledger ({invoices.length} invoices, ${totalAmount.toLocaleString()} total), reminder histories, and custom templates.
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-slate-400">
                      <span>Invoices: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>{invoices.length}</strong></span>
                      <span>•</span>
                      <span>Paid: <strong className="text-emerald-400">{paidCount}</strong></span>
                      <span>•</span>
                      <span>Unpaid: <strong className="text-amber-400">{unpaidCount}</strong></span>
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-950/40 cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Backup (.json)</span>
                  </button>
                </div>
              </div>

              {/* Restore Section */}
              <div className={`p-5 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
              }`}>
                <h4 className="font-bold text-sm flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  Restore or Import Backup
                </h4>
                <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Upload a previously saved ChaserFlow backup `.json` file to restore your invoices on any computer or browser.
                </p>

                {/* Drag and Drop Box */}
                {!parsedSnapshot ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                      dragActive
                        ? 'border-indigo-400 bg-indigo-500/10'
                        : isLight 
                        ? 'border-slate-300 hover:border-indigo-400 bg-white' 
                        : 'border-slate-700 hover:border-indigo-400 bg-slate-900/60'
                    }`}
                  >
                    <input
                      type="file"
                      id="backup-file-input"
                      accept=".json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="backup-file-input" className="cursor-pointer block">
                      <FileJson className="w-8 h-8 mx-auto text-indigo-400 mb-2 opacity-80" />
                      <span className="text-xs font-semibold block text-indigo-400 hover:underline">
                        Click to select backup file or drag &amp; drop here
                      </span>
                      <span className={`text-[11px] block mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        Accepts .json backup files
                      </span>
                    </label>
                  </div>
                ) : (
                  /* File Loaded Preview */
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-indigo-950/30 border-indigo-800/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-indigo-300">
                          Backup File Verified &amp; Ready
                        </span>
                      </div>
                      <button
                        onClick={() => setParsedSnapshot(null)}
                        className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Invoices Found</span>
                        <strong className="text-sm font-mono text-white">{parsedSnapshot.invoices.length}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Total Amount</span>
                        <strong className="text-sm font-mono text-emerald-400">
                          ${(parsedSnapshot.stats?.totalAmount || 0).toLocaleString()}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Exported Date</span>
                        <span className="text-[11px] text-slate-300 block truncate">
                          {parsedSnapshot.exportedAt ? new Date(parsedSnapshot.exportedAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Templates</span>
                        <span className="text-[11px] text-slate-300 block">
                          {parsedSnapshot.settings ? 'Included' : 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Restore Mode Choice */}
                    <div className="pt-2 border-t border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="text-indigo-500 focus:ring-indigo-400"
                          />
                          <span className="font-medium">Merge (Safe, keep both)</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'replace'}
                            onChange={() => setRestoreMode('replace')}
                            className="text-indigo-500 focus:ring-indigo-400"
                          />
                          <span className="font-medium">Replace Entire Workspace</span>
                        </label>
                      </div>

                      <button
                        onClick={handleApplyRestore}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply Restore</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: CLOUD DATABASE SYNC */}
          {activeTab === 'cloud' && (
            <div className="space-y-6">

              {/* Status Notice */}
              {cloudNotice && (
                <div className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs font-medium border ${
                  cloudNotice.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : cloudNotice.type === 'info'
                    ? 'bg-cyan-950/40 border-cyan-800/80 text-cyan-300'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                }`}>
                  {cloudNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{cloudNotice.message}</span>
                </div>
              )}

              {/* Workspace Key Card */}
              <div className={`p-5 rounded-2xl border space-y-4 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
              }`}>
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-cyan-400" />
                      Workspace Cloud Sync Key
                    </h4>
                    {lastSyncedAt && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Last synced: {lastSyncedAt}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Use this secret key to synchronize your ledger across phones, laptops, and team members in real-time.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={workspaceKey}
                      onChange={(e) => setWorkspaceKey(e.target.value.toUpperCase())}
                      placeholder="e.g. CHASER-ALPHA-8492 or ACME-AGENCY"
                      className={`w-full font-mono font-bold text-xs uppercase px-3 py-2.5 rounded-xl border focus:outline-none focus:border-cyan-500 transition-colors ${
                        isLight 
                          ? 'bg-white border-slate-300 text-slate-900' 
                          : 'bg-slate-900 border-slate-700 text-cyan-300'
                      }`}
                    />
                  </div>

                  <button
                    onClick={handleCopyKey}
                    className={`p-2.5 border rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                    title="Copy Key"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span className="hidden sm:inline">{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => setWorkspaceKey(generateRandomWorkspaceKey())}
                    className={`p-2.5 border rounded-xl transition-all cursor-pointer text-xs font-semibold ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                    title="Generate New Unique Key"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Cloud Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handlePushCloud}
                    disabled={isSyncing}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-cyan-950/30 cursor-pointer disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CloudUpload className="w-3.5 h-3.5" />
                    )}
                    <span>Push Local to Cloud</span>
                  </button>

                  <button
                    onClick={handlePullCloud}
                    disabled={isSyncing}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CloudDownload className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>Pull from Cloud</span>
                  </button>
                </div>
              </div>

              {/* How Multi-Device Sync Works */}
              <div className={`p-5 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800/80'
              }`}>
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  How to Sync Multiple Devices
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className={`p-3 rounded-xl border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
                  }`}>
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs mb-2">
                      1
                    </div>
                    <h6 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                      On your Laptop
                    </h6>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Copy your Workspace Key above and click <strong>Push Local to Cloud</strong> to seed the database.
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
                  }`}>
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs mb-2">
                      2
                    </div>
                    <h6 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                      On your Mobile Phone
                    </h6>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Open ChaserFlow in your mobile browser, click <strong>Backup &amp; Sync</strong>, and paste the same key.
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
                  }`}>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs mb-2">
                      3
                    </div>
                    <h6 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      With your Team
                    </h6>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Share the key with co-founders or accountants to let them view and update the exact same ledger.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between text-xs ${
          isLight ? 'border-slate-100 bg-slate-50 text-slate-500' : 'border-slate-800 bg-slate-950/40 text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted local storage with cloud synchronization</span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-2 font-semibold rounded-xl border transition-colors cursor-pointer ${
              isLight 
                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700' 
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
