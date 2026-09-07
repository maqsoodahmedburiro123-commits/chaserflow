import React, { useState } from 'react';
import { CadenceStage, EmailTone, ChaserSettings } from '../../types/chaserflow';
import { DEFAULT_CADENCE_STAGES } from '../../data/defaultInvoices';
import { 
  X, 
  GitMerge, 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  RotateCcw, 
  Sliders, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface CadenceBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChaserSettings;
  onSaveCadence: (newCadence: CadenceStage[]) => void;
}

export const CadenceBuilderModal: React.FC<CadenceBuilderModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveCadence
}) => {
  const [stages, setStages] = useState<CadenceStage[]>(() => {
    return settings.cadenceStages && settings.cadenceStages.length > 0
      ? JSON.parse(JSON.stringify(settings.cadenceStages))
      : JSON.parse(JSON.stringify(DEFAULT_CADENCE_STAGES));
  });

  const [activeStageId, setActiveStageId] = useState<string>(stages[0]?.id || 'cadence-1');

  if (!isOpen) return null;

  const handleToggleStage = (id: string) => {
    setStages(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleUpdateOffset = (id: string, newOffset: number) => {
    setStages(prev =>
      prev.map(s => (s.id === id ? { ...s, offsetDays: newOffset } : s))
    );
  };

  const handleUpdateTone = (id: string, tone: EmailTone) => {
    setStages(prev =>
      prev.map(s => (s.id === id ? { ...s, tone } : s))
    );
  };

  const handleUpdatePrefix = (id: string, prefix: string) => {
    setStages(prev =>
      prev.map(s => (s.id === id ? { ...s, subjectPrefix: prefix } : s))
    );
  };

  const handleResetDefaults = () => {
    setStages(JSON.parse(JSON.stringify(DEFAULT_CADENCE_STAGES)));
  };

  const handleSave = () => {
    onSaveCadence(stages);
    onClose();
  };

  const activeStage = stages.find(s => s.id === activeStageId) || stages[0];

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
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Escalation Cadence Sequence Builder
                <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                  Automated Progression
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Design custom multi-stage reminder schedules with timing offsets, tone escalation, and late fee clauses
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

        {/* Cadence Timeline View */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Sequence Timeline Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Configured Automated Sequence Stages ({stages.filter(s => s.enabled).length} Active)</span>
              <button
                onClick={handleResetDefaults}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {stages.map((stage, idx) => {
                const isSelected = activeStage?.id === stage.id;
                const offsetLabel =
                  stage.offsetDays < 0
                    ? `${Math.abs(stage.offsetDays)} Days Before Due`
                    : stage.offsetDays === 0
                    ? 'On Due Date'
                    : `${stage.offsetDays} Days Overdue`;

                return (
                  <div
                    key={stage.id}
                    onClick={() => setActiveStageId(stage.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/70 shadow-md'
                        : stage.enabled
                        ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/20 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-cyan-400 shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{stage.name}</span>
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800/60">
                            {offsetLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{stage.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className="text-[10px] font-mono font-medium text-slate-400 capitalize px-2 py-0.5 bg-slate-900 rounded-lg border border-slate-800">
                        {stage.tone.replace('_', ' ')}
                      </span>

                      {/* Enable / Disable Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStage(stage.id);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                          stage.enabled
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {stage.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Stage Configurator */}
          {activeStage && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Configure Stage: {activeStage.name}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">ID: {activeStage.id}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Offset Days */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Timing Offset (Days)
                  </label>
                  <input
                    type="number"
                    value={activeStage.offsetDays}
                    onChange={(e) => handleUpdateOffset(activeStage.id, parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Use negative (e.g. -3) for advance, positive for overdue.
                  </span>
                </div>

                {/* Email Tone */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Stage Email Tone
                  </label>
                  <select
                    value={activeStage.tone}
                    onChange={(e) => handleUpdateTone(activeStage.id, e.target.value as EmailTone)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="casual_polite">Casual & Polite</option>
                    <option value="professional">Professional</option>
                    <option value="assertive_firm">Assertive & Firm</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Gradually escalates firmness.
                  </span>
                </div>

                {/* Custom Subject Prefix */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Subject Prefix
                  </label>
                  <input
                    type="text"
                    value={activeStage.subjectPrefix || ''}
                    onChange={(e) => handleUpdatePrefix(activeStage.id, e.target.value)}
                    placeholder="e.g. Friendly Heads-up"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Appears in email subject line.
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Automated cron simulator will cycle through these active sequence steps.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Save & Apply Cadence
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
