import React from 'react';
import { User } from 'firebase/auth';
import { 
  Zap, 
  Plus, 
  Settings, 
  Clock, 
  Sparkles,
  Send,
  FileSpreadsheet,
  ShieldCheck,
  GitMerge,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ChaserHeaderProps {
  onOpenNewInvoice: () => void;
  onOpenSettings: () => void;
  onOpenRiskRadar: () => void;
  onOpenGoogleSheets: () => void;
  onOpenClientReliability?: () => void;
  onOpenCadenceBuilder?: () => void;
  onOpenSmartDispatcher?: () => void;
  emailErrorsCount?: number;
  onSimulateCronRun: () => void;
  isSimulating: boolean;
  activeInvoicesCount: number;
  currentUser: User | null;
  onSignIn: () => void;
  isSigningIn?: boolean;
}

export const ChaserHeader: React.FC<ChaserHeaderProps> = ({
  onOpenNewInvoice,
  onOpenSettings,
  onOpenRiskRadar,
  onOpenGoogleSheets,
  onOpenClientReliability,
  onOpenCadenceBuilder,
  onOpenSmartDispatcher,
  emailErrorsCount,
  onSimulateCronRun,
  isSimulating,
  activeInvoicesCount,
  currentUser,
  onSignIn,
  isSigningIn
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
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            
            {/* Google Sheets Modal Trigger */}
            <button
              id="google-sheets-btn"
              onClick={onOpenGoogleSheets}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/80 text-emerald-300 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
              title="Google Sheets 2-Way Sync"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Google Sheets</span>
              <span className="sm:hidden">Sheets</span>
            </button>

            {/* Client Reliability Scoring Modal Trigger */}
            {onOpenClientReliability && (
              <button
                id="client-reliability-btn"
                onClick={onOpenClientReliability}
                className={`inline-flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm ${
                  isLight
                    ? 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-900 font-bold'
                    : 'bg-purple-950/60 hover:bg-purple-900/60 border-purple-700/80 text-purple-300'
                }`}
                title="Client Reliability & Scoring Profile"
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${isLight ? 'text-purple-700' : 'text-purple-400'}`} />
                <span className="hidden md:inline">Client Scores</span>
                <span className="md:hidden">Scores</span>
              </button>
            )}

            {/* Smart Timing & Working Hours Trigger */}
            {onOpenSmartDispatcher && (
              <button
                id="smart-dispatcher-btn"
                onClick={onOpenSmartDispatcher}
                className={`inline-flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm relative ${
                  emailErrorsCount && emailErrorsCount > 0
                    ? 'bg-rose-950/70 hover:bg-rose-900/70 border-rose-600 text-rose-200 ring-1 ring-rose-500/50'
                    : isLight
                    ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-900 font-bold'
                    : 'bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-700/80 text-cyan-300'
                }`}
                title="Smart Dispatcher & Email Health Diagnostics"
              >
                {emailErrorsCount && emailErrorsCount > 0 ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : (
                  <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
                )}
                <span className="hidden md:inline">
                  {emailErrorsCount && emailErrorsCount > 0 ? 'Email Errors' : 'Email Health'}
                </span>
                <span className="md:hidden">
                  {emailErrorsCount && emailErrorsCount > 0 ? 'Errors' : 'Health'}
                </span>
                {emailErrorsCount && emailErrorsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center -ml-0.5">
                    {emailErrorsCount}
                  </span>
                )}
              </button>
            )}

            {/* AI Risk Radar Trigger */}
            <button
              id="ai-risk-radar-btn"
              onClick={onOpenRiskRadar}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm ${
                isLight
                  ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-300 text-indigo-900 font-bold'
                  : 'bg-gradient-to-r from-purple-950/80 to-indigo-950/80 hover:from-purple-900 hover:to-indigo-900 border-purple-700/80 text-purple-200'
              }`}
              title="Open AI Cashflow Risk Radar"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-700' : 'text-purple-400'}`} />
              <span className="hidden sm:inline">AI Cash Radar</span>
              <span className="sm:hidden">Radar</span>
            </button>

            {/* Run Auto-Chaser Check Simulation */}
            <button
              id="simulate-cron-btn"
              onClick={onSimulateCronRun}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
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

            {/* Google Account Profile or Sign In */}
            {currentUser ? (
              <button
                onClick={onOpenGoogleSheets}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                title={`Signed in as ${currentUser.email}`}
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="User"
                    className="w-5 h-5 rounded-full border border-emerald-500/40 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                    {currentUser.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="hidden xl:inline text-[11px] font-medium text-slate-300 truncate max-w-[90px]">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Connected" />
              </button>
            ) : (
              <button
                id="header-google-signin-btn"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
                title="Sign in with Google"
              >
                {isSigningIn ? (
                  <Clock className="w-3.5 h-3.5 text-slate-700 animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                )}
                <span className="hidden sm:inline">{isSigningIn ? 'Signing In...' : 'Sign In'}</span>
              </button>
            )}

            {/* Theme Toggle Button (Dark / High-Contrast Light Mode) */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              title={isLight ? "Switch to Dark Mode" : "Switch to High-Contrast Light Theme (for well-lit offices)"}
              aria-label={isLight ? "Switch to Dark Mode" : "Switch to High-Contrast Light Theme"}
            >
              {isLight ? (
                <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/20" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              )}
              <span className="hidden xl:inline text-[11px] font-semibold text-slate-300">
                {isLight ? 'Dark' : 'Light'}
              </span>
            </button>

            {/* Settings Button */}
            <button
              id="open-settings-btn"
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Email Templates & Chaser Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Create Invoice Primary Button */}
            <button
              id="new-invoice-btn"
              onClick={onOpenNewInvoice}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
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
