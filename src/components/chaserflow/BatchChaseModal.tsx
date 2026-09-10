import React, { useState, useMemo } from 'react';
import { Invoice, ChaserSettings, EmailTone, ReminderLog } from '../../types/chaserflow';
import { calculateNextDispatchSlot } from '../../lib/smartDispatcher';
import { generateEmailTemplate } from '../../data/defaultInvoices';
import { useTheme } from '../../context/ThemeContext';
import { 
  X, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Mail, 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Building2 
} from 'lucide-react';

interface BatchChaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  settings: ChaserSettings;
  onConfirmBatchSend: (invoicesToSend: { invoice: Invoice; stageName: string; log: ReminderLog }[]) => void;
}

export const BatchChaseModal: React.FC<BatchChaseModalProps> = ({
  isOpen,
  onClose,
  invoices,
  settings,
  onConfirmBatchSend
}) => {
  const { isLight } = useTheme();
  const [toneOverride, setToneOverride] = useState<'default' | EmailTone>('default');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Filter only unpaid invoices (skips already paid)
  const eligibleInvoices = useMemo(() => {
    return invoices.filter(inv => inv.status !== 'paid');
  }, [invoices]);

  const skippedPaidCount = invoices.length - eligibleInvoices.length;
  const totalAmount = useMemo(() => {
    return eligibleInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  }, [eligibleInvoices]);

  // Pre-calculate the dispatch item for each invoice
  const preparedItems = useMemo(() => {
    const now = new Date();
    const formattedTimestamp = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return eligibleInvoices.map(invoice => {
      const slot = calculateNextDispatchSlot(invoice, settings);
      const effectiveTone = toneOverride === 'default' ? slot.cadenceStage.tone : toneOverride;
      
      const template = generateEmailTemplate(
        invoice, 
        effectiveTone, 
        slot.cadenceStage.stage, 
        settings
      );

      const log: ReminderLog = {
        id: `log-batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: formattedTimestamp,
        stage: slot.cadenceStage.stage,
        stageLabel: `Batch: ${slot.cadenceStage.name}`,
        subject: template.subject,
        recipientEmail: invoice.clientEmail,
        bodyPreview: template.body.substring(0, 160) + '...',
        status: 'delivered',
        deliveryChannel: 'instant_dispatch'
      };

      return {
        invoice,
        stageName: slot.cadenceStage.name,
        cadenceStage: slot.cadenceStage,
        template,
        log
      };
    });
  }, [eligibleInvoices, settings, toneOverride]);

  if (!isOpen) return null;

  const handleExecuteSend = () => {
    if (preparedItems.length === 0) return;
    setIsSending(true);
    setTimeout(() => {
      onConfirmBatchSend(preparedItems.map(item => ({
        invoice: item.invoice,
        stageName: item.stageName,
        log: item.log
      })));
      setIsSending(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="batch-chase-modal"
        className={`w-full max-w-3xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isLight 
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50' 
            : 'bg-slate-900 border-slate-800 text-white shadow-black/80'
        }`}
      >
        
        {/* Header */}
        <div className={`p-5 sm:px-6 border-b flex items-center justify-between gap-4 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  Batch Polite Chaser Dispatch
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {eligibleInvoices.length} {eligibleInvoices.length === 1 ? 'Invoice' : 'Invoices'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Review and dispatch tailored polite reminder emails based on each invoice's due date
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:px-6 overflow-y-auto space-y-5 flex-1">

          {/* Quick Metrics Bar */}
          <div className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'
          }`}>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Eligible Invoices</div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                {eligibleInvoices.length} Recipients
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Value to Recover</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tone Schedule</div>
              <div className="text-xs font-semibold mt-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                  {toneOverride === 'default' ? 'Automatic Cadence' : toneOverride.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Skipped Notice */}
          {skippedPaidCount > 0 && (
            <div className={`px-4 py-2.5 rounded-xl border text-xs flex items-center gap-2 ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                <strong>{skippedPaidCount} paid {skippedPaidCount === 1 ? 'invoice' : 'invoices'}</strong> automatically excluded to avoid embarrassing reminders.
              </span>
            </div>
          )}

          {/* Tone Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <label className="text-xs font-bold block">
                Batch Tone Preset
              </label>
              <span className="text-[11px] text-slate-400">
                Choose whether to use each stage's preset tone or enforce a uniform tone
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'default', label: 'Cadence Stage Default' },
                { id: 'casual_polite', label: 'Friendly & Casual' },
                { id: 'professional', label: 'Professional Standard' },
                { id: 'assertive_firm', label: 'Assertive & Firm' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setToneOverride(opt.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    toneOverride === opt.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-950/30'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipients Table / Card List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
              <span>Recipients &amp; Auto-assigned Cadence</span>
              <span>Click to inspect preview</span>
            </div>

            {preparedItems.map((item) => {
              const isExpanded = expandedInvoiceId === item.invoice.id;
              const isOverdue = item.invoice.status === 'overdue';

              return (
                <div 
                  key={item.invoice.id}
                  className={`border rounded-2xl transition-all overflow-hidden ${
                    isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-800/50 border-slate-700/80'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedInvoiceId(isExpanded ? null : item.invoice.id)}
                    className="p-3.5 sm:px-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                        isOverdue 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {isOverdue ? '!' : '✓'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs truncate">
                            {item.invoice.clientName}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            ({item.invoice.invoiceNumber})
                          </span>
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-semibold border ${
                            isOverdue 
                              ? isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-950/60 text-rose-300 border-rose-800'
                              : isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950/60 text-amber-300 border-amber-800'
                          }`}>
                            {item.stageName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {item.invoice.clientEmail} &bull; Due {item.invoice.dueDate} &bull; 
                          <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                            {' '}${item.invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                        {isExpanded ? 'Hide' : 'Preview'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Email Body Preview */}
                  {isExpanded && (
                    <div className={`p-4 border-t space-y-2 text-xs font-sans ${
                      isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/90 border-slate-700 text-slate-300'
                    }`}>
                      <div>
                        <span className="font-bold text-slate-400 text-[10px] uppercase">Subject: </span>
                        <span className="font-semibold text-xs">{item.template.subject}</span>
                      </div>
                      <div className={`p-3 rounded-xl border text-[11px] whitespace-pre-wrap leading-relaxed font-sans ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                      }`}>
                        {item.template.body}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer Actions */}
        <div className={`p-4 sm:px-6 border-t flex items-center justify-between gap-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Cancel
          </button>

          <button
            type="button"
            id="confirm-batch-send-btn"
            disabled={isSending || preparedItems.length === 0}
            onClick={handleExecuteSend}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-2 transition-all shadow-md shadow-cyan-950/40 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>
              {isSending 
                ? 'Dispatching Reminders...' 
                : `Send ${preparedItems.length} Polite ${preparedItems.length === 1 ? 'Reminder' : 'Reminders'}`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
