import React, { useState, useMemo } from 'react';
import { Invoice, ChaserSettings, EmailDiagnosticIssue, AutomatedCheckResult } from '../../types/chaserflow';
import { 
  calculateNextDispatchSlot, 
  diagnoseInvoiceEmails, 
  executeAutomatedEmailCheck,
  isWeekend,
  isWithinWorkingHours 
} from '../../lib/smartDispatcher';
import { useTheme } from '../../context/ThemeContext';
import { 
  X, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Sparkles, 
  Sliders, 
  Send,
  Zap,
  Coffee,
  ShieldCheck,
  Activity,
  RefreshCw,
  MailWarning,
  Check,
  ExternalLink
} from 'lucide-react';

interface SmartDispatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  settings: ChaserSettings;
  onUpdateSettings: (newSettings: Partial<ChaserSettings>) => void;
  onTriggerInstantDispatch?: (invoice: Invoice) => void;
  onTriggerDispatchNow?: (invoice: Invoice) => void;
  onAutomatedCheckComplete?: (result: AutomatedCheckResult) => void;
}

export const SmartDispatcherModal: React.FC<SmartDispatcherModalProps> = ({
  isOpen,
  onClose,
  invoices,
  settings,
  onUpdateSettings,
  onTriggerInstantDispatch,
  onTriggerDispatchNow,
  onAutomatedCheckComplete
}) => {
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<'queue' | 'diagnostics'>('queue');
  const [workingHoursOnly, setWorkingHoursOnly] = useState(settings.dispatchWorkingHoursOnly ?? true);
  const [skipWeekends, setSkipWeekends] = useState(settings.skipWeekends ?? true);
  const [sweetSpotTime, setSweetSpotTime] = useState(settings.preferredSweetSpotTime ?? '10:00 AM');

  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<AutomatedCheckResult | null>(null);

  const handleInstantDispatch = onTriggerInstantDispatch || onTriggerDispatchNow;

  const activeInvoices = useMemo(() => {
    return invoices.filter(i => i.status !== 'paid' && !i.remindersPaused);
  }, [invoices]);

  const diagnosticIssues = useMemo(() => {
    return diagnoseInvoiceEmails(invoices, {
      ...settings,
      dispatchWorkingHoursOnly: workingHoursOnly,
      skipWeekends
    });
  }, [invoices, settings, workingHoursOnly, skipWeekends]);

  const errorCount = diagnosticIssues.filter(i => i.type === 'error').length;
  const warningCount = diagnosticIssues.filter(i => i.type === 'warning').length;

  const now = new Date();
  const weekendNow = isWeekend(now);
  const withinHours = isWithinWorkingHours(now, settings.workHoursStart || '09:00', settings.workHoursEnd || '17:00');

  if (!isOpen) return null;

  const handleRunScanNow = () => {
    setIsRunningCheck(true);
    setTimeout(() => {
      const result = executeAutomatedEmailCheck(invoices, {
        ...settings,
        dispatchWorkingHoursOnly: workingHoursOnly,
        skipWeekends,
        preferredSweetSpotTime: sweetSpotTime
      });
      setCheckResult(result);
      setIsRunningCheck(false);
      if (onAutomatedCheckComplete) {
        onAutomatedCheckComplete(result);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Automated Email Dispatcher & Health Monitor
                {errorCount > 0 ? (
                  <span className="text-[10px] font-semibold text-rose-300 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errorCount} Email Error{errorCount === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Engine Healthy
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Working hours timing rules, automated cadence queue, and delivery error diagnostics
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

        {/* Tab Selection */}
        <div className="flex items-center border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Scheduled Pipeline ({activeInvoices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'diagnostics'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Email Health & Error Diagnostics</span>
            {errorCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {errorCount}
              </span>
            )}
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Tab 1: Queue & Timing Schedule */}
          {activeTab === 'queue' && (
            <>
              {/* Dispatcher Configuration Controls */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Working Hours & Delivery Window Guardrails</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {skipWeekends && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        weekendNow
                          ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        Weekend Shield: {weekendNow ? 'Active (Holding)' : 'Standby (Weekday)'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Working Hours Only */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={workingHoursOnly}
                      onChange={(e) => {
                        setWorkingHoursOnly(e.target.checked);
                        onUpdateSettings({ dispatchWorkingHoursOnly: e.target.checked });
                      }}
                      className="mt-0.5 rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Business Hours Only</span>
                      <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                        Restrict dispatch between 09:00 AM – 05:00 PM.
                      </span>
                    </div>
                  </label>

                  {/* Weekend Shield */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={skipWeekends}
                      onChange={(e) => {
                        setSkipWeekends(e.target.checked);
                        onUpdateSettings({ skipWeekends: e.target.checked });
                      }}
                      className="mt-0.5 rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Weekend Shield</span>
                      <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                        Never email on Sat/Sun; automatically rolls to Monday.
                      </span>
                    </div>
                  </label>

                  {/* Sweet Spot Preferred Time */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-xs font-bold text-white block">Optimal Delivery Time</span>
                    <select
                      value={sweetSpotTime}
                      onChange={(e) => {
                        setSweetSpotTime(e.target.value);
                        onUpdateSettings({ preferredSweetSpotTime: e.target.value });
                      }}
                      className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg text-xs text-white px-2 py-1 focus:outline-none focus:border-amber-500"
                    >
                      <option value="09:30 AM">09:30 AM (Start of Business)</option>
                      <option value="10:00 AM">10:00 AM (Benchmark Winner)</option>
                      <option value="11:30 AM">11:30 AM (Pre-Lunch Check)</option>
                      <option value="02:00 PM">02:00 PM (Afternoon Review)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Scheduled Dispatch Pipeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Automated Dispatch Queue ({activeInvoices.length} Active Accounts)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Rate-limited to 1 reminder/day per client</span>
                </div>

                {activeInvoices.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
                    All active invoices are either settled or paused. No reminders currently queued.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeInvoices.map((inv) => {
                      const recommendation = calculateNextDispatchSlot(inv, {
                        ...settings,
                        preferredSweetSpotTime: sweetSpotTime,
                        skipWeekends
                      });

                      const hasEmailError = !inv.clientEmail || !inv.clientEmail.includes('@');

                      return (
                        <div
                          key={inv.id}
                          className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-white">
                                {inv.invoiceNumber}
                              </span>
                              <span className="text-xs text-slate-300 font-medium">
                                {inv.clientName}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">
                                (${inv.amount.toLocaleString()})
                              </span>
                              {hasEmailError ? (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-1.5 py-0.2 rounded flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  Invalid Email Address
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {inv.clientEmail}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium flex-wrap">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span>{recommendation.formattedTarget}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                                Next Stage: {recommendation.cadenceStage.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 italic">
                              "{recommendation.reason}"
                            </p>
                          </div>

                          {handleInstantDispatch && (
                            <button
                              onClick={() => handleInstantDispatch(inv)}
                              className="self-end sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shrink-0 cursor-pointer"
                              title="Preview and dispatch email immediately"
                            >
                              <Send className="w-3 h-3 text-cyan-400" />
                              <span>Dispatch Now</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tab 2: Email Health & Diagnostics */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              
              {/* Quick Health Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-5 h-5 ${errorCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <h3 className="text-sm font-bold text-white">
                      {errorCount === 0 ? 'All Client Email Channels Verified' : `${errorCount} Delivery Issue${errorCount === 1 ? '' : 's'} Detected`}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {errorCount === 0 
                      ? 'All active recipient emails match valid syntax. No delivery blocks found.'
                      : 'Some recipient email addresses are malformed or missing, which will cause automated reminders to fail.'}
                  </p>
                </div>

                <button
                  onClick={handleRunScanNow}
                  disabled={isRunningCheck}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-950/50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningCheck ? 'animate-spin' : ''}`} />
                  <span>{isRunningCheck ? 'Scanning...' : 'Run Automated Scan Now'}</span>
                </button>
              </div>

              {/* Scan Results Output (if run) */}
              {checkResult && (
                <div className={`p-4 rounded-xl border animate-fadeIn ${
                  checkResult.errorCount > 0 
                    ? 'bg-rose-950/30 border-rose-800 text-rose-200' 
                    : 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    {checkResult.errorCount > 0 ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>{checkResult.summaryMessage}</span>
                  </div>
                  <div className="text-[11px] opacity-80 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                    <div>Dispatched: {checkResult.dispatchedCount}</div>
                    <div>Held (Shields): {checkResult.heldCount}</div>
                    <div>Skipped (Today): {checkResult.skippedCount}</div>
                    <div>Errors: {checkResult.errorCount}</div>
                  </div>
                </div>
              )}

              {/* Issues List */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-300">
                  Diagnostic Breakdown ({diagnosticIssues.length} findings across {invoices.length} invoices)
                </div>

                {diagnosticIssues.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-950/50 border border-slate-800 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-white mb-0.5">Zero Email Delivery Errors</p>
                    <p className="text-[11px] text-slate-400">All invoices have valid email addresses, checkout links, and active cadence settings.</p>
                  </div>
                ) : (
                  diagnosticIssues.map((issue, idx) => (
                    <div
                      key={`${issue.invoiceId}-${idx}`}
                      className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                        issue.type === 'error'
                          ? 'bg-rose-950/20 border-rose-800/80'
                          : issue.type === 'warning'
                          ? 'bg-amber-950/20 border-amber-800/60'
                          : 'bg-slate-950/40 border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            issue.type === 'error'
                              ? 'bg-rose-900 text-rose-200'
                              : issue.type === 'warning'
                              ? 'bg-amber-900 text-amber-200'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {issue.type}
                          </span>
                          <span className="font-mono text-xs font-bold text-white">
                            {issue.invoiceNumber}
                          </span>
                          <span className="text-xs text-slate-300">
                            {issue.clientName}
                          </span>
                        </div>
                        <div className={`text-xs font-medium ${
                          issue.type === 'error' ? 'text-rose-300' : issue.type === 'warning' ? 'text-amber-300' : 'text-slate-300'
                        }`}>
                          {issue.message}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span className="font-semibold text-slate-300">Fix:</span> {issue.resolutionHint}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Delivery Guardrails Status */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Active Email Deliverability Protections
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span><strong>Email Syntax Verification:</strong> Checks for valid RFC 5322 format before attempting dispatch.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span><strong>Duplicate Suppression:</strong> Strict 1-email-per-day rate limit prevents annoying client inboxes.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span><strong>Weekend & Working Hours Shield:</strong> Defers reminders outside 09:00 AM – 05:00 PM or on weekends.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span><strong>Payment Halted:</strong> Automatically suppresses all future follow-ups the moment an invoice is paid.</span>
                  </li>
                </ul>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            Automatic cron respects weekend shields & timing guards
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
