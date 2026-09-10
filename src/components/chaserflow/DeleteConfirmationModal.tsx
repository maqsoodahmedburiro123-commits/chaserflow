import React, { useEffect } from 'react';
import { Invoice } from '../../types/chaserflow';
import { useTheme } from '../../context/ThemeContext';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Calendar, 
  User, 
  DollarSign, 
  Clock, 
  ShieldAlert,
  FileText
} from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  invoice?: Invoice | null;
  invoicesToDelete?: Invoice[];
  onClose: () => void;
  onConfirmDelete: (invoiceId: string) => void;
  onConfirmBulkDelete?: (invoiceIds: string[]) => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  invoice,
  invoicesToDelete,
  onClose,
  onConfirmDelete,
  onConfirmBulkDelete
}) => {
  const { isLight } = useTheme();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isBulk = invoicesToDelete && invoicesToDelete.length > 0;
  if (!isOpen || (!invoice && !isBulk)) return null;

  const handleConfirm = () => {
    if (isBulk && onConfirmBulkDelete) {
      onConfirmBulkDelete(invoicesToDelete.map(i => i.id));
    } else if (invoice) {
      onConfirmDelete(invoice.id);
    }
    onClose();
  };

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Paid Settlement',
          className: isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
        };
      case 'overdue':
        return {
          label: 'Overdue Payment',
          className: isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-950/80 text-rose-300 border-rose-800'
        };
      case 'due_soon':
        return {
          label: 'Due Soon',
          className: isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-800'
        };
      default:
        return {
          label: 'Pending',
          className: isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
        };
    }
  };

  const bulkTotalAmount = isBulk ? invoicesToDelete.reduce((sum, i) => sum + i.amount, 0) : 0;
  const bulkRemindersCount = isBulk ? invoicesToDelete.reduce((sum, i) => sum + (i.remindersSentCount || 0), 0) : 0;
  const statusInfo = invoice ? getStatusBadge(invoice.status) : null;
  const remindersCount = invoice ? (invoice.remindersSentCount || 0) : bulkRemindersCount;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border transition-all ${
          isLight 
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50' 
            : 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/80'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`px-6 py-5 border-b flex items-start justify-between ${
          isLight ? 'border-slate-100 bg-rose-50/50' : 'border-slate-800/80 bg-rose-950/20'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isLight 
                ? 'bg-rose-100 border-rose-300 text-rose-600' 
                : 'bg-rose-950/80 border-rose-800/70 text-rose-400'
            }`}>
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 id="delete-modal-title" className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {isBulk ? `Delete ${invoicesToDelete.length} Selected Invoices?` : 'Delete Invoice Record?'}
              </h2>
              <p id="delete-modal-description" className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isBulk 
                  ? `Permanently remove these ${invoicesToDelete.length} invoices and halt their automated chaser sequences.`
                  : 'Confirming will permanently remove this invoice and its audit log.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="delete-modal-close-btn"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary Card */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {isBulk ? (
            <div className="space-y-3">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Value to Remove</div>
                  <div className={`font-mono font-bold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    ${bulkTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Invoices Selected</div>
                  <div className="font-mono font-bold text-lg text-rose-500">
                    {invoicesToDelete.length} items
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {invoicesToDelete.map((inv) => (
                  <div 
                    key={inv.id} 
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-800/40 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-mono font-bold truncate">{inv.invoiceNumber} &bull; {inv.clientName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{inv.serviceDescription}</div>
                    </div>
                    <div className="font-mono font-bold shrink-0">
                      ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : invoice && (
            <div className={`p-4 rounded-xl border space-y-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {invoice.invoiceNumber}
                  </span>
                </div>
                {statusInfo && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Client & Debtor</span>
                  </div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {invoice.clientName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {invoice.clientEmail}
                  </div>
                  {invoice.clientCompany && (
                    <div className="text-[10px] text-slate-500 truncate">
                      {invoice.clientCompany}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-0.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>Outstanding Value</span>
                  </div>
                  <div className="font-mono font-bold text-base text-slate-900 dark:text-white">
                    ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>Due: {invoice.dueDate}</span>
                  </div>
                </div>
              </div>

              {invoice.serviceDescription && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Description: </span>
                  {invoice.serviceDescription}
                </div>
              )}
            </div>
          )}

          {/* Impact Warning Notice */}
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
            isLight 
              ? 'bg-rose-50/80 border-rose-200 text-rose-900' 
              : 'bg-rose-950/30 border-rose-900/60 text-rose-300'
          }`}>
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="space-y-1">
              <p className="font-semibold">
                Permanent Removal Safeguard
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                {isBulk
                  ? `Deleting these ${invoicesToDelete.length} invoices will cease all scheduled chaser sequences and clear all historical logs.`
                  : 'Deleting this invoice will cease all scheduled chaser sequences and clear its historical logs.'}
                {remindersCount > 0 && (
                  <span className="block mt-0.5 font-medium text-rose-700 dark:text-rose-400">
                    &bull; Note: {remindersCount} previous reminder notification{remindersCount === 1 ? '' : 's'} recorded will be permanently removed.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className={`px-6 py-4 border-t flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 ${
          isLight ? 'border-slate-100 bg-slate-50' : 'border-slate-800 bg-slate-950/40'
        }`}>
          <button
            type="button"
            id="cancel-delete-invoice-btn"
            onClick={onClose}
            className={`w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              isLight 
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            Cancel, Keep {isBulk ? `${invoicesToDelete.length} Invoices` : 'Invoice'}
          </button>
          <button
            type="button"
            id="confirm-delete-invoice-btn"
            onClick={handleConfirm}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-950/30 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isBulk ? `Delete ${invoicesToDelete.length} Invoices` : 'Delete Invoice Record'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
