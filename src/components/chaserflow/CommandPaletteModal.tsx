import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Invoice, ChaserSettings } from '../../types/chaserflow';
import { useTheme } from '../../context/ThemeContext';
import { 
  Search, 
  Plus, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  FileSpreadsheet, 
  Database, 
  Send, 
  Moon, 
  Sun, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Landmark,
  ArrowRight,
  CornerDownLeft,
  Command
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  settings: ChaserSettings;
  onOpenNewInvoice: () => void;
  onOpenRiskRadar: () => void;
  onOpenGoogleSheets: () => void;
  onOpenBackupSync: () => void;
  onOpenClientReliability: () => void;
  onOpenCadenceBuilder: () => void;
  onSimulateCronRun: () => void;
  onOpenInvoicePreview: (invoice: Invoice) => void;
  onOpenClientPortal: (invoice: Invoice) => void;
  onOpenPaymentInfo: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  invoices,
  settings,
  onOpenNewInvoice,
  onOpenRiskRadar,
  onOpenGoogleSheets,
  onOpenBackupSync,
  onOpenClientReliability,
  onOpenCadenceBuilder,
  onSimulateCronRun,
  onOpenInvoicePreview,
  onOpenClientPortal,
  onOpenPaymentInfo
}) => {
  const { isLight, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Command actions list
  const quickActions = useMemo(() => [
    {
      id: 'action-new-invoice',
      title: 'Create New Invoice',
      subtitle: 'Add a new client invoice with automated chasing',
      category: 'Actions',
      icon: Plus,
      color: 'text-emerald-400',
      shortcut: 'N',
      run: () => { onClose(); onOpenNewInvoice(); }
    },
    {
      id: 'action-risk-radar',
      title: 'AI Cashflow Risk Radar',
      subtitle: 'Analyze overdue risk, late fee projections, and cashflow health',
      category: 'Intelligence',
      icon: Sparkles,
      color: 'text-indigo-400',
      shortcut: 'R',
      run: () => { onClose(); onOpenRiskRadar(); }
    },
    {
      id: 'action-simulate-cron',
      title: 'Run Chaser Dispatcher (Cron)',
      subtitle: 'Check rules, weekend shields, and dispatch polite chasers',
      category: 'Automation',
      icon: Send,
      color: 'text-cyan-400',
      shortcut: 'D',
      run: () => { onClose(); onSimulateCronRun(); }
    },
    {
      id: 'action-client-reliability',
      title: 'Client Reliability Scorecard',
      subtitle: 'View payment behavior tiers (A+ to F) for each client',
      category: 'Intelligence',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      shortcut: 'C',
      run: () => { onClose(); onOpenClientReliability(); }
    },
    {
      id: 'action-cadence',
      title: 'Escalation Cadence Builder',
      subtitle: 'Configure automated reminder stages, tones, and timing',
      category: 'Automation',
      icon: Clock,
      color: 'text-amber-400',
      run: () => { onClose(); onOpenCadenceBuilder(); }
    },
    {
      id: 'action-sheets',
      title: 'Accounting & CSV Export Hub',
      subtitle: 'Export to QuickBooks, Xero, FreshBooks, or copy CSV',
      category: 'Integrations',
      icon: FileSpreadsheet,
      color: 'text-emerald-400',
      run: () => { onClose(); onOpenGoogleSheets(); }
    },
    {
      id: 'action-payment-info',
      title: 'View Payment & Remittance Information',
      subtitle: 'Verified bank wire, ACH, Zelle, Wise, and check instructions',
      category: 'Remittance',
      icon: Landmark,
      color: 'text-cyan-400',
      run: () => { onClose(); onOpenPaymentInfo(); }
    },
    {
      id: 'action-backup',
      title: 'Backup & Cloud Sync',
      subtitle: 'Export encrypted JSON snapshot or restore previous database',
      category: 'Data',
      icon: Database,
      color: 'text-purple-400',
      run: () => { onClose(); onOpenBackupSync(); }
    },
    {
      id: 'action-theme',
      title: `Switch to ${isLight ? 'Dark' : 'Light'} Mode`,
      subtitle: `Toggle visual theme to ${isLight ? 'Dark Twilight' : 'Clean Light'}`,
      category: 'Preferences',
      icon: isLight ? Moon : Sun,
      color: 'text-amber-400',
      shortcut: 'T',
      run: () => { toggleTheme(); onClose(); }
    }
  ], [isLight, onClose, onOpenNewInvoice, onOpenRiskRadar, onSimulateCronRun, onOpenClientReliability, onOpenCadenceBuilder, onOpenGoogleSheets, onOpenPaymentInfo, onOpenBackupSync, toggleTheme]);

  // Invoice matches
  const matchedInvoices = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return invoices.filter(inv => 
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.clientName.toLowerCase().includes(q) ||
      (inv.clientCompany && inv.clientCompany.toLowerCase().includes(q)) ||
      inv.clientEmail.toLowerCase().includes(q) ||
      inv.serviceDescription.toLowerCase().includes(q) ||
      String(inv.amount).includes(q)
    ).slice(0, 5);
  }, [invoices, query]);

  // Filtered quick actions
  const matchedActions = useMemo(() => {
    if (!query.trim()) return quickActions;
    const q = query.toLowerCase();
    return quickActions.filter(a => 
      a.title.toLowerCase().includes(q) ||
      a.subtitle.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  }, [quickActions, query]);

  // Combined flat list for keyboard navigation
  const combinedItems = useMemo(() => {
    const items: Array<{
      type: 'action' | 'invoice';
      id: string;
      data: any;
      run: () => void;
    }> = [];

    matchedInvoices.forEach(inv => {
      items.push({
        type: 'invoice',
        id: `inv-${inv.id}`,
        data: inv,
        run: () => {
          onClose();
          onOpenInvoicePreview(inv);
        }
      });
    });

    matchedActions.forEach(action => {
      items.push({
        type: 'action',
        id: action.id,
        data: action,
        run: action.run
      });
    });

    return items;
  }, [matchedInvoices, matchedActions, onClose, onOpenInvoicePreview]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, combinedItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + combinedItems.length) % Math.max(1, combinedItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedItems[selectedIndex]) {
        combinedItems[selectedIndex].run();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        id="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-150 ${
          isLight 
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-400/50' 
            : 'bg-slate-900 border-slate-700/80 text-white shadow-black/90'
        }`}
      >
        
        {/* Search Input */}
        <div className={`p-4 sm:p-5 border-b flex items-center gap-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search client, invoice #, amount..."
            className={`w-full bg-transparent text-sm sm:text-base font-medium focus:outline-none placeholder:text-slate-400 font-sans ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-slate-800"
            >
              Clear
            </button>
          )}
          <kbd className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border hidden sm:inline-block ${
            isLight ? 'bg-slate-200/80 border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-3 space-y-3">

          {/* Invoice Matches Section */}
          {matchedInvoices.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                Matching Invoices
              </div>
              <div className="space-y-1">
                {matchedInvoices.map((inv) => {
                  const globalIdx = combinedItems.findIndex(i => i.id === `inv-${inv.id}`);
                  const isCurrent = selectedIndex === globalIdx;

                  return (
                    <div
                      key={inv.id}
                      onClick={() => {
                        onClose();
                        onOpenInvoicePreview(inv);
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isCurrent
                          ? isLight ? 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-300' : 'bg-emerald-950/40 text-emerald-100 ring-1 ring-emerald-600'
                          : isLight ? 'hover:bg-slate-50 text-slate-800' : 'hover:bg-slate-800/60 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                          inv.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : inv.status === 'overdue'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {inv.status === 'paid' ? '✓' : '$'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs truncate">{inv.clientName}</span>
                            <span className="font-mono text-[11px] text-slate-400">({inv.invoiceNumber})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {inv.serviceDescription} &bull; Due {inv.dueDate}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {isCurrent && <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions Section */}
          {matchedActions.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                Commands &amp; Tools
              </div>
              <div className="space-y-1">
                {matchedActions.map((action) => {
                  const globalIdx = combinedItems.findIndex(i => i.id === action.id);
                  const isCurrent = selectedIndex === globalIdx;
                  const Icon = action.icon;

                  return (
                    <div
                      key={action.id}
                      onClick={action.run}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isCurrent
                          ? isLight ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-300' : 'bg-slate-800 text-white ring-1 ring-slate-600'
                          : isLight ? 'hover:bg-slate-50 text-slate-700' : 'hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isLight ? 'bg-slate-200/70 text-slate-800' : 'bg-slate-800/80 text-slate-300'
                        }`}>
                          <Icon className={`w-4 h-4 ${action.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            {action.title}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {action.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {action.shortcut && (
                          <kbd className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isLight ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}>
                            {action.shortcut}
                          </kbd>
                        )}
                        {isCurrent && <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {combinedItems.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching commands or invoices found for "{query}".
            </div>
          )}

        </div>

        {/* Footer shortcuts helper */}
        <div className={`p-3 px-4 border-t flex items-center justify-between text-[11px] text-slate-400 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">↵</kbd> Select
            </span>
          </div>
          <span className="text-[10px]">
            ChaserFlow Command Center
          </span>
        </div>

      </div>
    </div>
  );
};
