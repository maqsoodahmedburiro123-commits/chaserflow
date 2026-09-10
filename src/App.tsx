/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Invoice, ChaserSettings, ReminderLog, CadenceStage, RecentlyModifiedState } from './types/chaserflow';
import { INITIAL_INVOICES, DEFAULT_CHASER_SETTINGS, generateEmailTemplate } from './data/defaultInvoices';
import { ChaserHeader } from './components/chaserflow/ChaserHeader';
import { StatsBar } from './components/chaserflow/StatsBar';
import { InvoiceList } from './components/chaserflow/InvoiceList';
import { InvoiceFormModal } from './components/chaserflow/InvoiceFormModal';
import { ReminderPreviewModal } from './components/chaserflow/ReminderPreviewModal';
import { ClientPortalModal } from './components/chaserflow/ClientPortalModal';
import { SettingsModal } from './components/chaserflow/SettingsModal';
import { AiRiskRadarModal } from './components/chaserflow/AiRiskRadarModal';
import { AiExcuseAssistantModal } from './components/chaserflow/AiExcuseAssistantModal';
import { GoogleSheetsModal } from './components/chaserflow/GoogleSheetsModal';
import { ClientReliabilityModal } from './components/chaserflow/ClientReliabilityModal';
import { CadenceBuilderModal } from './components/chaserflow/CadenceBuilderModal';
import { SmartDispatcherModal } from './components/chaserflow/SmartDispatcherModal';
import { BackupSyncModal } from './components/chaserflow/BackupSyncModal';
import { CommandPaletteModal } from './components/chaserflow/CommandPaletteModal';
import { PaymentInfoModal } from './components/chaserflow/PaymentInfoModal';
import { executeAutomatedEmailCheck, diagnoseInvoiceEmails } from './lib/smartDispatcher';
import { CheckCircle2, Info, AlertCircle, RotateCcw, X } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
  action?: ToastAction;
  duration?: number;
}

const STORAGE_KEY_INVOICES = 'chaserflow_invoices_v1';
const STORAGE_KEY_SETTINGS = 'chaserflow_settings_v1';

export default function App() {
  // Load initial state from localStorage or defaults
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVOICES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading invoices from storage', e);
    }
    return INITIAL_INVOICES;
  });

  const [settings, setSettings] = useState<ChaserSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading settings from storage', e);
    }
    return DEFAULT_CHASER_SETTINGS;
  });

  // State
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [isBackupSyncOpen, setIsBackupSyncOpen] = useState(false);

  // Modal controls
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [portalInvoice, setPortalInvoice] = useState<Invoice | null>(null);
  const [isSimulatingCron, setIsSimulatingCron] = useState(false);

  // Advanced Flow Modals
  const [isRiskRadarOpen, setIsRiskRadarOpen] = useState(false);
  const [excuseAssistantInvoice, setExcuseAssistantInvoice] = useState<Invoice | null>(null);
  const [customDraftScript, setCustomDraftScript] = useState<string | undefined>(undefined);
  const [isClientReliabilityOpen, setIsClientReliabilityOpen] = useState(false);
  const [selectedClientEmailForScore, setSelectedClientEmailForScore] = useState<string | undefined>(undefined);
  const [isCadenceBuilderOpen, setIsCadenceBuilderOpen] = useState(false);
  const [isSmartDispatcherOpen, setIsSmartDispatcherOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGlobalPaymentInfoOpen, setIsGlobalPaymentInfoOpen] = useState(false);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K opens Command Palette
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Toast notification state
  const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [recentlyModified, setRecentlyModified] = useState<RecentlyModifiedState | null>(null);

  const showToast = (
    message: string, 
    type: 'success' | 'info' | 'error' = 'success',
    action?: ToastAction,
    duration?: number
  ) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    const finalDuration = duration || (action ? 8000 : 4500);
    const id = `toast-${Date.now()}`;
    setToast({ id, message, type, action, duration: finalDuration });
    
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, finalDuration);
  };

  const handleUndoRecentAction = () => {
    if (!recentlyModified || !recentlyModified.previousInvoices || recentlyModified.previousInvoices.length === 0) {
      return;
    }
    const previousSnapshot = recentlyModified.previousInvoices;
    const affectedIds = recentlyModified.invoiceIds;
    const desc = recentlyModified.description;

    setInvoices(previousSnapshot);
    setRecentlyModified({
      invoiceIds: affectedIds,
      actionType: 'restored',
      description: `Reverted: ${desc}`,
      timestamp: Date.now(),
      previousInvoices: []
    });

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    showToast(`Undone! Reverted changes for ${affectedIds.length} ${affectedIds.length === 1 ? 'invoice' : 'invoices'}.`, 'success');
  };

  // Automated Email Diagnostics Monitor
  const emailDiagnosticIssues = React.useMemo(() => {
    return diagnoseInvoiceEmails(invoices, settings);
  }, [invoices, settings]);

  const emailErrorsCount = React.useMemo(() => {
    return emailDiagnosticIssues.filter(i => i.type === 'error').length;
  }, [emailDiagnosticIssues]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));
    } catch (e) {
      console.error('Error saving invoices to storage', e);
    }
  }, [invoices]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings to storage', e);
    }
  }, [settings]);

  // Actions
  const handleSaveNewInvoice = (newInvoice: Invoice) => {
    setInvoices(prev => [newInvoice, ...prev]);
    showToast(`Invoice ${newInvoice.invoiceNumber} created! ChaserFlow is now monitoring payments.`, 'success');
  };

  const handleToggleMarkPaid = (invoiceId: string) => {
    const previousSnapshot = [...invoices];
    const target = invoices.find(i => i.id === invoiceId);
    if (!target) return;
    const willBePaid = target.status !== 'paid';

    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        if (willBePaid) {
          const paidLog: ReminderLog = {
            id: `log-paid-${Date.now()}`,
            timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            stage: 'manual',
            stageLabel: 'Payment Received',
            subject: `Payment received for ${inv.invoiceNumber}`,
            recipientEmail: inv.clientEmail,
            bodyPreview: 'Invoice settled in full. All upcoming automated reminder sequences have been halted.',
            status: 'delivered'
          };
          return {
            ...inv,
            status: 'paid' as const,
            paidDate: new Date().toISOString().split('T')[0],
            remindersPaused: true,
            reminderHistory: [paidLog, ...(inv.reminderHistory || [])]
          };
        } else {
          // Re-evaluate pending or overdue
          const nowStr = new Date().toISOString().split('T')[0];
          const isOverdue = inv.dueDate < nowStr;
          return {
            ...inv,
            status: isOverdue ? ('overdue' as const) : ('pending' as const),
            paidDate: undefined,
            remindersPaused: false
          };
        }
      }
      return inv;
    }));

    setRecentlyModified({
      invoiceIds: [invoiceId],
      actionType: willBePaid ? 'mark_paid' : 'bulk_unpaid',
      description: willBePaid ? `Marked ${target.invoiceNumber} as Paid` : `Reopened ${target.invoiceNumber}`,
      timestamp: Date.now(),
      previousInvoices: previousSnapshot
    });

    showToast(
      willBePaid 
        ? `🎉 Payment recorded for ${target.invoiceNumber}! Automated chasers stopped.`
        : `Invoice ${target.invoiceNumber} reopened for payment monitoring.`,
      'success',
      {
        label: 'Undo',
        onClick: () => {
          setInvoices(previousSnapshot);
          setRecentlyModified({
            invoiceIds: [invoiceId],
            actionType: 'restored',
            description: `Reverted ${target.invoiceNumber}`,
            timestamp: Date.now(),
            previousInvoices: []
          });
          showToast(`Undone! Reverted status for ${target.invoiceNumber}.`, 'info');
        }
      },
      7000
    );
  };

  const handleTogglePauseReminders = (invoiceId: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          remindersPaused: !inv.remindersPaused
        };
      }
      return inv;
    }));

    const target = invoices.find(i => i.id === invoiceId);
    if (target) {
      const willPause = !target.remindersPaused;
      showToast(
        willPause 
          ? `Chaser paused for ${target.invoiceNumber}. No automatic emails will be sent.` 
          : `Chaser resumed for ${target.invoiceNumber}. Polite schedule active.`,
        'info'
      );
    }
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const previousSnapshot = [...invoices];
    const target = invoices.find(i => i.id === invoiceId);
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));

    if (target) {
      setRecentlyModified({
        invoiceIds: [invoiceId],
        actionType: 'delete',
        description: `Deleted invoice ${target.invoiceNumber}`,
        timestamp: Date.now(),
        previousInvoices: previousSnapshot
      });

      showToast(
        `Invoice ${target.invoiceNumber} removed from ChaserFlow.`,
        'info',
        {
          label: 'Undo',
          onClick: () => {
            setInvoices(previousSnapshot);
            setRecentlyModified({
              invoiceIds: [invoiceId],
              actionType: 'restored',
              description: `Restored invoice ${target.invoiceNumber}`,
              timestamp: Date.now(),
              previousInvoices: []
            });
            showToast(`Restored invoice ${target.invoiceNumber}!`, 'success');
          }
        },
        8000
      );
    }
  };

  const handleBulkMarkPaid = (invoiceIds: string[], targetStatus: 'paid' | 'pending') => {
    const previousSnapshot = [...invoices];
    const nowStr = new Date().toISOString().split('T')[0];
    setInvoices(prev => prev.map(inv => {
      if (invoiceIds.includes(inv.id)) {
        if (targetStatus === 'paid') {
          return {
            ...inv,
            status: 'paid',
            paidDate: nowStr,
            remindersPaused: true
          };
        } else {
          const isOverdue = inv.dueDate < nowStr;
          return {
            ...inv,
            status: isOverdue ? 'overdue' : 'pending',
            paidDate: undefined,
            remindersPaused: false
          };
        }
      }
      return inv;
    }));

    const actionDesc = targetStatus === 'paid'
      ? `Marked ${invoiceIds.length} invoices as Paid`
      : `Reopened ${invoiceIds.length} invoices`;

    setRecentlyModified({
      invoiceIds,
      actionType: targetStatus === 'paid' ? 'bulk_paid' : 'bulk_unpaid',
      description: actionDesc,
      timestamp: Date.now(),
      previousInvoices: previousSnapshot
    });

    showToast(
      targetStatus === 'paid'
        ? `Marked ${invoiceIds.length} invoices as Paid! Automated chasers halted.`
        : `Reopened ${invoiceIds.length} invoices for active tracking.`,
      'success',
      {
        label: 'Undo',
        onClick: () => {
          setInvoices(previousSnapshot);
          setRecentlyModified({
            invoiceIds,
            actionType: 'restored',
            description: `Reverted status for ${invoiceIds.length} invoices`,
            timestamp: Date.now(),
            previousInvoices: []
          });
          showToast(`Undone! Reverted status changes for ${invoiceIds.length} invoices.`, 'info');
        }
      },
      8500
    );
  };

  const handleBulkPauseReminders = (invoiceIds: string[], pause: boolean) => {
    const previousSnapshot = [...invoices];
    setInvoices(prev => prev.map(inv => {
      if (invoiceIds.includes(inv.id)) {
        return {
          ...inv,
          remindersPaused: pause
        };
      }
      return inv;
    }));

    const actionDesc = pause
      ? `Paused chasers for ${invoiceIds.length} invoices`
      : `Resumed chasers for ${invoiceIds.length} invoices`;

    setRecentlyModified({
      invoiceIds,
      actionType: pause ? 'bulk_pause' : 'bulk_resume',
      description: actionDesc,
      timestamp: Date.now(),
      previousInvoices: previousSnapshot
    });

    showToast(
      pause
        ? `Paused automated chaser sequences for ${invoiceIds.length} invoices.`
        : `Resumed automated chaser sequences for ${invoiceIds.length} invoices.`,
      'info',
      {
        label: 'Undo',
        onClick: () => {
          setInvoices(previousSnapshot);
          setRecentlyModified({
            invoiceIds,
            actionType: 'restored',
            description: `Reverted chasers for ${invoiceIds.length} invoices`,
            timestamp: Date.now(),
            previousInvoices: []
          });
          showToast(`Undone! Reverted chaser sequence changes.`, 'info');
        }
      },
      7500
    );
  };

  const handleBulkDelete = (invoiceIds: string[]) => {
    const previousSnapshot = [...invoices];
    setInvoices(prev => prev.filter(inv => !invoiceIds.includes(inv.id)));

    setRecentlyModified({
      invoiceIds,
      actionType: 'bulk_delete',
      description: `Deleted ${invoiceIds.length} invoices`,
      timestamp: Date.now(),
      previousInvoices: previousSnapshot
    });

    showToast(
      `Permanently deleted ${invoiceIds.length} invoices and their history.`,
      'info',
      {
        label: 'Undo',
        onClick: () => {
          setInvoices(previousSnapshot);
          setRecentlyModified({
            invoiceIds,
            actionType: 'restored',
            description: `Restored ${invoiceIds.length} deleted invoices`,
            timestamp: Date.now(),
            previousInvoices: []
          });
          showToast(`Undone! Restored ${invoiceIds.length} deleted invoices.`, 'success');
        }
      },
      9000
    );
  };

  const handleSendReminder = (invoiceId: string, log: ReminderLog) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          remindersSentCount: (inv.remindersSentCount || 0) + 1,
          lastReminderDate: new Date().toISOString().split('T')[0],
          reminderHistory: [log, ...(inv.reminderHistory || [])]
        };
      }
      return inv;
    }));

    showToast(`Reminder successfully dispatched to ${log.recipientEmail}!`, 'success');
  };

  const handleSaveInvoiceNote = (invoiceId: string, notes: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          notes: notes || undefined
        };
      }
      return inv;
    }));
    const target = invoices.find(i => i.id === invoiceId);
    showToast(`Updated note for ${target?.invoiceNumber || 'invoice'}.`, 'success');
  };

  const handleBatchDispatchReminders = (invoicesToSend: { invoice: Invoice; stageName: string; log: ReminderLog }[]) => {
    if (invoicesToSend.length === 0) return;
    const previousSnapshot = [...invoices];
    const nowStr = new Date().toISOString().split('T')[0];
    const affectedIds = invoicesToSend.map(item => item.invoice.id);

    setInvoices(prev => prev.map(inv => {
      const match = invoicesToSend.find(item => item.invoice.id === inv.id);
      if (match) {
        return {
          ...inv,
          remindersSentCount: (inv.remindersSentCount || 0) + 1,
          lastReminderDate: nowStr,
          reminderHistory: [match.log, ...(inv.reminderHistory || [])]
        };
      }
      return inv;
    }));

    setRecentlyModified({
      invoiceIds: affectedIds,
      actionType: 'bulk_resume',
      description: `Batch dispatched ${invoicesToSend.length} polite chasers`,
      timestamp: Date.now(),
      previousInvoices: previousSnapshot
    });

    showToast(
      `Dispatched ${invoicesToSend.length} polite reminder ${invoicesToSend.length === 1 ? 'email' : 'emails'}!`,
      'success',
      {
        label: 'Undo',
        onClick: () => {
          setInvoices(previousSnapshot);
          setRecentlyModified({
            invoiceIds: affectedIds,
            actionType: 'restored',
            description: `Reverted batch dispatch for ${affectedIds.length} invoices`,
            timestamp: Date.now(),
            previousInvoices: []
          });
          showToast(`Undone! Reverted batch dispatch reminder history.`, 'info');
        }
      },
      8500
    );
  };

  // Import invoices from Google Sheets
  const handleImportInvoices = (imported: Invoice[]) => {
    // Avoid duplicate invoice IDs
    const existingIds = new Set(invoices.map(i => i.id));
    const newItems = imported.filter(i => !existingIds.has(i.id));
    const merged = [...newItems, ...invoices];
    setInvoices(merged);

    showToast(`Added ${newItems.length} invoices imported from spreadsheet!`, 'success');
  };

  // Simulate automated daily cron job
  const handleSimulateCronRun = () => {
    setIsSimulatingCron(true);
    setTimeout(() => {
      const result = executeAutomatedEmailCheck(invoices, settings);

      setInvoices(result.updatedInvoices);
      setIsSimulatingCron(false);

      if (result.errorCount > 0) {
        showToast(result.summaryMessage, 'error');
      } else if (result.dispatchedCount > 0) {
        showToast(result.summaryMessage, 'success');
      } else {
        showToast(result.summaryMessage, 'info');
      }
    }, 1000);
  };

  const handleResetDemoData = () => {
    setInvoices(INITIAL_INVOICES);
    setSettings(DEFAULT_CHASER_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_INVOICES);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    showToast('Reset to original demo invoices and settings.', 'info');
  };

  // Triggered when user selects a generated counter script from Excuse Assistant
  const handleApplyExcuseScript = (script: string) => {
    if (excuseAssistantInvoice) {
      setCustomDraftScript(script);
      setPreviewInvoice(excuseAssistantInvoice);
      setExcuseAssistantInvoice(null);
      showToast('Loaded AI counter-script into Chaser reminder drafter!', 'success');
    }
  };

  // Next sequential invoice number calculation
  const nextInvoiceNumber = `INV-2026-0${90 + invoices.length + 1}`;
  const { isLight } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${
      isLight 
        ? 'bg-slate-50 text-slate-900 selection:bg-emerald-200 selection:text-emerald-900' 
        : 'bg-[#0b0f17] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200'
    }`}>
      
      {/* Toast Notification with Undo Action */}
      {toast && (
        <div 
          id="app-toast-notification"
          className="fixed bottom-5 right-5 z-50 animate-slideUp"
        >
          <div className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border transition-all ${
            toast.type === 'error'
              ? 'bg-slate-900 border-rose-500 text-white shadow-rose-950/40'
              : toast.type === 'success'
              ? isLight ? 'bg-slate-900 border-emerald-500/60 text-white shadow-slate-900/30' : 'bg-slate-900 border-emerald-500/50 text-white'
              : isLight ? 'bg-slate-900 border-cyan-500/60 text-white shadow-slate-900/30' : 'bg-slate-900 border-cyan-500/50 text-white'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-cyan-400 shrink-0" />
            )}
            
            <span className="text-xs font-medium text-slate-200 max-w-xs sm:max-w-sm">
              {toast.message}
            </span>

            {/* Undo Action Button */}
            {toast.action && (
              <button
                type="button"
                id="toast-undo-action-btn"
                onClick={() => {
                  toast.action?.onClick();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/30 cursor-pointer hover:scale-105 active:scale-95 shrink-0 ml-1"
                title="Undo recent action"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{toast.action.label}</span>
              </button>
            )}

            {/* Dismiss Toast Button */}
            <button
              type="button"
              onClick={() => {
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                setToast(null);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer ml-1"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main App Navigation Header */}
      <ChaserHeader
        onOpenNewInvoice={() => setIsNewInvoiceOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRiskRadar={() => setIsRiskRadarOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
        onOpenBackupSync={() => setIsBackupSyncOpen(true)}
        onOpenClientReliability={() => {
          setSelectedClientEmailForScore(undefined);
          setIsClientReliabilityOpen(true);
        }}
        onOpenCadenceBuilder={() => setIsCadenceBuilderOpen(true)}
        onOpenSmartDispatcher={() => setIsSmartDispatcherOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        emailErrorsCount={emailErrorsCount}
        onSimulateCronRun={handleSimulateCronRun}
        isSimulating={isSimulatingCron}
        activeInvoicesCount={invoices.filter(i => i.status !== 'paid').length}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Metric Cards */}
        <StatsBar 
          invoices={invoices} 
          onOpenRiskRadar={() => setIsRiskRadarOpen(true)}
          onOpenClientReliability={() => {
            setSelectedClientEmailForScore(undefined);
            setIsClientReliabilityOpen(true);
          }}
          onOpenSmartDispatcher={() => setIsSmartDispatcherOpen(true)}
          onOpenCadenceBuilder={() => setIsCadenceBuilderOpen(true)}
        />

        {/* Invoice Management Grid */}
        <InvoiceList
          invoices={invoices}
          settings={settings}
          recentlyModifiedState={recentlyModified}
          onUndoRecentlyModified={handleUndoRecentAction}
          onClearRecentlyModified={() => setRecentlyModified(null)}
          onOpenPreview={(inv) => {
            setCustomDraftScript(undefined);
            setPreviewInvoice(inv);
          }}
          onOpenClientPortal={(inv) => setPortalInvoice(inv)}
          onOpenExcuseAssistant={(inv) => setExcuseAssistantInvoice(inv)}
          onOpenRiskRadar={() => setIsRiskRadarOpen(true)}
          onOpenClientReliability={(clientEmail) => {
            setSelectedClientEmailForScore(clientEmail);
            setIsClientReliabilityOpen(true);
          }}
          onToggleMarkPaid={handleToggleMarkPaid}
          onTogglePauseReminders={handleTogglePauseReminders}
          onDeleteInvoice={handleDeleteInvoice}
          onBulkMarkPaid={handleBulkMarkPaid}
          onBulkPauseReminders={handleBulkPauseReminders}
          onBulkDelete={handleBulkDelete}
          onSaveInvoiceNote={handleSaveInvoiceNote}
          onBatchDispatchReminders={handleBatchDispatchReminders}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ChaserFlow &bull; Automated Polite Payment Chaser for Freelancers & Agencies</span>
        </div>
      </footer>

      {/* Modals */}
      <InvoiceFormModal
        isOpen={isNewInvoiceOpen}
        onClose={() => setIsNewInvoiceOpen(false)}
        onSaveInvoice={handleSaveNewInvoice}
        nextInvoiceNumber={nextInvoiceNumber}
      />

      <ReminderPreviewModal
        isOpen={!!previewInvoice}
        onClose={() => {
          setPreviewInvoice(null);
          setCustomDraftScript(undefined);
        }}
        invoice={previewInvoice}
        settings={settings}
        onSendReminder={handleSendReminder}
        initialCustomScript={customDraftScript}
      />

      <ClientPortalModal
        isOpen={!!portalInvoice}
        onClose={() => setPortalInvoice(null)}
        invoice={portalInvoice}
        settings={settings}
        onMarkPaid={handleToggleMarkPaid}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          showToast('ChaserFlow settings and email templates updated!', 'success');
        }}
        onResetDemoData={handleResetDemoData}
        onOpenCadenceBuilder={() => setIsCadenceBuilderOpen(true)}
        onOpenSmartDispatcher={() => setIsSmartDispatcherOpen(true)}
        onOpenBackupSync={() => setIsBackupSyncOpen(true)}
      />

      {/* AI Modals */}
      <AiRiskRadarModal
        isOpen={isRiskRadarOpen}
        onClose={() => setIsRiskRadarOpen(false)}
        invoices={invoices}
        onOpenReminder={(invoice) => {
          setCustomDraftScript(undefined);
          setPreviewInvoice(invoice);
        }}
        onOpenExcuseAssistant={(invoice) => {
          setExcuseAssistantInvoice(invoice);
        }}
        onChaseInvoice={(invoice) => {
          setCustomDraftScript(undefined);
          setPreviewInvoice(invoice);
        }}
      />

      <AiExcuseAssistantModal
        isOpen={!!excuseAssistantInvoice}
        onClose={() => setExcuseAssistantInvoice(null)}
        invoice={excuseAssistantInvoice}
        settings={settings}
        onApplyScript={handleApplyExcuseScript}
        onApplyScriptToReminder={(inv, script) => {
          setCustomDraftScript(script);
          setPreviewInvoice(inv);
          setExcuseAssistantInvoice(null);
          showToast('Loaded AI counter-script into Chaser reminder drafter!', 'success');
        }}
      />

      {/* Spreadsheet / CSV Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => setIsGoogleSheetsOpen(false)}
        invoices={invoices}
        onImportInvoices={handleImportInvoices}
      />

      {/* Client Reliability & Scoring Modal */}
      <ClientReliabilityModal
        isOpen={isClientReliabilityOpen}
        onClose={() => {
          setIsClientReliabilityOpen(false);
          setSelectedClientEmailForScore(undefined);
        }}
        invoices={invoices}
        initialClientEmail={selectedClientEmailForScore}
        onChaseInvoice={(invoice) => {
          setCustomDraftScript(undefined);
          setPreviewInvoice(invoice);
          setIsClientReliabilityOpen(false);
        }}
      />

      {/* Escalation Cadence Builder Modal */}
      <CadenceBuilderModal
        isOpen={isCadenceBuilderOpen}
        onClose={() => setIsCadenceBuilderOpen(false)}
        settings={settings}
        onSaveCadence={(stages) => {
          const updated = { ...settings, cadenceStages: stages };
          setSettings(updated);
          showToast('Updated automated escalation cadence stages!', 'success');
        }}
      />

      {/* Smart Timing & Working Hours Dispatcher Modal */}
      <SmartDispatcherModal
        isOpen={isSmartDispatcherOpen}
        onClose={() => setIsSmartDispatcherOpen(false)}
        invoices={invoices}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          const updated = { ...settings, ...newSettings };
          setSettings(updated);
          showToast('Smart working hours & guard rules updated!', 'success');
        }}
        onTriggerDispatchNow={(invoice) => {
          setCustomDraftScript(undefined);
          setPreviewInvoice(invoice);
          setIsSmartDispatcherOpen(false);
        }}
        onAutomatedCheckComplete={(result) => {
          setInvoices(result.updatedInvoices);
          if (result.errorCount > 0) {
            showToast(result.summaryMessage, 'error');
          } else if (result.dispatchedCount > 0) {
            showToast(result.summaryMessage, 'success');
          } else {
            showToast(result.summaryMessage, 'info');
          }
        }}
      />

      {/* 1-Click Backup, Restore & Multi-Device Cloud Database Sync Modal */}
      <BackupSyncModal
        isOpen={isBackupSyncOpen}
        onClose={() => setIsBackupSyncOpen(false)}
        invoices={invoices}
        settings={settings}
        onUpdateInvoices={(updatedInvoices) => {
          setInvoices(updatedInvoices);
          showToast(`Synchronized ledger (${updatedInvoices.length} invoices)!`, 'success');
        }}
        onUpdateSettings={(updatedSettings) => {
          setSettings(updatedSettings);
          showToast('Updated workspace configuration & email templates!', 'success');
        }}
      />

      {/* Global Quick Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        invoices={invoices}
        settings={settings}
        onOpenNewInvoice={() => setIsNewInvoiceOpen(true)}
        onOpenRiskRadar={() => setIsRiskRadarOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
        onOpenBackupSync={() => setIsBackupSyncOpen(true)}
        onOpenClientReliability={() => {
          setSelectedClientEmailForScore(undefined);
          setIsClientReliabilityOpen(true);
        }}
        onOpenCadenceBuilder={() => setIsCadenceBuilderOpen(true)}
        onSimulateCronRun={handleSimulateCronRun}
        onOpenInvoicePreview={(inv) => {
          setCustomDraftScript(undefined);
          setPreviewInvoice(inv);
        }}
        onOpenClientPortal={(inv) => setPortalInvoice(inv)}
        onOpenPaymentInfo={() => setIsGlobalPaymentInfoOpen(true)}
      />

      {/* Global Verified Remittance & Payment Details Modal */}
      <PaymentInfoModal
        isOpen={isGlobalPaymentInfoOpen}
        invoices={invoices}
        onClose={() => setIsGlobalPaymentInfoOpen(false)}
        settings={settings}
      />

    </div>
  );
}
