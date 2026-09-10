import React, { useState, useEffect } from 'react';
import { Invoice } from '../../types/chaserflow';
import { useTheme } from '../../context/ThemeContext';
import { 
  X, 
  FileText, 
  Check, 
  Clock, 
  Trash2, 
  Plus, 
  MessageSquareQuote,
  Building2,
  Calendar
} from 'lucide-react';

interface InvoiceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSaveNote: (invoiceId: string, notes: string) => void;
}

const COMMON_QUICK_TAGS = [
  'Promised payment by Friday',
  'Check is in the mail',
  'Spoke with Accounts Payable dept',
  'Pending internal PO approval',
  'Client requested revised PO number',
  'Confirmed receipt; batch wire scheduled'
];

export const InvoiceNoteModal: React.FC<InvoiceNoteModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSaveNote
}) => {
  const { isLight } = useTheme();
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    if (invoice) {
      setNoteContent(invoice.notes || '');
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNote(invoice.id, noteContent.trim());
    onClose();
  };

  const handleAppendTag = (tag: string) => {
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const tagWithDate = `[${timestamp}] ${tag}`;
    setNoteContent(prev => prev ? `${prev}\n• ${tagWithDate}` : `• ${tagWithDate}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="invoice-note-modal"
        className={`w-full max-w-lg rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50' : 'bg-slate-900 border-slate-800 text-white shadow-black/80'
        }`}
      >
        
        {/* Header */}
        <div className={`p-5 sm:px-6 border-b flex items-center justify-between gap-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold truncate">
                Client Follow-up Notes
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {invoice.clientName} &bull; {invoice.invoiceNumber} (${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:px-6 space-y-4">

          {/* Quick preset tags */}
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-2">
              Quick Follow-up Presets (Click to add)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_QUICK_TAGS.map((tag, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAppendTag(tag)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl font-medium border flex items-center gap-1 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    isLight 
                      ? 'bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-900' 
                      : 'bg-slate-800/80 hover:bg-amber-950/40 border-slate-700 hover:border-amber-700 text-slate-300 hover:text-amber-300'
                  }`}
                >
                  <Plus className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold">
                Private Internal Notes
              </label>
              <span className="text-[10px] text-slate-400">
                Visible only to your team, never shared with client
              </span>
            </div>
            
            <textarea
              id="invoice-note-textarea"
              rows={5}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="e.g. Spoke with Sarah in finance on Sep 9. Wire will be released this Thursday once VP returns from travel..."
              className={`w-full px-3.5 py-3 rounded-2xl border text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-sans resize-none ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white' 
                  : 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-800'
              }`}
            />
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
            {noteContent ? (
              <button
                type="button"
                onClick={() => setNoteContent('')}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear note</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">Press Save when done</span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-invoice-note-btn"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/40 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save Note</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
