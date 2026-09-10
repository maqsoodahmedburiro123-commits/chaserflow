import React, { useState } from 'react';
import { Invoice, InvoiceStatus, ChaserSettings, RecentlyModifiedState, ReminderLog } from '../../types/chaserflow';
import { getClientScoreByEmail } from '../../lib/clientScoring';
import { generateInvoicePdf, generateReceiptPdf } from '../../lib/pdfGenerator';
import { DEFAULT_CHASER_SETTINGS } from '../../data/defaultInvoices';
import { useTheme } from '../../context/ThemeContext';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { PaymentInfoModal } from './PaymentInfoModal';
import { BatchChaseModal } from './BatchChaseModal';
import { InvoiceNoteModal } from './InvoiceNoteModal';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Pause, 
  Play, 
  Trash2, 
  Calendar, 
  Mail, 
  Send,
  Sparkles,
  MessageSquareQuote,
  ShieldCheck,
  FileDown,
  Receipt,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  Check,
  Landmark,
  X,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';

interface InvoiceListProps {
  invoices: Invoice[];
  settings?: ChaserSettings;
  recentlyModifiedState?: RecentlyModifiedState | null;
  onUndoRecentlyModified?: () => void;
  onClearRecentlyModified?: () => void;
  onOpenPreview: (invoice: Invoice) => void;
  onOpenClientPortal: (invoice: Invoice) => void;
  onOpenExcuseAssistant: (invoice: Invoice) => void;
  onOpenRiskRadar: () => void;
  onOpenClientReliability?: (clientEmail?: string) => void;
  onToggleMarkPaid: (invoiceId: string) => void;
  onTogglePauseReminders: (invoiceId: string) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onBulkMarkPaid?: (invoiceIds: string[], targetStatus: 'paid' | 'pending') => void;
  onBulkPauseReminders?: (invoiceIds: string[], pause: boolean) => void;
  onBulkDelete?: (invoiceIds: string[]) => void;
  onSaveInvoiceNote?: (invoiceId: string, notes: string) => void;
  onBatchDispatchReminders?: (invoicesToSend: { invoice: Invoice; stageName: string; log: ReminderLog }[]) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  settings,
  recentlyModifiedState,
  onUndoRecentlyModified,
  onClearRecentlyModified,
  onOpenPreview,
  onOpenClientPortal,
  onOpenExcuseAssistant,
  onOpenRiskRadar,
  onOpenClientReliability,
  onToggleMarkPaid,
  onTogglePauseReminders,
  onDeleteInvoice,
  onBulkMarkPaid,
  onBulkPauseReminders,
  onBulkDelete,
  onSaveInvoiceNote,
  onBatchDispatchReminders
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recently_modified' | InvoiceStatus>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'amount_desc' | 'date_desc'>('urgency');
  
  // Selection state for bulk actions
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  
  // Modal states
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [bulkInvoicesToDelete, setBulkInvoicesToDelete] = useState<Invoice[] | null>(null);
  const [paymentInfoInvoices, setPaymentInfoInvoices] = useState<Invoice[] | null>(null);
  const [isBatchChaseOpen, setIsBatchChaseOpen] = useState(false);
  const [selectedNoteInvoice, setSelectedNoteInvoice] = useState<Invoice | null>(null);

  const { isLight } = useTheme();

  // Filter logic
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.clientCompany && inv.clientCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
      inv.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.serviceDescription.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' 
        ? true 
        : statusFilter === 'recently_modified'
        ? (recentlyModifiedState?.invoiceIds.includes(inv.id) ?? false)
        : inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort logic
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (sortBy === 'amount_desc') {
      return b.amount - a.amount;
    }
    if (sortBy === 'date_desc') {
      return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
    }
    // Urgency sort: overdue first, then due soon, then pending, then paid
    const statusWeight = { overdue: 4, due_soon: 3, pending: 2, paid: 1 };
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[b.status] - statusWeight[a.status];
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Bulk selection helpers
  const toggleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = sortedInvoices.length > 0 && sortedInvoices.every(inv => selectedInvoiceIds.includes(inv.id));
  const isSomeSelected = selectedInvoiceIds.length > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect only those currently visible in sorted
      const visibleIds = new Set(sortedInvoices.map(i => i.id));
      setSelectedInvoiceIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      // Select all currently visible
      const visibleIds = sortedInvoices.map(i => i.id);
      setSelectedInvoiceIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const clearSelection = () => {
    setSelectedInvoiceIds([]);
  };

  // Selected invoices data
  const selectedInvoices = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
  const selectedTotal = selectedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const allSelectedArePaid = selectedInvoices.length > 0 && selectedInvoices.every(i => i.status === 'paid');
  const allSelectedArePaused = selectedInvoices.length > 0 && selectedInvoices.every(i => i.remindersPaused);

  // Bulk action handlers
  const handleBulkMarkPaidAction = () => {
    const targetStatus = allSelectedArePaid ? 'pending' : 'paid';
    if (onBulkMarkPaid) {
      onBulkMarkPaid(selectedInvoiceIds, targetStatus);
    } else {
      selectedInvoiceIds.forEach(id => onToggleMarkPaid(id));
    }
    clearSelection();
  };

  const handleBulkPauseAction = () => {
    const targetPause = !allSelectedArePaused;
    if (onBulkPauseReminders) {
      onBulkPauseReminders(selectedInvoiceIds, targetPause);
    } else {
      selectedInvoiceIds.forEach(id => onTogglePauseReminders(id));
    }
  };

  const getDaysLabel = (invoice: Invoice) => {
    if (invoice.status === 'paid') return 'Paid in full';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)}d overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else {
      return `Due in ${diffDays}d`;
    }
  };

  const getAiRiskAssessment = (invoice: Invoice) => {
    if (invoice.status === 'paid') return null;
    const now = new Date();
    const due = new Date(invoice.dueDate);
    const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < -7 || invoice.remindersSentCount >= 3) {
      return { level: 'high', label: 'AI: High Risk', color: 'bg-rose-950/80 text-rose-300 border-rose-800' };
    }
    if (diffDays < 0 || diffDays <= 3) {
      return { level: 'medium', label: 'AI: Moderate Risk', color: 'bg-amber-950/80 text-amber-300 border-amber-800' };
    }
    return { level: 'low', label: 'AI: Low Risk', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' };
  };

  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const dueSoonCount = invoices.filter(i => i.status === 'due_soon').length;
  const pendingCount = invoices.filter(i => i.status === 'pending').length;
  const paidCount = invoices.filter(i => i.status === 'paid').length;

  return (
    <div className="space-y-4 relative pb-20">
      
      {/* Search & Filter Controls */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 border p-3 sm:p-4 rounded-2xl transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/90 border-slate-800'
      }`}>
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice #, client, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-4 py-2 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors ${
              isLight 
                ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' 
                : 'bg-slate-800/80 border-slate-700/80 text-white'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs & AI Radar Button */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { key: 'all', label: 'All', count: invoices.length },
            { key: 'overdue', label: 'Overdue', count: overdueCount, color: 'text-rose-400' },
            { key: 'due_soon', label: 'Due Soon', count: dueSoonCount, color: 'text-amber-400' },
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'paid', label: 'Paid', count: paidCount, color: 'text-emerald-400' },
            ...(recentlyModifiedState && recentlyModifiedState.invoiceIds.length > 0
              ? [{ 
                  key: 'recently_modified', 
                  label: 'Recently Modified', 
                  count: invoices.filter(i => recentlyModifiedState.invoiceIds.includes(i.id)).length, 
                  color: 'text-amber-400 font-bold' 
                }]
              : []
            ),
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                statusFilter === tab.key
                  ? isLight
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isLight ? 'bg-slate-200/80 text-slate-700' : 'bg-slate-950/80'
              } ${tab.color || ''}`}>
                {tab.count}
              </span>
            </button>
          ))}

          <button
            onClick={onOpenRiskRadar}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98] ${
              isLight
                ? 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900'
                : 'bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300'
            }`}
            title="Open AI Cashflow Risk Radar"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`} />
            <span className="hidden sm:inline">AI Risk Radar</span>
          </button>
        </div>

      </div>

      {/* Recently Modified / Undo Banner */}
      {recentlyModifiedState && (
        <div 
          id="recently-modified-banner"
          className={`p-3 sm:px-4.5 rounded-2xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs transition-all duration-200 animate-fadeIn ${
            recentlyModifiedState.actionType === 'restored'
              ? isLight
                ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950 shadow-xs'
                : 'bg-indigo-950/40 border-indigo-800/80 text-indigo-200 shadow-lg shadow-indigo-950/20'
              : isLight 
              ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs' 
              : 'bg-amber-950/40 border-amber-800/80 text-amber-200 shadow-lg shadow-amber-950/20'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              recentlyModifiedState.actionType === 'restored'
                ? isLight ? 'bg-indigo-200/80 text-indigo-800' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : isLight ? 'bg-amber-200/80 text-amber-800' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs">
                  {recentlyModifiedState.actionType === 'restored' ? 'Action Reverted' : 'Recently Modified'}:
                </span>
                <span className="font-medium opacity-90 truncate max-w-xs sm:max-w-md">
                  {recentlyModifiedState.description}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                  recentlyModifiedState.actionType === 'restored'
                    ? isLight ? 'bg-indigo-200/70 text-indigo-900' : 'bg-indigo-900/60 text-indigo-300'
                    : isLight ? 'bg-amber-200/70 text-amber-900' : 'bg-amber-900/60 text-amber-300'
                }`}>
                  {recentlyModifiedState.invoiceIds.length} {recentlyModifiedState.invoiceIds.length === 1 ? 'invoice' : 'invoices'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {onUndoRecentlyModified && recentlyModifiedState.previousInvoices && recentlyModifiedState.previousInvoices.length > 0 && (
              <button
                type="button"
                id="banner-undo-btn"
                onClick={onUndoRecentlyModified}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 shadow-sm ${
                  isLight
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold'
                }`}
                title="Revert recent bulk action"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Undo Changes</span>
              </button>
            )}

            {onClearRecentlyModified && (
              <button
                type="button"
                id="banner-dismiss-btn"
                onClick={onClearRecentlyModified}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isLight 
                    ? 'text-slate-600 hover:bg-amber-200/60 hover:text-slate-900' 
                    : 'text-slate-400 hover:bg-amber-800/40 hover:text-white'
                }`}
                title="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sub-bar: Master Checkbox & Sort Controls */}
      {sortedInvoices.length > 0 && (
        <div className={`px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
          isLight ? 'bg-slate-50/80 border-slate-200 text-slate-600' : 'bg-slate-900/60 border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="select-all-invoices-checkbox"
              onClick={toggleSelectAll}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                isAllSelected || isSomeSelected
                  ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-xs'
                  : isLight
                  ? 'bg-white border-slate-300 hover:border-slate-400'
                  : 'bg-slate-800 border-slate-600 hover:border-slate-500'
              }`}
              title={isAllSelected ? 'Deselect All' : 'Select All Invoices'}
            >
              {isAllSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              {isSomeSelected && <div className="w-2.5 h-0.5 bg-slate-950 rounded-xs" />}
            </button>
            <span className="font-semibold text-xs">
              {selectedInvoiceIds.length > 0 
                ? `${selectedInvoiceIds.length} of ${sortedInvoices.length} selected`
                : `Select Invoices (${sortedInvoices.length} total)`}
            </span>
            {selectedInvoiceIds.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-[11px] text-slate-400 hover:text-rose-400 underline ml-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`text-xs py-1 px-2.5 rounded-lg border focus:outline-none transition-colors cursor-pointer ${
                isLight 
                  ? 'bg-white border-slate-300 text-slate-700' 
                  : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <option value="urgency">Urgency (Overdue First)</option>
              <option value="amount_desc">Amount (Highest First)</option>
              <option value="date_desc">Issue Date (Newest First)</option>
            </select>
          </div>
        </div>
      )}

      {/* Invoice List Items */}
      {sortedInvoices.length > 0 ? (
        <div className="space-y-3">
          {sortedInvoices.map((invoice) => {
            const isPaid = invoice.status === 'paid';
            const isOverdue = invoice.status === 'overdue';
            const isDueSoon = invoice.status === 'due_soon';
            const aiRisk = getAiRiskAssessment(invoice);
            const clientScore = getClientScoreByEmail(invoice.clientEmail, invoices);
            const isSelected = selectedInvoiceIds.includes(invoice.id);
            const isRecentlyModified = Boolean(recentlyModifiedState?.invoiceIds.includes(invoice.id));

            return (
              <div
                key={invoice.id}
                onClick={() => toggleSelectInvoice(invoice.id)}
                className={`group border rounded-2xl p-4 sm:p-5 transition-all duration-200 ease-out transform hover:-translate-y-1 will-change-transform cursor-pointer relative ${
                  isSelected
                    ? isLight
                      ? 'ring-2 ring-emerald-500/90 border-emerald-400/90 bg-emerald-50/40 shadow-md shadow-emerald-100/50'
                      : 'ring-2 ring-emerald-500/90 border-emerald-500/80 bg-slate-900 shadow-xl shadow-emerald-950/20'
                    : isRecentlyModified
                    ? isLight
                      ? 'ring-2 ring-amber-400/80 border-amber-300 bg-amber-50/25 shadow-md shadow-amber-100/40'
                      : 'ring-2 ring-amber-500/60 border-amber-500/50 bg-slate-900 shadow-xl shadow-amber-950/20'
                    : isLight
                    ? `bg-white ${
                        isOverdue
                          ? 'border-rose-200/90 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-100/70'
                          : isDueSoon
                          ? 'border-amber-200/90 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100/70'
                          : isPaid
                          ? 'border-slate-200/80 opacity-80 hover:opacity-100 hover:border-emerald-300 hover:shadow-md hover:shadow-slate-100'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100'
                      }`
                    : `bg-slate-900/80 hover:bg-slate-900 ${
                        isOverdue
                          ? 'border-rose-900/40 hover:border-rose-600/70 hover:shadow-xl hover:shadow-rose-950/40'
                          : isDueSoon
                          ? 'border-amber-900/40 hover:border-amber-600/70 hover:shadow-xl hover:shadow-amber-950/40'
                          : isPaid
                          ? 'border-slate-800/80 opacity-80 hover:opacity-100 hover:border-emerald-800/60 hover:shadow-md hover:shadow-emerald-950/20'
                          : 'border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-slate-950/50'
                      }`
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left Column: Selection Checkbox, Number, Status, Client, Service */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      
                      {/* Row Checkbox */}
                      <button
                        type="button"
                        id={`select-invoice-${invoice.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectInvoice(invoice.id);
                        }}
                        aria-label={`Select invoice ${invoice.invoiceNumber}`}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-xs'
                            : isLight
                            ? 'bg-slate-50 border-slate-300 hover:border-slate-400'
                            : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        {invoice.invoiceNumber}
                      </span>

                      {/* Status Pill */}
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                        isPaid
                          ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : isOverdue
                          ? isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-950/80 text-rose-300 border-rose-800'
                          : isDueSoon
                          ? isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {isPaid ? 'Paid' : isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'Pending'}
                      </span>

                      {/* Recently Modified Tag */}
                      {isRecentlyModified && (
                        <span 
                          id={`recently-modified-tag-${invoice.id}`}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 transition-all ${
                            recentlyModifiedState?.actionType === 'restored'
                              ? isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                              : isLight ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-800'
                          }`}
                          title={`Modified recently: ${recentlyModifiedState?.description}`}
                        >
                          <RotateCcw className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span>
                            {recentlyModifiedState?.actionType === 'restored' 
                              ? 'Restored' 
                              : recentlyModifiedState?.actionType === 'bulk_paid' || recentlyModifiedState?.actionType === 'mark_paid'
                              ? 'Just Marked Paid'
                              : recentlyModifiedState?.actionType === 'bulk_unpaid'
                              ? 'Just Reopened'
                              : recentlyModifiedState?.actionType?.includes('pause')
                              ? 'Chaser Paused'
                              : recentlyModifiedState?.actionType?.includes('resume')
                              ? 'Chaser Resumed'
                              : 'Recently Modified'}
                          </span>
                        </span>
                      )}

                      {/* AI Risk Tag */}
                      {aiRisk && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${aiRisk.color}`}>
                          {aiRisk.label}
                        </span>
                      )}

                      {/* Client Reliability Score Badge */}
                      {clientScore && onOpenClientReliability && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenClientReliability(invoice.clientEmail);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-all cursor-pointer hover:scale-105 flex items-center gap-1 ${
                            clientScore.tier === 'A+' || clientScore.tier === 'A'
                              ? isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-950/50 text-emerald-300 border-emerald-800'
                              : clientScore.tier === 'B'
                              ? isLight ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-blue-950/50 text-blue-300 border-blue-800'
                              : clientScore.tier === 'C'
                              ? isLight ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-amber-950/50 text-amber-300 border-amber-800'
                              : isLight ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-rose-950/50 text-rose-300 border-rose-800'
                          }`}
                          title={`Client Reliability Score: ${clientScore.score}/100 (${clientScore.tier} Tier). Click for client analysis.`}
                        >
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>Reliability: {clientScore.tier} ({clientScore.score})</span>
                        </button>
                      )}

                      {/* Reminders Paused Indicator */}
                      {invoice.remindersPaused && !isPaid && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Pause className="w-2.5 h-2.5" />
                          <span>Chasers Paused</span>
                        </span>
                      )}
                    </div>

                    {/* Client Name & Service */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {invoice.clientName}
                      </h3>
                      {invoice.clientCompany && (
                        <span className="text-xs text-slate-400 font-medium">
                          &bull; {invoice.clientCompany}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        ({invoice.clientEmail})
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                      {invoice.serviceDescription}
                    </p>

                    {/* Internal Follow-up Notes Pill (if any) */}
                    {invoice.notes && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNoteInvoice(invoice);
                        }}
                        className={`mt-2 p-2 sm:px-2.5 rounded-xl border text-xs flex items-start gap-2 cursor-pointer transition-all hover:scale-[1.005] ${
                          isLight 
                            ? 'bg-amber-50/70 border-amber-200 text-amber-950 hover:bg-amber-100/60' 
                            : 'bg-amber-950/20 border-amber-800/50 text-amber-200 hover:bg-amber-950/40'
                        }`}
                        title="Click to view or edit internal follow-up note"
                      >
                        <MessageSquareQuote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-amber-500">
                              Client Note
                            </span>
                            <span className="text-[10px] opacity-75 hover:underline">
                              Edit Note
                            </span>
                          </div>
                          <p className="line-clamp-2 text-[11px] leading-relaxed mt-0.5 opacity-90 whitespace-pre-line">
                            {invoice.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Due Date & Reminders Meta */}
                    <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Due: <strong className={isLight ? 'text-slate-700' : 'text-slate-200'}>{invoice.dueDate}</strong></span>
                        <span className={`text-[11px] px-1.5 py-0.2 rounded font-medium ${
                          isOverdue ? 'text-rose-400 font-bold' : isDueSoon ? 'text-amber-400 font-bold' : 'text-slate-400'
                        }`}>
                          ({getDaysLabel(invoice)})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {invoice.remindersSentCount === 0 
                            ? 'No reminders sent yet' 
                            : `${invoice.remindersSentCount} reminder${invoice.remindersSentCount > 1 ? 's' : ''} sent`}
                        </span>
                        {invoice.lastReminderSentAt && (
                          <span className="text-slate-400 text-[11px]">
                            (Last: {invoice.lastReminderSentAt})
                          </span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Amount, Download PDF, Action Buttons */}
                  <div 
                    className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    
                    {/* Amount Display */}
                    <div className="text-left lg:text-right mr-2">
                      <div className={`font-mono text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                        {invoice.currency}
                      </div>
                    </div>

                    {/* PDF Generation (Invoice / Receipt) */}
                    <button
                      type="button"
                      id={`download-pdf-btn-${invoice.id}`}
                      onClick={() => {
                        if (isPaid) {
                          generateReceiptPdf(invoice, settings || DEFAULT_CHASER_SETTINGS);
                        } else {
                          generateInvoicePdf(invoice, settings || DEFAULT_CHASER_SETTINGS);
                        }
                      }}
                      className={`p-2 rounded-xl transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 border ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          : 'bg-slate-800/60 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                      }`}
                      title={isPaid ? "Download Official Payment Receipt (PDF)" : "Download Formal Invoice (PDF)"}
                    >
                      {isPaid ? (
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </button>

                    {/* Safe Payment Information & Options (Bank Wire/ACH, Zelle, Wise) */}
                    <button
                      type="button"
                      id={`payment-info-btn-${invoice.id}`}
                      onClick={() => setPaymentInfoInvoices([invoice])}
                      className={`p-2 rounded-xl transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 border ${
                        isLight
                          ? 'text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border-slate-200'
                          : 'text-slate-300 hover:text-emerald-400 bg-slate-800/60 hover:bg-emerald-950/40 border-slate-700/80'
                      }`}
                      title="Safe Payment Info & Bank Remittance Options (No risky links)"
                    >
                      <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                    </button>

                    {/* Mark as Paid Toggle */}
                    <button
                      id={`mark-paid-btn-${invoice.id}`}
                      onClick={() => onToggleMarkPaid(invoice.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                        isPaid
                          ? isLight
                            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                            : 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300'
                          : isLight
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                      title={isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isPaid ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{isPaid ? 'Paid' : 'Mark Paid'}</span>
                    </button>

                    {/* AI Objection / Delay Assistant */}
                    {!isPaid && (
                      <button
                        onClick={() => onOpenExcuseAssistant(invoice)}
                        className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        title="AI Client Delay & Objection Assistant"
                      >
                        <MessageSquareQuote className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Delay Helper</span>
                      </button>
                    )}

                    {/* Send / Preview Reminder Email */}
                    {!isPaid && (
                      <button
                        id={`chase-btn-${invoice.id}`}
                        onClick={() => onOpenPreview(invoice)}
                        className={`px-3 py-1.5 border text-xs font-semibold rounded-xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                          isLight
                            ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-white shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        }`}
                        title="Preview & Send Chaser Email"
                      >
                        <Send className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Chase</span>
                      </button>
                    )}

                    {/* Client Portal View */}
                    <button
                      id={`portal-btn-${invoice.id}`}
                      onClick={() => onOpenClientPortal(invoice)}
                      className={`px-2.5 py-1.5 border rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                      }`}
                      title="Preview Client View & Pay Portal"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Client View</span>
                    </button>

                    {/* Client Follow-up Note Button */}
                    <button
                      type="button"
                      id={`note-invoice-${invoice.id}-btn`}
                      onClick={() => setSelectedNoteInvoice(invoice)}
                      className={`p-2 rounded-xl transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 ${
                        invoice.notes
                          ? isLight ? 'text-amber-800 bg-amber-100/90 hover:bg-amber-200' : 'text-amber-300 bg-amber-950/80 hover:bg-amber-900'
                          : isLight ? 'text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800'
                      }`}
                      title={invoice.notes ? 'View / Edit Client Follow-up Note' : 'Add Client Follow-up Note'}
                    >
                      <MessageSquareQuote className="w-3.5 h-3.5" />
                    </button>

                    {/* Pause / Resume Chaser */}
                    {!isPaid && (
                      <button
                        onClick={() => onTogglePauseReminders(invoice.id)}
                        className={`p-2 rounded-xl transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 ${
                          isLight
                            ? 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                            : 'text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800'
                        }`}
                        title={invoice.remindersPaused ? 'Resume Automated Chasing' : 'Pause Automated Chasing'}
                      >
                        {invoice.remindersPaused ? (
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Pause className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </button>
                    )}

                    {/* Delete Invoice */}
                    <button
                      id={`delete-invoice-${invoice.id}-btn`}
                      onClick={() => setInvoiceToDelete(invoice)}
                      className="p-2 text-slate-500 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-950/50 rounded-xl transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`border rounded-2xl p-12 text-center ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Search className="w-6 h-6" />
          </div>
          <h4 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>No invoices found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Try changing your search keywords or clearing status filters.'
              : 'Add your first invoice to start automated polite chasing and recover your cash.'}
          </p>
        </div>
      )}

      {/* Floating Bulk Actions Toolbar */}
      {selectedInvoiceIds.length > 0 && (
        <div 
          id="bulk-actions-floating-toolbar"
          className="fixed bottom-6 inset-x-0 mx-auto max-w-2xl px-4 z-40 animate-slideUp pointer-events-none"
        >
          <div className={`pointer-events-auto p-3 sm:px-4 rounded-2xl shadow-2xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 backdrop-blur-md transition-all ${
            isLight 
              ? 'bg-white/95 border-slate-300 text-slate-900 shadow-slate-400/40 ring-1 ring-slate-900/5' 
              : 'bg-slate-900/95 border-slate-700 text-white shadow-black/80 ring-1 ring-white/10'
          }`}>
            
            {/* Left info: Count and Total */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold font-mono">
                    {selectedInvoiceIds.length} {selectedInvoiceIds.length === 1 ? 'invoice' : 'invoices'} selected
                  </span>
                  <span className="text-slate-400 text-[10px]">&bull;</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ${selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="hover:text-emerald-400 cursor-pointer font-medium"
                  >
                    {isAllSelected ? 'Deselect All' : `Select All (${sortedInvoices.length})`}
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="hover:text-slate-200 cursor-pointer font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap ml-auto">
              
              {/* Bulk Mark as Paid */}
              <button
                type="button"
                id="bulk-mark-paid-btn"
                onClick={handleBulkMarkPaidAction}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title={allSelectedArePaid ? 'Reopen selected invoices' : 'Mark all selected as Paid'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{allSelectedArePaid ? 'Mark Unpaid' : 'Mark as Paid'}</span>
              </button>

              {/* Bulk Batch Chase (for unpaid selected) */}
              {selectedInvoices.some(i => i.status !== 'paid') && onBatchDispatchReminders && (
                <button
                  type="button"
                  id="bulk-batch-chase-btn"
                  onClick={() => setIsBatchChaseOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  title="Preview & dispatch polite reminders in batch for selected invoices"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Batch Chase</span>
                </button>
              )}

              {/* Safe Payment Information & Options */}
              <button
                type="button"
                id="bulk-payment-info-btn"
                onClick={() => setPaymentInfoInvoices(selectedInvoices)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="View verified bank remittance & payment options (no risky links)"
              >
                <Landmark className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Payment Info</span>
              </button>

              {/* Bulk Pause / Resume */}
              <button
                type="button"
                id="bulk-pause-btn"
                onClick={handleBulkPauseAction}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={allSelectedArePaused ? 'Resume Chasers for selected' : 'Pause Chasers for selected'}
              >
                {allSelectedArePaused ? (
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                )}
              </button>

              {/* Bulk Delete */}
              <button
                type="button"
                id="bulk-delete-btn"
                onClick={() => setBulkInvoicesToDelete(selectedInvoices)}
                className="p-2 rounded-xl text-xs font-bold bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 flex items-center gap-1 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="Delete selected invoices"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Dismiss selection button */}
              <button
                type="button"
                onClick={clearSelection}
                className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${
                  isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Clear Selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>

            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Single or Bulk) */}
      <DeleteConfirmationModal
        isOpen={!!invoiceToDelete || !!bulkInvoicesToDelete}
        invoice={invoiceToDelete}
        invoicesToDelete={bulkInvoicesToDelete || undefined}
        onClose={() => {
          setInvoiceToDelete(null);
          setBulkInvoicesToDelete(null);
        }}
        onConfirmDelete={(invoiceId) => {
          onDeleteInvoice(invoiceId);
          setInvoiceToDelete(null);
          setSelectedInvoiceIds(prev => prev.filter(id => id !== invoiceId));
        }}
        onConfirmBulkDelete={(ids) => {
          if (onBulkDelete) {
            onBulkDelete(ids);
          } else {
            ids.forEach(id => onDeleteInvoice(id));
          }
          setBulkInvoicesToDelete(null);
          setSelectedInvoiceIds([]);
        }}
      />

      {/* Safe Payment Information & Options Modal */}
      <PaymentInfoModal
        isOpen={!!paymentInfoInvoices}
        invoices={paymentInfoInvoices || []}
        onClose={() => setPaymentInfoInvoices(null)}
        settings={settings || DEFAULT_CHASER_SETTINGS}
      />

      {/* Batch Polite Chaser Modal */}
      <BatchChaseModal
        isOpen={isBatchChaseOpen}
        onClose={() => setIsBatchChaseOpen(false)}
        invoices={selectedInvoices}
        settings={settings || DEFAULT_CHASER_SETTINGS}
        onConfirmBatchSend={(invoicesToSend) => {
          if (onBatchDispatchReminders) {
            onBatchDispatchReminders(invoicesToSend);
          }
          setIsBatchChaseOpen(false);
          clearSelection();
        }}
      />

      {/* Client Follow-up Note Modal */}
      <InvoiceNoteModal
        isOpen={!!selectedNoteInvoice}
        invoice={selectedNoteInvoice}
        onClose={() => setSelectedNoteInvoice(null)}
        onSaveNote={(invoiceId, notes) => {
          if (onSaveInvoiceNote) {
            onSaveInvoiceNote(invoiceId, notes);
          }
          setSelectedNoteInvoice(null);
        }}
      />

    </div>
  );
};
