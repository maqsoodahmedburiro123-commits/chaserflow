import React, { useState } from 'react';
import { Invoice, ChaserSettings } from '../../types/chaserflow';
import { DEFAULT_CHASER_SETTINGS } from '../../data/defaultInvoices';
import { generateInvoicePdf, generateReceiptPdf } from '../../lib/pdfGenerator';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Download, 
  Building, 
  Calendar, 
  DollarSign, 
  Zap,
  ArrowRight,
  Receipt,
  FileDown
} from 'lucide-react';

interface ClientPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings?: ChaserSettings;
  onMarkPaid: (invoiceId: string) => void;
}

export const ClientPortalModal: React.FC<ClientPortalModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings = DEFAULT_CHASER_SETTINGS,
  onMarkPaid
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  const isPaid = invoice?.status === 'paid' || justPaid;

  const handlePayNow = () => {
    if (!invoice) return;
    setIsProcessing(true);
    setTimeout(() => {
      onMarkPaid(invoice.id);
      setIsProcessing(false);
      setJustPaid(true);
    }, 1000);
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto">
        
        {/* Top notification bar preview banner */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <strong className="text-slate-300">Client Portal Preview</strong> (This is what your client sees when opening their invoice link)
          </span>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invoice Container */}
        <div className="p-6 sm:p-8 bg-slate-900 text-slate-100">
          
          {/* Header & Status */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">{settings?.businessName || 'Freelancer / Studio'}</h2>
              </div>
              <p className="text-xs text-slate-400">Invoiced by {settings?.userName || 'Alex Morgan'} &bull; {settings?.userEmail || 'billing@example.com'}</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-mono text-slate-400 block mb-1">INVOICE NUMBER</span>
              <span className="text-base font-black text-white font-mono">{invoice.invoiceNumber}</span>
              <div className="mt-1.5">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/80">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PAID IN FULL
                  </span>
                ) : invoice.status === 'overdue' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800">
                    OVERDUE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    DUE {invoice.dueDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bill To Info */}
          <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-800 text-xs">
            <div>
              <span className="font-semibold text-slate-400 block mb-1">BILLED TO</span>
              <div className="font-bold text-white text-sm">{invoice.clientName}</div>
              {invoice.clientCompany && <div className="text-slate-300">{invoice.clientCompany}</div>}
              <div className="text-slate-400">{invoice.clientEmail}</div>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-400 block mb-1">PAYMENT DETAILS</span>
              <div className="text-slate-300">Issue Date: <strong className="text-white">{invoice.issueDate}</strong></div>
              <div className="text-slate-300">Due Date: <strong className="text-white">{invoice.dueDate}</strong></div>
            </div>
          </div>

          {/* Line Item Table */}
          <div className="py-5 border-b border-slate-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="pb-2 font-semibold">Description of Service</th>
                  <th className="pb-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3 text-slate-200 font-medium leading-relaxed">
                    {invoice.serviceDescription}
                  </td>
                  <td className="py-3 text-white font-bold font-mono text-right text-sm">
                    ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Due Banner */}
          <div className="flex items-center justify-between py-4 bg-slate-800/40 rounded-xl px-4 my-5 border border-slate-700/60">
            <div>
              <span className="text-xs text-slate-400 block">Total Balance Due</span>
              <span className="text-2xl font-black text-white font-mono">
                ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>
            {isPaid && (
              <div className="text-right">
                <span className="text-xs text-emerald-400 font-bold block flex items-center gap-1 justify-end">
                  <Receipt className="w-4 h-4" /> Paid on {invoice.paidDate || new Date().toISOString().split('T')[0]}
                </span>
                <span className="text-[10px] text-slate-400">Transaction ID: ch_mock_{invoice.id}</span>
              </div>
            )}
          </div>

          {/* Payment Action Area */}
          <div className="flex items-center justify-between gap-3 pt-2 pb-1">
            <button
              type="button"
              onClick={() => generateInvoicePdf(invoice, settings)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-400" />
              <span>Download PDF Invoice</span>
            </button>

            {isPaid && (
              <button
                type="button"
                onClick={() => generateReceiptPdf(invoice, settings)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-800 transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Official Receipt</span>
              </button>
            )}
          </div>

          {!isPaid ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handlePayNow}
                disabled={isProcessing}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Processing Secure Checkout...</span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} via Apple Pay / Card</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                256-bit encrypted checkout &bull; Instant auto-receipt sent to {invoice.clientEmail}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
              <h4 className="text-sm font-bold text-white">Thank You for Your Payment!</h4>
              <p className="text-xs text-emerald-300 mt-0.5">
                This invoice is marked paid in full. ChaserFlow has halted all automated follow-up sequences.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
