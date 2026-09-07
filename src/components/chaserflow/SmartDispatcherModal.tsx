import React, { useState } from 'react';
import { Invoice, ChaserSettings } from '../../types/chaserflow';
import { calculateNextDispatchSlot } from '../../lib/smartDispatcher';
import { 
  X, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Sliders, 
  Send,
  Zap,
  Coffee
} from 'lucide-react';

interface SmartDispatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  settings: ChaserSettings;
  onUpdateSettings: (newSettings: Partial<ChaserSettings>) => void;
  onTriggerInstantDispatch?: (invoice: Invoice) => void;
}

export const SmartDispatcherModal: React.FC<SmartDispatcherModalProps> = ({
  isOpen,
  onClose,
  invoices,
  settings,
  onUpdateSettings,
  onTriggerInstantDispatch
}) => {
  const [workingHoursOnly, setWorkingHoursOnly] = useState(settings.dispatchWorkingHoursOnly ?? true);
  const [skipWeekends, setSkipWeekends] = useState(settings.skipWeekends ?? true);
  const [sweetSpotTime, setSweetSpotTime] = useState(settings.preferredSweetSpotTime ?? '10:00 AM');

  if (!isOpen) return null;

  const activeInvoices = invoices.filter(i => i.status !== 'paid' && !i.remindersPaused);

  const handleSavePreferences = () => {
    onUpdateSettings({
      dispatchWorkingHoursOnly: workingHoursOnly,
      skipWeekends,
      preferredSweetSpotTime: sweetSpotTime
    });
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
                Smart Timing & Working Hours Dispatcher
                <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full">
                  High-Conversion Timing
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ensure reminders deliver during client working hours & high-conversion inbox sweet spots
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

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Dispatcher Configuration Controls */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Working Hours & Delivery Window Guardrails</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Working Hours Only */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workingHoursOnly}
                  onChange={(e) => {
                    setWorkingHoursOnly(e.target.checked);
                    onUpdateSettings({ dispatchWorkingHoursOnly: e.target.checked });
                  }}
                  className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Business Hours Only</span>
                  <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                    Restrict dispatch between 09:00 AM – 05:00 PM.
                  </span>
                </div>
              </label>

              {/* Weekend Shield */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipWeekends}
                  onChange={(e) => {
                    setSkipWeekends(e.target.checked);
                    onUpdateSettings({ skipWeekends: e.target.checked });
                  }}
                  className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Weekend Shield</span>
                  <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                    Never email on Saturday/Sunday; roll to Monday morning.
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
                <span>Next Automated Dispatch Schedule ({activeInvoices.length} Queued)</span>
              </h3>
              <span className="text-[11px] text-slate-500">Benchmark: Tuesday/Thursday yields +34% clearance</span>
            </div>

            {activeInvoices.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
                All active invoices are either settled or paused. No reminders currently queued!
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeInvoices.map((inv) => {
                  const recommendation = calculateNextDispatchSlot(inv, {
                    ...settings,
                    preferredSweetSpotTime: sweetSpotTime,
                    skipWeekends
                  });

                  return (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-white">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-xs text-slate-300 font-medium">
                            {inv.clientName}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            (${inv.amount.toLocaleString()})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{recommendation.formattedTarget}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                            Stage: {recommendation.cadenceStage.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic">
                          "{recommendation.reason}"
                        </p>
                      </div>

                      {onTriggerInstantDispatch && (
                        <button
                          onClick={() => onTriggerInstantDispatch(inv)}
                          className="self-end sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shrink-0 cursor-pointer"
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

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            Automatic cron respects weekend shields & timing guards
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
