import React from 'react';
import { Invoice } from '../../types/chaserflow';
import { calculateAllClientScores } from '../../lib/clientScoring';
import { 
  DollarSign, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  MailCheck, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  GitMerge
} from 'lucide-react';

interface StatsBarProps {
  invoices: Invoice[];
  onOpenRiskRadar: () => void;
  onOpenClientReliability?: () => void;
  onOpenSmartDispatcher?: () => void;
  onOpenCadenceBuilder?: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({ 
  invoices, 
  onOpenRiskRadar,
  onOpenClientReliability,
  onOpenSmartDispatcher,
  onOpenCadenceBuilder
}) => {
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  
  const collectedInvoices = invoices.filter(inv => inv.status === 'paid');
  const collectedAmount = collectedInvoices.reduce((acc, inv) => acc + inv.amount, 0);

  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
  const overdueAmount = overdueInvoices.reduce((acc, inv) => acc + inv.amount, 0);

  const dueSoonInvoices = invoices.filter(inv => inv.status === 'due_soon');
  const dueSoonAmount = dueSoonInvoices.reduce((acc, inv) => acc + inv.amount, 0);

  const totalRemindersDispatched = invoices.reduce((acc, inv) => acc + (inv.reminderHistory?.length || 0), 0);

  const collectionRate = totalInvoiced > 0 ? Math.round((collectedAmount / totalInvoiced) * 100) : 0;

  const clientScores = calculateAllClientScores(invoices);
  const avgClientScore = clientScores.length > 0 
    ? Math.round(clientScores.reduce((acc, c) => acc + c.score, 0) / clientScores.length)
    : 85;

  return (
    <div className="space-y-3 mb-6">
      
      {/* Top AI Cash Intelligence Banner */}
      <div className="bg-gradient-to-r from-purple-950/50 via-indigo-950/30 to-slate-900 border border-purple-500/30 rounded-2xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div 
          onClick={onOpenRiskRadar}
          className="flex items-center gap-2.5 cursor-pointer flex-1"
        >
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">AI Cashflow Risk Radar</span>
              <span className="text-[10px] text-purple-300 font-medium bg-purple-950/80 px-2 py-0.2 rounded-full border border-purple-800">
                Live Analysis
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {overdueInvoices.length > 0 
                ? `${overdueInvoices.length} account${overdueInvoices.length === 1 ? '' : 's'} require escalation. Total $${overdueAmount.toLocaleString()} overdue.`
                : 'All accounts on track. Low portfolio default risk detected.'}
            </p>
          </div>
        </div>

        {/* Quick Action Navigation Chips */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onOpenClientReliability && (
            <button
              onClick={onOpenClientReliability}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-purple-300 border border-purple-800/50 text-[11px] font-semibold transition-all cursor-pointer"
              title="Client Reliability Scoring & Tiering"
            >
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span>Reliability Avg: {avgClientScore}/100</span>
            </button>
          )}

          {onOpenSmartDispatcher && (
            <button
              onClick={onOpenSmartDispatcher}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-cyan-800/50 text-[11px] font-semibold transition-all cursor-pointer"
              title="Smart Working Hours & Queue Timing"
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Working Hours Active</span>
            </button>
          )}

          {onOpenCadenceBuilder && (
            <button
              onClick={onOpenCadenceBuilder}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-emerald-800/50 text-[11px] font-semibold transition-all cursor-pointer"
              title="Customize Chaser Escalation Sequence"
            >
              <GitMerge className="w-3 h-3 text-emerald-400" />
              <span>Cadence Stages</span>
            </button>
          )}

          <div 
            onClick={onOpenRiskRadar}
            className="flex items-center gap-1 text-xs font-bold text-purple-300 hover:text-purple-200 cursor-pointer pl-1"
          >
            <span>Risk Horizon</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Grid of 4 Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Overdue At-Risk */}
        <div className="bg-slate-900/90 border border-rose-900/50 rounded-2xl p-4 relative overflow-hidden group hover:border-rose-700/60 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Overdue / At Risk
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800/60">
              {overdueInvoices.length} {overdueInvoices.length === 1 ? 'Invoice' : 'Invoices'}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ${overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Currently under polite escalation
          </p>
        </div>

        {/* Due Soon (Next 7 Days) */}
        <div className="bg-slate-900/90 border border-amber-900/50 rounded-2xl p-4 relative overflow-hidden group hover:border-amber-700/60 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Due in 7 Days
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60">
              {dueSoonInvoices.length} {dueSoonInvoices.length === 1 ? 'Invoice' : 'Invoices'}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ${dueSoonAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Heads-up notices queued
          </p>
        </div>

        {/* Collected Revenue */}
        <div className="bg-slate-900/90 border border-emerald-900/50 rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-700/60 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Collected Revenue
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              {collectionRate}% Collected
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
            ${collectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {collectedInvoices.length} invoices settled in full
          </p>
        </div>

        {/* Automated Actions Dispatched */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
              <MailCheck className="w-3.5 h-3.5" />
              Reminders Sent
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
              Automated
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {totalRemindersDispatched}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Saved ~{(totalRemindersDispatched * 15 / 60).toFixed(1)} hrs of awkward manual emails
          </p>
        </div>
      </div>

    </div>
  );
};
