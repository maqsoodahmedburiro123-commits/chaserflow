import React, { useState } from 'react';
import { Invoice, InvoiceStatus } from '../../types/chaserflow';
import { getClientScoreByEmail } from '../../lib/clientScoring';
import { generateInvoicePdf, generateReceiptPdf } from '../../lib/pdfGenerator';
import { DEFAULT_CHASER_SETTINGS } from '../../data/defaultInvoices';
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
  Download
} from 'lucide-react';

interface InvoiceListProps {
  invoices: Invoice[];
  onOpenPreview: (invoice: Invoice) => void;
  onOpenClientPortal: (invoice: Invoice) => void;
  onOpenExcuseAssistant: (invoice: Invoice) => void;
  onOpenRiskRadar: () => void;
  onOpenClientReliability?: (clientEmail?: string) => void;
  onToggleMarkPaid: (invoiceId: string) => void;
  onTogglePauseReminders: (invoiceId: string) => void;
  onDeleteInvoice: (invoiceId: string) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onOpenPreview,
  onOpenClientPortal,
  onOpenExcuseAssistant,
  onOpenRiskRadar,
  onOpenClientReliability,
  onToggleMarkPaid,
  onTogglePauseReminders,
  onDeleteInvoice
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'amount_desc' | 'date_desc'>('urgency');

  // Filter logic
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.clientCompany && inv.clientCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
      inv.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.serviceDescription.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

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
    <div className="space-y-4">
      
      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice #, client, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
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
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/80 ${tab.color || 'text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}

          <button
            onClick={onOpenRiskRadar}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
            title="Open AI Cashflow Risk Radar"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI Risk Radar</span>
          </button>
        </div>

      </div>

      {/* Invoice List Items */}
      {sortedInvoices.length > 0 ? (
        <div className="space-y-3">
          {sortedInvoices.map((invoice) => {
            const isPaid = invoice.status === 'paid';
            const isOverdue = invoice.status === 'overdue';
            const isDueSoon = invoice.status === 'due_soon';
            const aiRisk = getAiRiskAssessment(invoice);
            const clientScore = getClientScoreByEmail(invoice.clientEmail, invoices);

            return (
              <div
                key={invoice.id}
                className={`bg-slate-900/80 border rounded-2xl p-4 sm:p-5 transition-all hover:bg-slate-900 ${
                  isOverdue
                    ? 'border-rose-900/40 hover:border-rose-700/60 shadow-sm shadow-rose-950/20'
                    : isDueSoon
                    ? 'border-amber-900/40 hover:border-amber-700/60'
                    : isPaid
                    ? 'border-slate-800/80 opacity-80 hover:opacity-100'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left Column: Number, Status, Client, Service */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-300">
                        {invoice.invoiceNumber}
                      </span>

                      {/* Status Badges */}
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          PAID
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          <AlertCircle className="w-3 h-3 text-rose-400 animate-pulse" />
                          {getDaysLabel(invoice).toUpperCase()}
                        </span>
                      ) : isDueSoon ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {getDaysLabel(invoice).toUpperCase()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {getDaysLabel(invoice).toUpperCase()}
                        </span>
                      )}

                      {/* Client Reliability Score Badge */}
                      {clientScore && (
                        <button
                          type="button"
                          onClick={() => onOpenClientReliability?.(invoice.clientEmail)}
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950/70 border border-purple-800/80 text-purple-300 hover:bg-purple-900 transition-colors cursor-pointer"
                          title={`Client Reliability: ${clientScore.score}/100 (Tier ${clientScore.tier}). Click to inspect client profile.`}
                        >
                          <ShieldCheck className="w-2.5 h-2.5 text-purple-400" />
                          <span>Reliability {clientScore.score} ({clientScore.tier})</span>
                        </button>
                      )}

                      {/* AI Risk Assessment Pill */}
                      {aiRisk && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${aiRisk.color}`}>
                          <Sparkles className="w-2.5 h-2.5" />
                          {aiRisk.label}
                        </span>
                      )}

                      {/* Pause status */}
                      {invoice.remindersPaused && !isPaid && (
                        <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
                          Chaser Paused
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white truncate">
                        {invoice.clientName}
                      </h4>
                      {invoice.clientCompany && (
                        <span className="text-xs text-slate-400 font-medium truncate hidden sm:inline">
                          &bull; {invoice.clientCompany}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {invoice.serviceDescription}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-3 sm:gap-4 mt-2 text-[11px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Due: <strong className="text-slate-200">{invoice.dueDate}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {invoice.clientEmail}
                      </span>
                      {!isPaid && invoice.nextScheduledReminderDate && !invoice.remindersPaused && (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Next Chaser: {invoice.nextScheduledReminderDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Amount & Chaser Stats */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 border-slate-800/80 pt-3 lg:pt-0">
                    <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                      ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {invoice.reminderHistory?.length || 0} reminders sent
                    </div>
                  </div>

                  {/* Right Column: Interactive Buttons */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end pt-2 lg:pt-0">
                    
                    {/* Mark Paid Toggle */}
                    <button
                      id={`mark-paid-${invoice.id}`}
                      onClick={() => onToggleMarkPaid(invoice.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isPaid
                          ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30'
                      }`}
                      title={isPaid ? 'Reopen Invoice' : 'Mark as Paid'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isPaid ? 'Mark Unpaid' : 'Mark Paid'}</span>
                    </button>

                    {/* PDF Download Button */}
                    <button
                      onClick={() => generateInvoicePdf(invoice, DEFAULT_CHASER_SETTINGS)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                      title="Download Branded PDF Invoice"
                    >
                      <FileDown className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>

                    {/* Receipt PDF if Paid */}
                    {isPaid && (
                      <button
                        onClick={() => generateReceiptPdf(invoice, DEFAULT_CHASER_SETTINGS)}
                        className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        title="Download Settlement Receipt PDF"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Receipt</span>
                      </button>
                    )}

                    {/* AI Objection / Delay Assistant */}
                    {!isPaid && (
                      <button
                        onClick={() => onOpenExcuseAssistant(invoice)}
                        className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
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
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
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
                      className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                      title="Preview Client View & Pay Portal"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Client View</span>
                    </button>

                    {/* Pause / Resume Chaser */}
                    {!isPaid && (
                      <button
                        onClick={() => onTogglePauseReminders(invoice.id)}
                        className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
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
                      onClick={() => onDeleteInvoice(invoice.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">No invoices found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Try changing your search keywords or clearing status filters.'
              : 'Add your first invoice to start automated polite chasing and recover your cash.'}
          </p>
        </div>
      )}

    </div>
  );
};
