import React, { useState, useEffect } from 'react';
import { ChaserSettings, EmailTone } from '../../types/chaserflow';
import { 
  X, 
  Settings, 
  Save, 
  Sparkles, 
  Check, 
  CreditCard, 
  ShieldCheck, 
  RotateCcw,
  BellRing,
  GitMerge,
  Clock,
  Sun,
  Moon,
  Database
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChaserSettings;
  onSaveSettings: (settings: ChaserSettings) => void;
  onResetDemoData: () => void;
  onOpenCadenceBuilder?: () => void;
  onOpenSmartDispatcher?: () => void;
  onOpenBackupSync?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetDemoData,
  onOpenCadenceBuilder,
  onOpenSmartDispatcher,
  onOpenBackupSync
}) => {
  const { theme, setTheme, isLight } = useTheme();
  const [formData, setFormData] = useState<ChaserSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...settings });
    }
  }, [isOpen, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ChaserFlow Configuration</h3>
              <p className="text-xs text-slate-400">Manage sender profiles, tone of voice, and escalation schedules.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Your Full Name / Sign-off
              </label>
              <input
                type="text"
                required
                value={formData.userName}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Business / Studio Name
              </label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Sender / Reply-To Email
            </label>
            <input
              type="email"
              required
              value={formData.userEmail}
              onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Tone Preference */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Default Escalation Tone
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'casual_polite', label: 'Casual & Friendly', desc: 'Relaxed, warm, relationship-preserving' },
                { key: 'professional', label: 'Standard Business', desc: 'Balanced, formal, direct courtesy' },
                { key: 'assertive_firm', label: 'Assertive & Firm', desc: 'Zero fluff, focused on prompt settlement' },
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFormData({ ...formData, defaultTone: item.key as EmailTone })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.defaultTone === item.key
                      ? 'bg-emerald-950/60 border-emerald-500 text-white'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold text-white mb-0.5">{item.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Late fee escalation toggle */}
          <div className="p-3 bg-slate-800/50 border border-slate-700/70 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Include Overdue Fee Warning in Stage 4</div>
              <div className="text-[11px] text-slate-400">Mentions {formData.lateFeePercentage}% late penalty if unaddressed after 7 days</div>
            </div>
            <input
              type="checkbox"
              checked={formData.enableLateFeeNotice}
              onChange={(e) => setFormData({ ...formData, enableLateFeeNotice: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          {/* Advanced Cadence & Smart Timing Hub */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCadenceBuilder?.();
              }}
              className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-1">
                <GitMerge className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white">Cadence Builder</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Customize trigger days, add stages, adjust tone escalations per step.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSmartDispatcher?.();
              }}
              className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white">Smart Working Hours</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Enforce send windows (e.g. 9am-5pm), pause weekends, see upcoming queue.
              </p>
            </button>
          </div>

          {/* Theme & Display Mode */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Display Theme</span>
              <span className="text-[10px] font-normal text-slate-500">Accessibility & office lighting</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="settings-theme-dark-btn"
                onClick={() => setTheme('dark')}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                  !isLight 
                    ? 'bg-slate-800 border-emerald-500/80 text-white shadow-xs' 
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${!isLight ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Dark Theme</div>
                  <div className="text-[10px] text-slate-400">Default dark palette</div>
                </div>
              </button>

              <button
                type="button"
                id="settings-theme-light-btn"
                onClick={() => setTheme('light')}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                  isLight 
                    ? 'bg-white border-emerald-500 text-slate-900 shadow-xs' 
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isLight ? 'bg-amber-100 text-amber-600' : 'bg-slate-700/50 text-slate-400'}`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">High-Contrast Light</div>
                  <div className="text-[10px] text-slate-500">For sunny & well-lit rooms</div>
                </div>
              </button>
            </div>
          </div>

          {/* Backup, Restore & Cloud Database Sync */}
          {onOpenBackupSync && (
            <div className={`p-3.5 border rounded-xl flex items-center justify-between gap-3 ${
              isLight ? 'bg-indigo-50/70 border-indigo-200' : 'bg-indigo-950/40 border-indigo-800/60'
            }`}>
              <div>
                <div className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-indigo-900' : 'text-indigo-200'}`}>
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  Backup, Restore &amp; Cloud Database Sync
                </div>
                <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  1-click JSON ledger snapshots and multi-device cloud synchronization
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackupSync();
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shrink-0 shadow-xs"
              >
                Open Hub
              </button>
            </div>
          )}

          {/* Automated Schedule Blueprint summary */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-emerald-400" />
              Automated Chaser Cadence (Active)
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1">
              <li>&bull; <strong className="text-slate-300">-3 Days:</strong> Advance courtesy reminder with 1-click link</li>
              <li>&bull; <strong className="text-slate-300">Day 0 (Due Date):</strong> Polite notice of due settlement</li>
              <li>&bull; <strong className="text-slate-300">+3 Days Overdue:</strong> Gentle check-in to confirm receipt</li>
              <li>&bull; <strong className="text-slate-300">+7 Days Overdue:</strong> Formal escalation notice</li>
              <li>&bull; <strong className="text-emerald-400">Upon Payment:</strong> Automatically stops future reminders</li>
            </ul>
          </div>

          {/* Actions & Reset */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset to demo sample invoices?')) {
                  onResetDemoData();
                  onClose();
                }
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Demo Invoices
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
              >
                {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savedSuccess ? 'Saved!' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
