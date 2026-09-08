import React, { useState, useEffect } from 'react';
import { Invoice, ChaserSettings, ReminderStage, EmailTone, ReminderLog } from '../../types/chaserflow';
import { generateEmailTemplate, DEFAULT_CHASER_SETTINGS } from '../../data/defaultInvoices';
import { generateInvoicePdf } from '../../lib/pdfGenerator';
import { validateClientEmail } from '../../lib/smartDispatcher';
import { useTheme } from '../../context/ThemeContext';
import { 
  X, 
  Send, 
  Mail, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  History,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  FileDown,
  ExternalLink,
  Edit3
} from 'lucide-react';

interface ReminderPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings?: ChaserSettings;
  onSendReminder: (invoiceId: string, log: ReminderLog) => void;
  initialCustomScript?: string;
}

export const ReminderPreviewModal: React.FC<ReminderPreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings = DEFAULT_CHASER_SETTINGS,
  onSendReminder,
  initialCustomScript
}) => {
  const { isLight } = useTheme();
  // Determine smart default stage based on invoice status safely
  const defaultStage: ReminderStage = 
    invoice?.status === 'overdue' ? 'overdue_3d' :
    invoice?.status === 'due_soon' ? 'upcoming_3d' :
    invoice?.status === 'paid' ? 'upcoming_3d' : 'due_today';

  const [stage, setStage] = useState<ReminderStage>(defaultStage);
  const [tone, setTone] = useState<EmailTone>(settings?.defaultTone || 'professional');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(initialCustomScript || '');
  const [recipientEmail, setRecipientEmail] = useState(invoice?.clientEmail || '');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // AI Tailor State
  const [showAiDrafter, setShowAiDrafter] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<'polite_collaborative' | 'firm_contractual' | 'split_payment_offer' | 'urgency_discount' | 'short_sms'>('polite_collaborative');
  const [customContext, setCustomContext] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [smsSnippet, setSmsSnippet] = useState<string | null>(null);

  // Sync recipientEmail when invoice changes
  useEffect(() => {
    if (invoice) {
      setRecipientEmail(invoice.clientEmail || '');
      setSendError(null);
    }
  }, [invoice]);

  // Regenerate subject and body when stage or tone changes (unless initial custom script provided)
  useEffect(() => {
    if (!invoice) return;
    if (!initialCustomScript) {
      const template = generateEmailTemplate(invoice, settings, stage, tone);
      setSubject(template.subject);
      setBody(template.body);
    } else {
      setSubject(`Payment update for Invoice ${invoice.invoiceNumber}`);
      setBody(initialCustomScript);
    }
  }, [stage, tone, invoice, settings, initialCustomScript]);

  const handleGenerateWithAi = async () => {
    if (!invoice) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/draft-chaser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice,
          stage,
          customContext,
          strategy: aiStrategy,
          settings
        })
      });

      let data: any = null;
      if (res.ok) {
        data = await res.json();
      }

      if (!data) {
        // Fallback email template based on strategy
        const base = generateEmailTemplate(invoice, settings, stage, tone);
        data = {
          subject: base.subject,
          body: base.body + (customContext ? `\n\nNote: ${customContext}` : ''),
          smsSnippet: `Hi ${invoice.clientName}, reminder for invoice ${invoice.invoiceNumber} ($${invoice.amount}). Pay securely: ${invoice.paymentLink}`,
          aiTip: 'Sending reminders with direct payment links increases resolution rate by 42%.'
        };
      }

      if (data.subject) setSubject(data.subject);
      if (data.body) setBody(data.body);
      if (data.smsSnippet) setSmsSnippet(data.smsSnippet);
      if (data.aiTip) setAiTip(data.aiTip);
    } catch (err) {
      console.warn('Error generating AI reminder, using standard template:', err);
      const base = generateEmailTemplate(invoice, settings, stage, tone);
      setSubject(base.subject);
      setBody(base.body);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSend = () => {
    if (!invoice) return;

    // Validate email
    const emailValidation = validateClientEmail(recipientEmail);
    if (!emailValidation.isValid) {
      setSendError(emailValidation.reason || 'Invalid recipient email address');
      return;
    }

    setSendError(null);
    setIsSending(true);
    setTimeout(() => {
      const newLog: ReminderLog = {
        id: `rem-${Date.now()}`,
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        stage,
        stageLabel: 
          stage === 'upcoming_3d' ? 'Upcoming (3 Days Prior)' :
          stage === 'due_today' ? 'Due Date Notification' :
          stage === 'overdue_3d' ? '3 Days Overdue Nudge' :
          stage === 'overdue_7d' ? '7 Days Overdue Notice' : 'Manual Follow-up',
        subject,
        recipientEmail: recipientEmail.trim(),
        bodyPreview: body.slice(0, 100) + '...',
        status: 'delivered',
        deliveryChannel: 'instant_dispatch'
      };

      onSendReminder(invoice.id, newLog);
      setIsSending(false);
      onClose();
    }, 800);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySms = () => {
    if (!smsSnippet) return;
    navigator.clipboard.writeText(smsSnippet);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2000);
  };

  // Safe to return null after all hooks have been declared
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Chaser Reminder Dispatcher</h3>
                <span className="text-xs text-slate-400 font-mono">({invoice.invoiceNumber})</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                <span>To:</span>
                <span className="text-slate-200 font-medium">{invoice.clientName}</span>
                {isEditingEmail ? (
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => {
                      setRecipientEmail(e.target.value);
                      if (sendError) setSendError(null);
                    }}
                    onBlur={() => setIsEditingEmail(false)}
                    autoFocus
                    className="bg-slate-950 border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none"
                    placeholder="client@company.com"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(true)}
                    className="inline-flex items-center gap-1 text-slate-300 font-mono hover:text-emerald-400 cursor-pointer"
                    title="Click to edit recipient email"
                  >
                    <span>&lt;{recipientEmail || 'no email set'}&gt;</span>
                    <Edit3 className="w-3 h-3 text-slate-500 hover:text-emerald-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Compose vs History) */}
        <div className="flex items-center border-b border-slate-800 px-5 bg-slate-950/50 shrink-0">
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'compose' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Compose & Tone
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Reminder History ({invoice.reminderHistory?.length || 0})
          </button>
        </div>

        {activeTab === 'compose' ? (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            
            {/* AI Generator Toggle Header */}
            <div className={`border rounded-xl p-3 transition-all ${
              isLight
                ? 'bg-purple-50/90 border-purple-200 shadow-xs'
                : 'bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-slate-800/40 border-purple-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    isLight ? 'bg-purple-100 text-purple-800' : 'bg-purple-500/20 text-purple-300'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className={`text-xs font-bold ${isLight ? 'text-purple-950' : 'text-purple-200'}`}>
                      AI Context & Strategy Drafter
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAiDrafter(!showAiDrafter)}
                  className={`text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    isLight ? 'text-purple-800 hover:text-purple-950' : 'text-purple-300 hover:text-purple-200'
                  }`}
                >
                  <span>{showAiDrafter ? 'Hide Drafter' : 'Open AI Drafter'}</span>
                  {showAiDrafter ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showAiDrafter && (
                <div className={`mt-3 pt-3 border-t space-y-3 animate-fadeIn ${
                  isLight ? 'border-purple-200' : 'border-purple-500/20'
                }`}>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      isLight ? 'text-purple-900' : 'text-purple-300'
                    }`}>
                      Choose AI Negotiation Strategy:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAiStrategy('polite_collaborative')}
                        className={`text-[11px] px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          aiStrategy === 'polite_collaborative'
                            ? isLight 
                              ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold shadow-xs' 
                              : 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold'
                            : isLight
                              ? 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                              : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        🤝 Relationship Preserver
                      </button>

                      <button
                        type="button"
                        onClick={() => setAiStrategy('firm_contractual')}
                        className={`text-[11px] px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          aiStrategy === 'firm_contractual'
                            ? isLight 
                              ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold shadow-xs' 
                              : 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold'
                            : isLight
                              ? 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                              : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        ⚖️ Contractual Boundary
                      </button>

                      <button
                        type="button"
                        onClick={() => setAiStrategy('split_payment_offer')}
                        className={`text-[11px] px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          aiStrategy === 'split_payment_offer'
                            ? isLight 
                              ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold shadow-xs' 
                              : 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold'
                            : isLight
                              ? 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                              : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        🌗 50/50 Split Offer
                      </button>

                      <button
                        type="button"
                        onClick={() => setAiStrategy('urgency_discount')}
                        className={`text-[11px] px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          aiStrategy === 'urgency_discount'
                            ? isLight 
                              ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold shadow-xs' 
                              : 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold'
                            : isLight
                              ? 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                              : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        ⚡ 3% Quick-Pay Credit
                      </button>

                      <button
                        type="button"
                        onClick={() => setAiStrategy('short_sms')}
                        className={`text-[11px] px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          aiStrategy === 'short_sms'
                            ? isLight 
                              ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold shadow-xs' 
                              : 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold'
                            : isLight
                              ? 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                              : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        📱 WhatsApp / SMS Style
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-1">
                      Custom Context or Nuance (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 'client promised payment last Tuesday', 'mention phase 2 will commence after clearance'"
                      value={customContext}
                      onChange={(e) => setCustomContext(e.target.value)}
                      className="w-full bg-slate-900/90 border border-purple-500/30 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const template = generateEmailTemplate(invoice, settings, stage, tone);
                        setSubject(template.subject);
                        setBody(template.body);
                        setAiTip(null);
                        setSmsSnippet(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Reset to Default Template
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateWithAi}
                      disabled={isGeneratingAi}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-purple-950/40 cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingAi ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>AI Drafting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Draft Tailored Reminder</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Tactical Advice Box if available */}
            {aiTip && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                isLight
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : 'bg-purple-950/30 border-purple-500/20 text-purple-200'
              }`}>
                <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-purple-700' : 'text-purple-400'}`} />
                <span>{aiTip}</span>
              </div>
            )}

            {/* Stage Selector & Tone Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sequence Stage */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Escalation Sequence Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as ReminderStage)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="upcoming_3d">Stage 1: -3 Days (Friendly Heads-Up)</option>
                  <option value="due_today">Stage 2: Due Date (Due Today Notice)</option>
                  <option value="overdue_3d">Stage 3: +3 Days Overdue (Gentle Nudge)</option>
                  <option value="overdue_7d">Stage 4: +7 Days Overdue (Firm Escalation)</option>
                </select>
              </div>

              {/* Tone Toggle */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tone of Voice
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTone('casual_polite')}
                    className={`text-[11px] font-medium py-1.5 rounded-lg transition-colors cursor-pointer ${
                      tone === 'casual_polite' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Casual
                  </button>
                  <button
                    type="button"
                    onClick={() => setTone('professional')}
                    className={`text-[11px] font-medium py-1.5 rounded-lg transition-colors cursor-pointer ${
                      tone === 'professional' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setTone('assertive_firm')}
                    className={`text-[11px] font-medium py-1.5 rounded-lg transition-colors cursor-pointer ${
                      tone === 'assertive_firm' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Firm
                  </button>
                </div>
              </div>
            </div>

            {/* Email Subject Field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Email Body Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Email Message Body
                </label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy Text'}
                </button>
              </div>
              <textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Short SMS / WhatsApp snippet if generated */}
            {smsSnippet && (
              <div className="p-3 bg-slate-800/70 border border-slate-700 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    SMS / WhatsApp Quick Nudge:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySms}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSms ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedSms ? 'Copied' : 'Copy SMS'}
                  </button>
                </div>
                <p className="text-xs text-slate-300 font-mono bg-slate-900 p-2 rounded border border-slate-800">
                  {smsSnippet}
                </p>
              </div>
            )}

            {/* Send Error Notice */}
            {sendError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span><strong>Cannot Dispatch:</strong> {sendError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(true)}
                  className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-rose-100 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  Edit Recipient Email
                </button>
              </div>
            )}

            {/* Micro details badge */}
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Direct Checkout Link:</span>
              <span className="font-mono text-emerald-400 truncate max-w-[280px]">
                {invoice.paymentLink}
              </span>
            </div>

          </div>
        ) : (
          <div className="p-5 overflow-y-auto flex-1">
            {invoice.reminderHistory && invoice.reminderHistory.length > 0 ? (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {invoice.reminderHistory.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-xl border ${
                      log.status === 'failed' 
                        ? 'bg-rose-950/30 border-rose-800/60' 
                        : 'bg-slate-800/60 border-slate-700/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        {log.status === 'failed' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>{log.stageLabel}</span>
                        {log.status === 'failed' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                            Delivery Blocked
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium mb-1">{log.subject}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-2">{log.bodyPreview}</div>
                    {log.errorMessage && (
                      <div className="text-[11px] text-rose-300 bg-rose-950/50 p-2 rounded-lg mt-2 border border-rose-900 font-mono">
                        Error Reason: {log.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No previous reminders sent for this invoice yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => invoice && generateInvoicePdf(invoice, settings)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Download Invoice PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-400" />
              <span>PDF</span>
            </button>
            {activeTab === 'compose' && (
              <>
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  title="Open draft in Gmail in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                  <span>Gmail</span>
                </a>
                <a
                  href={`mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  title="Send via default mail app"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mail App</span>
                </a>
              </>
            )}
          </div>

          {activeTab === 'compose' && (
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-slate-950" />
              <span>{isSending ? 'Dispatching...' : 'Dispatch & Record Log'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
