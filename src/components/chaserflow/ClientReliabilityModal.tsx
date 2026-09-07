import React, { useState } from 'react';
import { Invoice, ClientScore } from '../../types/chaserflow';
import { calculateAllClientScores } from '../../lib/clientScoring';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  Search,
  CheckCircle2,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface ClientReliabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  onSelectClientInvoices?: (clientEmail: string) => void;
}

export const ClientReliabilityModal: React.FC<ClientReliabilityModalProps> = ({
  isOpen,
  onClose,
  invoices,
  onSelectClientInvoices
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScore, setSelectedScore] = useState<ClientScore | null>(null);

  if (!isOpen) return null;

  const clientScores = calculateAllClientScores(invoices);
  const filtered = clientScores.filter(
    (c) =>
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.clientCompany && c.clientCompany.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeClient = selectedScore || filtered[0] || clientScores[0];

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'A+':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700/80';
      case 'A':
        return 'bg-teal-950 text-teal-300 border-teal-700/80';
      case 'B':
        return 'bg-blue-950 text-blue-300 border-blue-700/80';
      case 'C':
        return 'bg-amber-950 text-amber-300 border-amber-700/80';
      default:
        return 'bg-rose-950 text-rose-300 border-rose-700/80';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-emerald-400';
      case 'medium':
        return 'text-amber-400';
      case 'high':
        return 'text-orange-400';
      default:
        return 'text-rose-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Client Reliability & Payment Speed Intelligence
                <span className="text-[10px] font-semibold text-purple-300 bg-purple-950/80 border border-purple-800/60 px-2 py-0.5 rounded-full">
                  Automated Scoring
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Data-driven reliability analysis, average settlement turnaround, and personalized contract recommendations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Layout: 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Left: Client List */}
          <div className="md:col-span-5 border-r border-slate-800 flex flex-col bg-slate-950/40 p-4 overflow-y-auto">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {filtered.map((client) => {
                const isSelected = activeClient?.clientEmail === client.clientEmail;
                return (
                  <button
                    key={client.clientEmail}
                    onClick={() => setSelectedScore(client)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-purple-500/70 shadow-md text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{client.clientName}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getTierBadge(client.tier)}`}>
                          {client.tier}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {client.clientCompany || client.clientEmail}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-white block">
                        {client.score}/100
                      </span>
                      <span className={`text-[10px] capitalize font-medium ${getRiskColor(client.riskLevel)}`}>
                        {client.riskLevel} risk
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Client Deep Dive Profile */}
          {activeClient && (
            <div className="md:col-span-7 p-6 overflow-y-auto space-y-5 bg-slate-900/30">
              
              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{activeClient.clientName}</h3>
                    <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-full border ${getTierBadge(activeClient.tier)}`}>
                      Tier {activeClient.tier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeClient.clientCompany ? `${activeClient.clientCompany} • ` : ''}{activeClient.clientEmail}
                  </p>
                </div>

                <div className="text-left sm:text-right bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Reliability Score</span>
                  <div className="flex items-baseline gap-1 sm:justify-end">
                    <span className="text-2xl font-black text-white">{activeClient.score}</span>
                    <span className="text-xs text-slate-500 font-mono">/100</span>
                  </div>
                </div>
              </div>

              {/* 4 Stat Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">On-Time Rate</span>
                  <span className="text-sm font-bold text-emerald-400 mt-1 block">
                    {activeClient.onTimeRate}%
                  </span>
                  <span className="text-[10px] text-slate-500">{activeClient.paidCount} settled</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Avg Turnaround</span>
                  <span className="text-sm font-bold text-cyan-400 mt-1 block">
                    {activeClient.avgDaysToPay} days
                  </span>
                  <span className="text-[10px] text-slate-500">From issue to paid</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Paid</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    ${activeClient.totalPaid.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">{activeClient.paidCount} invoices</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Outstanding</span>
                  <span className={`text-sm font-bold mt-1 block ${activeClient.outstandingAmount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    ${activeClient.outstandingAmount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">{activeClient.overdueCount} overdue</span>
                </div>
              </div>

              {/* Smart Recommendations Box */}
              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/60 space-y-3">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Contract & Terms Advisory</span>
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-slate-200">Recommended Payment Terms</h5>
                  <p className="text-xs text-purple-200/90 mt-0.5 leading-relaxed">
                    {activeClient.recommendedTerms}
                  </p>
                </div>
                <div className="pt-1 border-t border-purple-800/40">
                  <h5 className="text-xs font-semibold text-slate-200">Suggested Follow-Up Action</h5>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    {activeClient.recommendedAction}
                  </p>
                </div>
              </div>

              {/* Client's Invoices Summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Client Invoice History</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {invoices.filter(i => i.clientEmail === activeClient.clientEmail).length} invoices on file
                  </span>
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {invoices
                    .filter((i) => i.clientEmail === activeClient.clientEmail)
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{inv.invoiceNumber}</span>
                          <span className="text-slate-400 truncate max-w-[150px]">{inv.serviceDescription}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-white">${inv.amount.toLocaleString()}</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              inv.status === 'paid'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : inv.status === 'overdue'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
