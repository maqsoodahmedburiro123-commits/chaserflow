/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Invoice, ChaserSettings, ReminderLog, CadenceStage } from './types/chaserflow';
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
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken,
  loadInvoicesFromFirestore, 
  saveInvoiceToFirestore, 
  deleteInvoiceFromFirestore, 
  batchSaveInvoicesToFirestore,
  loadSettingsFromFirestore,
  saveSettingsToFirestore
} from './lib/firebase';
import { CheckCircle2, Info } from 'lucide-react';

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

  // Firebase Auth & Token State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cachedToken, setCachedToken] = useState<string | null>(null);
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);

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

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        if (token) setCachedToken(token);

        // Sync with Firestore on user login
        try {
          const cloudInvoices = await loadInvoicesFromFirestore(user.uid);
          if (cloudInvoices.length > 0) {
            setInvoices(cloudInvoices);
            showToast(`Loaded ${cloudInvoices.length} invoices from Firestore.`, 'info');
          } else {
            // First time sign-in: seed user's current invoices to their Firestore
            await batchSaveInvoicesToFirestore(user.uid, invoices);
          }

          const cloudSettings = await loadSettingsFromFirestore(user.uid);
          if (cloudSettings) {
            setSettings(cloudSettings);
          } else {
            await saveSettingsToFirestore(user.uid, settings);
          }
        } catch (err) {
          console.warn('Firestore initial sync error:', err);
        }
      },
      () => {
        setCurrentUser(null);
        setCachedToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    if (isSigningInGoogle) return;
    setIsSigningInGoogle(true);
    try {
      const res = await googleSignIn();
      if (!res) {
        // User closed the popup or cancelled sign-in
        return;
      }
      setCurrentUser(res.user);
      setCachedToken(res.accessToken);
      showToast(`Signed in as ${res.user.displayName || res.user.email}!`, 'success');
    } catch (err: any) {
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request'
      ) {
        showToast(err?.message || 'Google sign-in could not be completed.', 'info');
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setCachedToken(null);
    showToast('Signed out of Google account.', 'info');
  };

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
    if (currentUser) {
      saveInvoiceToFirestore(currentUser.uid, newInvoice);
    }
    showToast(`Invoice ${newInvoice.invoiceNumber} created! ChaserFlow is now monitoring payments.`, 'success');
  };

  const handleToggleMarkPaid = (invoiceId: string) => {
    let updatedInvoice: Invoice | null = null;
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const willBePaid = inv.status !== 'paid';
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
          const next = {
            ...inv,
            status: 'paid' as const,
            remindersPaused: true,
            reminderHistory: [paidLog, ...(inv.reminderHistory || [])]
          };
          updatedInvoice = next;
          return next;
        } else {
          // Re-evaluate pending or overdue
          const nowStr = new Date().toISOString().split('T')[0];
          const isOverdue = inv.dueDate < nowStr;
          const next = {
            ...inv,
            status: isOverdue ? ('overdue' as const) : ('pending' as const),
            remindersPaused: false
          };
          updatedInvoice = next;
          return next;
        }
      }
      return inv;
    }));

    if (currentUser && updatedInvoice) {
      saveInvoiceToFirestore(currentUser.uid, updatedInvoice);
    }

    const target = invoices.find(i => i.id === invoiceId);
    if (target) {
      showToast(
        target.status === 'paid' 
          ? `Invoice ${target.invoiceNumber} reopened for payment monitoring.` 
          : `🎉 Payment recorded for ${target.invoiceNumber}! Automated chasers stopped.`,
        'success'
      );
    }
  };

  const handleTogglePauseReminders = (invoiceId: string) => {
    let updatedInvoice: Invoice | null = null;
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const nextPaused = !inv.remindersPaused;
        const next = {
          ...inv,
          remindersPaused: nextPaused
        };
        updatedInvoice = next;
        return next;
      }
      return inv;
    }));

    if (currentUser && updatedInvoice) {
      saveInvoiceToFirestore(currentUser.uid, updatedInvoice);
    }

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
    const target = invoices.find(i => i.id === invoiceId);
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    if (currentUser) {
      deleteInvoiceFromFirestore(currentUser.uid, invoiceId);
    }
    if (target) {
      showToast(`Invoice ${target.invoiceNumber} removed from ChaserFlow.`, 'info');
    }
  };

  const handleSendReminder = (invoiceId: string, log: ReminderLog) => {
    let updatedInvoice: Invoice | null = null;
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const next = {
          ...inv,
          remindersSentCount: (inv.remindersSentCount || 0) + 1,
          lastReminderDate: new Date().toISOString().split('T')[0],
          reminderHistory: [log, ...(inv.reminderHistory || [])]
        };
        updatedInvoice = next;
        return next;
      }
      return inv;
    }));

    if (currentUser && updatedInvoice) {
      saveInvoiceToFirestore(currentUser.uid, updatedInvoice);
    }

    showToast(`Reminder successfully dispatched to ${log.recipientEmail}!`, 'success');
  };

  // Import invoices from Google Sheets
  const handleImportInvoices = (imported: Invoice[]) => {
    // Avoid duplicate invoice IDs
    const existingIds = new Set(invoices.map(i => i.id));
    const newItems = imported.filter(i => !existingIds.has(i.id));
    const merged = [...newItems, ...invoices];
    setInvoices(merged);

    if (currentUser && newItems.length > 0) {
      batchSaveInvoicesToFirestore(currentUser.uid, newItems);
    }

    showToast(`Added ${newItems.length} invoices imported from Google Sheets!`, 'success');
  };

  // Simulate automated daily cron job
  const handleSimulateCronRun = () => {
    setIsSimulatingCron(true);
    setTimeout(() => {
      // Find overdue or due soon invoices that are not paused and not paid
      const candidates = invoices.filter(i => i.status !== 'paid' && !i.remindersPaused);

      if (candidates.length === 0) {
        setIsSimulatingCron(false);
        showToast('Cron check complete: No active invoices require follow-up today.', 'info');
        return;
      }

      // Trigger automatic reminder for the most urgent invoice
      const targetInvoice = candidates.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
      const stage = targetInvoice.status === 'overdue' ? 'overdue_3d' : 'upcoming_3d';
      const template = generateEmailTemplate(targetInvoice, settings, stage, settings.defaultTone);

      const cronLog: ReminderLog = {
        id: `cron-${Date.now()}`,
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stage,
        stageLabel: `Automated Daily Cron (${stage === 'overdue_3d' ? 'Overdue' : 'Upcoming'})`,
        subject: template.subject,
        recipientEmail: targetInvoice.clientEmail,
        bodyPreview: template.body.slice(0, 100) + '...',
        status: 'delivered'
      };

      let updatedTarget: Invoice | null = null;
      setInvoices(prev => prev.map(inv => {
        if (inv.id === targetInvoice.id) {
          const next = {
            ...inv,
            remindersSentCount: (inv.remindersSentCount || 0) + 1,
            lastReminderDate: new Date().toISOString().split('T')[0],
            reminderHistory: [cronLog, ...(inv.reminderHistory || [])]
          };
          updatedTarget = next;
          return next;
        }
        return inv;
      }));

      if (currentUser && updatedTarget) {
        saveInvoiceToFirestore(currentUser.uid, updatedTarget);
      }

      setIsSimulatingCron(false);
      showToast(
        `Automated daily scan triggered reminder for ${targetInvoice.invoiceNumber} (${targetInvoice.clientName})!`,
        'success'
      );
    }, 1200);
  };

  const handleResetDemoData = () => {
    setInvoices(INITIAL_INVOICES);
    setSettings(DEFAULT_CHASER_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_INVOICES);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    if (currentUser) {
      batchSaveInvoicesToFirestore(currentUser.uid, INITIAL_INVOICES);
      saveSettingsToFirestore(currentUser.uid, DEFAULT_CHASER_SETTINGS);
    }
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

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-slideUp">
          <div className="bg-slate-900 border border-emerald-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-cyan-400 shrink-0" />
            )}
            <span className="text-xs font-medium text-slate-200 max-w-sm">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main App Navigation Header */}
      <ChaserHeader
        onOpenNewInvoice={() => setIsNewInvoiceOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRiskRadar={() => setIsRiskRadarOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
        onOpenClientReliability={() => {
          setSelectedClientEmailForScore(undefined);
          setIsClientReliabilityOpen(true);
        }}
        onOpenCadenceBuilder={() => setIsCadenceBuilderOpen(true)}
        onOpenSmartDispatcher={() => setIsSmartDispatcherOpen(true)}
        onSimulateCronRun={handleSimulateCronRun}
        isSimulating={isSimulatingCron}
        activeInvoicesCount={invoices.filter(i => i.status !== 'paid').length}
        currentUser={currentUser}
        onSignIn={handleGoogleSignIn}
        isSigningIn={isSigningInGoogle}
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
          if (currentUser) {
            saveSettingsToFirestore(currentUser.uid, newSettings);
          }
          showToast('ChaserFlow settings and email templates updated!', 'success');
        }}
        onResetDemoData={handleResetDemoData}
        onOpenCadenceBuilder={() => setIsCadenceBuilderOpen(true)}
        onOpenSmartDispatcher={() => setIsSmartDispatcherOpen(true)}
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

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => setIsGoogleSheetsOpen(false)}
        invoices={invoices}
        currentUser={currentUser}
        cachedAccessToken={cachedToken}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
        onImportInvoices={handleImportInvoices}
        isSigningIn={isSigningInGoogle}
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
          if (currentUser) {
            saveSettingsToFirestore(currentUser.uid, updated);
          }
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
          setSettings(newSettings);
          if (currentUser) {
            saveSettingsToFirestore(currentUser.uid, newSettings);
          }
          showToast('Smart working hours & guard rules updated!', 'success');
        }}
        onTriggerDispatchNow={(invoice) => {
          setCustomDraftScript(undefined);
          setPreviewInvoice(invoice);
          setIsSmartDispatcherOpen(false);
        }}
      />

    </div>
  );
}
