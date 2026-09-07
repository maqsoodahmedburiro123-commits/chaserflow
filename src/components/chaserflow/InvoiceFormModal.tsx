import React, { useState } from 'react';
import { Invoice, InvoiceStatus } from '../../types/chaserflow';
import { 
  X, 
  Plus, 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveInvoice: (invoice: Invoice) => void;
  nextInvoiceNumber: string;
}

const SAMPLE_CLIENT_TEXTS = [
  "Hey Sarah, please send an invoice for $3,850 for the brand identity package for Acme Ventures. Contact email is accounts@acmeventures.io and our payment run is on the 25th of this month.",
  "Hi team, approved the $1,900 milestone for the Mobile App UX Audit. Send the invoice to david.k@strataflow.co, Net 14 days please.",
  "Invoice request: Cloud Migration Consulting ($5,200.00) for Horizon Labs LLC. Billing contact: finance@horizonlabs.net, due in 30 days."
];

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  onSaveInvoice,
  nextInvoiceNumber
}) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Default due date + 14 days
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 14);
  const formattedDefaultDueDate = defaultDueDate.toISOString().split('T')[0];

  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(formattedDefaultDueDate);
  const [serviceDescription, setServiceDescription] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [notes, setNotes] = useState('');

  // AI Parser State
  const [showAiParser, setShowAiParser] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);

  const setDueDateOffset = (days: number) => {
    const d = new Date(issueDate || today);
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleAiExtract = async (textToExtract?: string) => {
    const content = textToExtract !== undefined ? textToExtract : pastedText;
    if (!content.trim()) return;

    setIsParsing(true);
    setParseSuccess(false);

    try {
      const res = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: content })
      });

      let ext = null;
      if (res.ok) {
        const data = await res.json();
        ext = data.extracted;
      }

      if (!ext) {
        const amountMatch = content.match(/\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|\b[0-9]+\b)/);
        const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        ext = {
          clientName: 'Client Contact',
          clientEmail: emailMatch ? emailMatch[0] : '',
          clientCompany: '',
          amount: amountMatch ? amountMatch[1].replace(/,/g, '') : '',
          serviceDescription: content.slice(0, 70).trim()
        };
      }

      if (ext) {
        if (ext.clientName) setClientName(ext.clientName);
        if (ext.clientEmail) setClientEmail(ext.clientEmail);
        if (ext.clientCompany) setClientCompany(ext.clientCompany);
        if (ext.amount) setAmount(ext.amount.toString());
        if (ext.dueDate) setDueDate(ext.dueDate);
        if (ext.serviceDescription) setServiceDescription(ext.serviceDescription);
        if (ext.notes) setNotes(ext.notes);
        setParseSuccess(true);
        setTimeout(() => setParseSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Error extracting invoice data, applying client heuristic:', err);
      const amountMatch = content.match(/\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|\b[0-9]+\b)/);
      const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (amountMatch) setAmount(amountMatch[1].replace(/,/g, ''));
      if (emailMatch) setClientEmail(emailMatch[0]);
      setServiceDescription(content.slice(0, 60));
      setParseSuccess(true);
      setTimeout(() => setParseSuccess(false), 3000);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim() || !amount) return;

    const numAmount = parseFloat(amount) || 0;
    const finalPaymentLink = paymentLink.trim() || `https://buy.stripe.com/mock_chaser_${invoiceNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    // Determine initial status relative to due date
    const nowStr = new Date().toISOString().split('T')[0];
    let initialStatus: InvoiceStatus = 'pending';
    if (dueDate < nowStr) {
      initialStatus = 'overdue';
    } else {
      const dueTimestamp = new Date(dueDate).getTime();
      const nowTimestamp = new Date(nowStr).getTime();
      const diffDays = (dueTimestamp - nowTimestamp) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) {
        initialStatus = 'due_soon';
      }
    }

    // Next scheduled reminder date
    const firstReminderDate = new Date(dueDate);
    firstReminderDate.setDate(firstReminderDate.getDate() - 3);
    const scheduledDateStr = firstReminderDate.toISOString().split('T')[0];

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim() || nextInvoiceNumber,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientCompany: clientCompany.trim() || undefined,
      amount: numAmount,
      currency: 'USD',
      issueDate,
      dueDate,
      status: initialStatus,
      serviceDescription: serviceDescription.trim() || 'Professional Consulting & Deliverables',
      paymentLink: finalPaymentLink,
      remindersPaused: false,
      remindersSentCount: 0,
      nextScheduledReminderDate: scheduledDateStr,
      notes: notes.trim() || undefined,
      reminderHistory: []
    };

    onSaveInvoice(newInvoice);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New Invoice to Monitor</h3>
              <p className="text-xs text-slate-400">ChaserFlow will automatically schedule polite payment follow-ups.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          
          {/* AI Smart Extract Toggle Panel */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-slate-900 border border-emerald-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">AI Smart Auto-Fill from Text</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAiParser(!showAiParser)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>{showAiParser ? 'Close Auto-Fill' : 'Paste Email / Chat'}</span>
                {showAiParser ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showAiParser && (
              <div className="mt-3 pt-3 border-t border-emerald-500/20 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Paste client message, agreement, or email thread:
                  </span>
                  {parseSuccess && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Form Fields Filled!
                    </span>
                  )}
                </div>

                <textarea
                  rows={3}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="e.g. 'Hey, please send the invoice for $4,500 for Q3 web development to billing@acme.com, payment due on the 15th.'"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />

                {/* Example pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Quick Try:</span>
                  {SAMPLE_CLIENT_TEXTS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPastedText(sample);
                        handleAiExtract(sample);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                    >
                      Sample #{idx + 1}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleAiExtract()}
                    disabled={isParsing || !pastedText.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isParsing ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Extracting Fields...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Auto-Fill Form with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <form id="invoice-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Invoice Number */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Amount Due ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="2500.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Client Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Client Contact Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jessica Miller"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Client Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="jessica@clientcompany.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Client Company / Organization (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Miller Creative Agency"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Issue & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Due Date
                  </label>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <button type="button" onClick={() => setDueDateOffset(7)} className="hover:text-emerald-400 cursor-pointer">+7d</button>
                    <span>&bull;</span>
                    <button type="button" onClick={() => setDueDateOffset(14)} className="hover:text-emerald-400 cursor-pointer">+14d</button>
                    <span>&bull;</span>
                    <button type="button" onClick={() => setDueDateOffset(30)} className="hover:text-emerald-400 cursor-pointer">+30d</button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Service Description / Line Item
              </label>
              <input
                type="text"
                placeholder="e.g. Website Redesign Milestone 2 & Deliverables"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Payment Link */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Payment Link (Stripe, PayPal, or Portal)
              </label>
              <input
                type="text"
                placeholder="Leave blank to auto-generate portal pay link"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Notes */}
            {notes && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Extracted Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </form>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="invoice-form"
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-950" />
            <span>Create & Activate Chaser</span>
          </button>
        </div>

      </div>
    </div>
  );
};
