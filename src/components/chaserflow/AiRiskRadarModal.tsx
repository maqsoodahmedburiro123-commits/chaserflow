import React, { useState, useEffect } from 'react';
import { Invoice } from '../../types/chaserflow';
import { useTheme } from '../../context/ThemeContext';
import { 
  X, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw,
  Mail,
  MessageSquareQuote,
  DollarSign
} from 'lucide-react';

interface AnalyzedInvoice {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

interface RiskAnalysisResult {
  overallHealthScore: number;
  executiveSummary: string;
  totalAtRisk: number;
  analyzedInvoices: AnalyzedInvoice[];
  isFallback?: boolean;
}

interface AiRiskRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  onOpenReminder?: (invoice: Invoice) => void;
  onOpenExcuseAssistant?: (invoice: Invoice) => void;
  onChaseInvoice?: (invoice: Invoice) => void;
}

// Client-side fallback analyzer if backend API or network is temporarily unavailable
function generateClientFallback(pendingInvoices: Invoice[]): RiskAnalysisResult {
  const totalPending = pendingInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const overdueCount = pendingInvoices.filter(i => i.status === 'overdue').length;
  
  const analyzed: AnalyzedInvoice[] = pendingInvoices.map(inv => {
    let riskScore = 20;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let recommendation = 'Standard polite reminder scheduled.';

    if (inv.status === 'overdue') {
      riskScore = 75 + Math.min((inv.remindersSentCount || 0) * 5, 20);
      riskLevel = 'high';
      recommendation = 'Urgent: Escalate via direct phone call or offer a 2-part installment settlement.';
    } else if (inv.status === 'due_soon') {
      riskScore = 45;
      riskLevel = 'medium';
      recommendation = 'Send courteous WhatsApp/SMS heads-up with 1-click pay link.';
    }

    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      amount: inv.amount,
      riskScore,
      riskLevel,
      recommendation
    };
  });

  return {
    isFallback: true,
    totalAtRisk: totalPending,
    overallHealthScore: Math.max(15, 100 - (overdueCount * 25)),
    executiveSummary: `Analysis completed via heuristic engine. You have $${totalPending.toLocaleString()} in outstanding receivables across ${pendingInvoices.length} active invoices. Prioritize immediate contact with overdue accounts.`,
    analyzedInvoices: analyzed
  };
}

export const AiRiskRadarModal: React.FC<AiRiskRadarModalProps> = ({
  isOpen,
  onClose,
  invoices,
  onOpenReminder,
  onOpenExcuseAssistant,
  onChaseInvoice
}) => {
  // Always call hooks unconditionally at the top level
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RiskAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isLight } = useTheme();

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    const pending = invoices.filter(i => i.status !== 'paid');

    try {
      const res = await fetch('/api/ai/analyze-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: pending })
      });

      if (!res.ok) {
        // Gracefully use local heuristic analysis instead of throwing
        console.warn('API returned non-200, using client heuristic fallback');
        setData(generateClientFallback(pending));
        return;
      }

      const result = await res.json();
      setData(result);
    } catch (err: any) {
      console.warn('Failed to fetch AI analysis, using client heuristic fallback:', err);
      // Fall back seamlessly so the user never experiences a broken state
      setData(generateClientFallback(pending));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runAnalysis();
    }
  }, [isOpen]);

  // Hook declarations are complete - safe to return null if closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-950/50">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Cashflow Risk Radar</h3>
              </div>
              <p className="text-xs text-slate-400">
                Predictive default modeling & intelligent recovery actions for outstanding receivables.
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-white">Analyzing Cashflow Risk & Payment Horizons...</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Cross-referencing invoice aging, reminder counts, and client engagement patterns.
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={runAnalysis} 
                className="px-3 py-1 bg-red-900/80 text-white rounded-lg hover:bg-red-800 font-medium cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : data ? (
            <>
              {/* Executive Overview Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 font-medium">Portfolio Health Score</span>
                    {data.overallHealthScore >= 70 ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="text-2xl font-black text-white">
                    {data.overallHealthScore} / 100
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {data.overallHealthScore >= 70 ? 'Healthy collection rate' : 'Escalation recommended'}
                  </p>
                </div>

                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 font-medium">Total At Risk</span>
                    <DollarSign className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-rose-400">
                    ${data.totalAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Outstanding active receivables
                  </p>
                </div>

                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 font-medium">High Risk Accounts</span>
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-300">
                    {data.analyzedInvoices.filter(i => i.riskLevel === 'high').length}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Require proactive intervention
                  </p>
                </div>
              </div>

              {/* Executive Summary Narrative */}
              <div className={`p-4 border rounded-xl ${
                isLight
                  ? 'bg-purple-50/90 border-purple-200'
                  : 'bg-gradient-to-r from-purple-950/40 via-slate-800/50 to-indigo-950/40 border-purple-800/40'
              }`}>
                <div className={`flex items-center gap-2 mb-1.5 text-xs font-bold ${
                  isLight ? 'text-purple-900' : 'text-purple-300'
                }`}>
                  <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-purple-700' : 'text-purple-400'}`} />
                  <span>AI Executive Briefing</span>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-800 font-medium' : 'text-slate-200'}`}>
                  {data.executiveSummary}
                </p>
              </div>

              {/* Account-by-Account Forecast Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Account Breakdown & Recommended Action Plan
                </h4>

                <div className="space-y-2.5">
                  {data.analyzedInvoices.map((item) => {
                    const fullInvoice = invoices.find(i => i.id === item.invoiceId);
                    const isHigh = item.riskLevel === 'high';
                    const isMedium = item.riskLevel === 'medium';

                    return (
                      <div 
                        key={item.invoiceId}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isHigh 
                            ? 'bg-rose-950/20 border-rose-800/50' 
                            : isMedium 
                            ? 'bg-amber-950/20 border-amber-800/40' 
                            : 'bg-slate-800/40 border-slate-700/60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">
                              {item.invoiceNumber}
                            </span>
                            <span className="text-xs text-slate-300 font-medium">
                              &bull; {item.clientName}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isHigh
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : isMedium
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            }`}>
                              Risk: {item.riskScore}/100 ({item.riskLevel.toUpperCase()})
                            </span>
                          </div>

                          <div className="text-sm font-bold text-white font-mono">
                            ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div className="text-xs text-slate-300 mb-3 flex items-start gap-1.5">
                          <span className={`font-semibold shrink-0 ${isLight ? 'text-indigo-800' : 'text-indigo-400'}`}>Tactical Move:</span>
                          <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{item.recommendation}</span>
                        </div>

                        {fullInvoice && (
                          <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-800/60">
                            <button
                              onClick={() => {
                                onClose();
                                onOpenExcuseAssistant?.(fullInvoice);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                            >
                              <MessageSquareQuote className="w-3 h-3 text-amber-400" />
                              <span>Delay Helper</span>
                            </button>

                            <button
                              onClick={() => {
                                onClose();
                                if (onOpenReminder) {
                                  onOpenReminder(fullInvoice);
                                } else if (onChaseInvoice) {
                                  onChaseInvoice(fullInvoice);
                                }
                              }}
                              className="px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Chase</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Real-time cashflow risk intelligence
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Radar
          </button>
        </div>

      </div>
    </div>
  );
};
