import React from 'react';
import { 
  Zap, 
  Plus, 
  Settings, 
  Clock, 
  Sparkles, 
  Send, 
  FileSpreadsheet, 
  Database,
  AlertCircle, 
  Sun, 
  Moon,
  Search,
  Command
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ChaserHeaderProps {
  onOpenNewInvoice: () => void;
  onOpenSettings: () => void;
  onOpenRiskRadar: () => void;
  onOpenGoogleSheets: () => void;
  onOpenBackupSync?: () => void;
  onOpenClientReliability?: () => void;
  onOpenCadenceBuilder?: () => void;
  onOpenSmartDispatcher?: () => void;
  onOpenCommandPalette?: () => void;
  emailErrorsCount?: number;
  onSimulateCronRun: () => void;
  isSimulating: boolean;
  activeInvoicesCount: number;
}

export const ChaserHeader: React.FC<ChaserHeaderProps> = ({
  onOpenNewInvoice,
  onOpenSettings,
  onOpenRiskRadar,
  onOpenGoogleSheets,
  onOpenBackupSync,
  onOpenClientReliability,
  onOpenCadenceBuilder,
  onOpenSmartDispatcher,
  onOpenCommandPalette,
  emailErrorsCount,
  onSimulateCronRun,
  isSimulating,
  activeInvoicesCount
}) => {
  const { isLight, toggleTheme } = useTheme();

  return (
    <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          
          {/* Logo & Product Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30 shrink-0">
              <Zap className="w-5 h-5 fill-slate-950 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  ChaserFlow
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/90 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-Chaser Active
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden xs:block">
                Automated Polite Invoice Chasing for Freelancers & Agencies
              </p>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">

            {/* Quick Command Palette Trigger (Cmd+K) */}
            {onOpenCommandPalette && (
              <button
                id="command-palette-trigger-btn"
                onClick={onOpenCommandPalette}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer border shadow-xs ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                    : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
                title="Search commands, clients & invoices (⌘K / Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Search</span>
                <kbd className={`text-[10px] font-mono px-1.5 py-0.2 rounded border hidden md:inline-block ${
                  isLight ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}>
                  ⌘K
                </kbd>
              </button>
            )}
            
            {/* Spreadsheet & Accounting Hub */}
            <button
              id="google-sheets-btn"
              onClick={onOpenGoogleSheets}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer border shadow-xs ${
                isLight
                  ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/80 text-slate-200'
              }`}
              title="Accounting CSV Export & Spreadsheet Hub"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Accounting &amp; CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>

            {/* Backup & Cloud Sync Hub */}
            {onOpenBackupSync && (
              <button
                id="backup-cloud-sync-btn"
                onClick={onOpenBackupSync}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer border shadow-xs ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                    : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/80 text-slate-200'
                }`}
                title="1-Click Backup, Restore & Multi-Device Cloud Database Sync"
              >
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Backup &amp; Sync</span>
                <span className="md:hidden">Sync</span>
              </button>
            )}

            {/* AI Risk Radar Trigger */}
            <button
              id="ai-risk-radar-btn"
              onClick={onOpenRiskRadar}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs ${
                isLight
                  ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-900'
                  : 'bg-indigo-950/40 hover:bg-indigo-900/60 border-indigo-800/60 text-indigo-300'
              }`}
              title="Open AI Cashflow Risk Radar"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Risk Radar</span>
            </button>

            {/* Email Errors alert if any exist */}
            {emailErrorsCount && emailErrorsCount > 0 ? (
              <button
                id="smart-dispatcher-btn"
                onClick={onOpenSmartDispatcher}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-rose-950/80 hover:bg-rose-900/80 border border-rose-600 text-rose-200 text-xs font-semibold rounded-xl transition-all cursor-pointer ring-1 ring-rose-500/50 animate-pulse"
                title={`${emailErrorsCount} email issue(s) detected. Click to resolve.`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-[11px] font-bold">{emailErrorsCount} Issue{emailErrorsCount > 1 ? 's' : ''}</span>
              </button>
            ) : null}

            {/* Run Auto-Chaser Check Simulation */}
            <button
              id="simulate-cron-btn"
              onClick={onSimulateCronRun}
              disabled={isSimulating}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                isLight
                  ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="Test daily cron schedule trigger"
            >
              {isSimulating ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Run Schedule</span>
                  <span className="sm:hidden">Scan</span>
                </>
              )}
            </button>

            {/* Theme Toggle Button (Dark / High-Contrast Light Mode) */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className={`p-2 border rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                isLight
                  ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title={isLight ? "Switch to Dark Mode" : "Switch to High-Contrast Light Theme"}
              aria-label={isLight ? "Switch to Dark Mode" : "Switch to High-Contrast Light Theme"}
            >
              {isLight ? (
                <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/20" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              )}
            </button>

            {/* Settings Button */}
            <button
              id="open-settings-btn"
              onClick={onOpenSettings}
              className={`p-2 border rounded-xl transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Email Templates & Chaser Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Create Invoice Primary Button */}
            <button
              id="new-invoice-btn"
              onClick={onOpenNewInvoice}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm shadow-emerald-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>New Invoice</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
