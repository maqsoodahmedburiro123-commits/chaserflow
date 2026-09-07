import React, { useState, useEffect } from 'react';
import { Invoice, ChaserSettings } from '../../types/chaserflow';
import { DEFAULT_CHASER_SETTINGS } from '../../data/defaultInvoices';
import { 
  X, 
  Sparkles, 
  MessageSquareQuote, 
  Copy, 
  Check, 
  Send, 
  Lightbulb, 
  RefreshCw,
  FileText
} from 'lucide-react';

interface ExcuseOption {
  title: string;
  tag: string;
  script: string;
  rationale: string;
}

interface AiExcuseAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings?: ChaserSettings;
  onApplyScript?: (scriptText: string) => void;
  onApplyScriptToReminder?: (invoice: Invoice, scriptText: string) => void;
}

const COMMON_EXCUSES = [
  'Our accounts payable only runs payments on the 30th / 1st of the month',
  'Our finance director / CEO is currently traveling or on annual leave',
  'We are waiting on our own clients or investors to pay us first',
  'We need a 20% discount or we want late fees waived before paying',
  'We did not receive the original invoice or need a new PO number added',
  'Can we pay in 3 monthly installments instead of all at once?'
];

export const AiExcuseAssistantModal: React.FC<AiExcuseAssistantModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings = DEFAULT_CHASER_SETTINGS,
  onApplyScript,
  onApplyScriptToReminder
}) => {
  // Unconditional hook calls at top level
  const [excuseText, setExcuseText] = useState(COMMON_EXCUSES[0]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ExcuseOption[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const getFallbackOptions = (excuse: string, inv: Invoice | null): ExcuseOption[] => {
    const sender = settings?.userName || 'The Team';
    return [
      {
        title: 'Diplomatic Firm Boundary',
        tag: 'Firm & Professional',
        script: `Hi ${inv?.clientName || 'there'},\n\nThank you for the update. I appreciate you letting me know regarding "${excuse.slice(0, 40)}...".\n\nBecause our contract terms specify net payment dates, could we confirm that funds will be transferred no later than this Friday? This ensures ongoing support remains uninterrupted.\n\nLink to settle: ${inv?.paymentLink || 'https://checkout.stripe.com'}\n\nBest,\n${sender}`,
        rationale: 'Acknowledges their situation while enforcing your agreed terms and pinning down an exact date.'
      },
      {
        title: 'Split Payment Settlement',
        tag: 'Win-Win Compromise',
        script: `Hi ${inv?.clientName || 'there'},\n\nUnderstood. If processing the full $${inv?.amount || 'total'} is difficult right now due to this, let's do this: process 50% ($${((inv?.amount || 1000) / 2).toFixed(2)}) today to keep the account in good standing, and the balance in 14 days.\n\nHere is the link: ${inv?.paymentLink || 'https://checkout.stripe.com'}\n\nThanks,\n${sender}`,
        rationale: 'Eliminates all-or-nothing friction by securing partial cash immediately.'
      },
      {
        title: 'Executive / Accounting Escalation',
        tag: 'Process Focused',
        script: `Hi ${inv?.clientName || 'there'},\n\nThanks for keeping me in the loop. Could you please connect me directly with your accounts payable lead or finance manager so I can provide any additional vendor documentation or tax forms they require to release payment this week?\n\nInvoice link: ${inv?.paymentLink || 'https://checkout.stripe.com'}\n\nBest regards,\n${sender}`,
        rationale: 'Bypasses the busy client contact to work directly with the person who holds the checkbook.'
      }
    ];
  };

  const handleGenerateResponses = async (customExcuse?: string) => {
    const textToUse = customExcuse !== undefined ? customExcuse : excuseText;
    if (!textToUse.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/ai/counter-excuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientExcuse: textToUse,
          invoice,
          senderName: settings?.userName || 'Freelancer / Studio'
        })
      });

      let parsedOptions: ExcuseOption[] = [];
      if (res.ok) {
        const data = await res.json();
        parsedOptions = data.options || [];
      }

      if (parsedOptions.length === 0) {
        parsedOptions = getFallbackOptions(textToUse, invoice);
      }

      setOptions(parsedOptions);
    } catch (err) {
      console.warn('Error fetching counter excuse, using local fallback:', err);
      setOptions(getFallbackOptions(textToUse, invoice));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && invoice) {
      handleGenerateResponses(COMMON_EXCUSES[0]);
    }
  }, [isOpen, invoice?.id]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApply = (scriptText: string) => {
    if (onApplyScript) {
      onApplyScript(scriptText);
    } else if (onApplyScriptToReminder && invoice) {
      onApplyScriptToReminder(invoice, scriptText);
    }
    onClose();
  };

  // Safe to return null after all hooks are evaluated
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-950/40">
              <MessageSquareQuote className="w-5 h-5 fill-slate-950 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Client Delay & Objection Assistant</h3>
              </div>
              <p className="text-xs text-slate-400">
                Responding to delays for <span className="text-slate-200 font-medium">{invoice.clientName}</span> ({invoice.invoiceNumber} &bull; ${invoice.amount?.toLocaleString()})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Preset Excuse Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select or Customize Client&apos;s Delay Excuse:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_EXCUSES.slice(0, 4).map((exc, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setExcuseText(exc);
                    handleGenerateResponses(exc);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer truncate max-w-xs ${
                    excuseText === exc
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {exc}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={excuseText}
                onChange={(e) => setExcuseText(e.target.value)}
                placeholder="What did the client say to delay payment?"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleGenerateResponses()}
                disabled={loading || !excuseText.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Generate</span>
              </button>
            </div>
          </div>

          {/* Generated Strategies */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Calibrated Strategic Counter-Scripts:
            </h4>

            {loading ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-300">Generating psychological counter-negotiations...</p>
              </div>
            ) : options.length > 0 ? (
              options.map((opt, idx) => (
                <div 
                  key={idx}
                  className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-2.5 transition-all hover:border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{opt.title}</span>
                      <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2 py-0.2 rounded-full">
                        {opt.tag}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(opt.script, idx)}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy message to clipboard"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[10px]">{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={() => handleApply(opt.script)}
                        className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Load into Chaser reminder drafter"
                      >
                        <Send className="w-3 h-3" />
                        <span className="text-[10px]">Use This</span>
                      </button>
                    </div>
                  </div>

                  {/* Script preview */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                    {opt.script}
                  </div>

                  {/* Rationale explanation */}
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-300">Why it works:</strong> {opt.rationale}</span>
                  </div>
                </div>
              ))
            ) : null}
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Never negotiate against yourself &bull; Turn passive delays into confirmed cash dates
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
