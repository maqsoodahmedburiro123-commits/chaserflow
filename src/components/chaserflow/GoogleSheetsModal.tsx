import React, { useState, useMemo } from 'react';
import { Invoice } from '../../types/chaserflow';
import { 
  X, 
  FileSpreadsheet, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Copy,
  Check,
  Table,
  Building2,
  Filter,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { 
  exportInvoicesToCSV, 
  parseInvoicesFromCSV,
  generateAccountingCSV,
  ACCOUNTING_FORMAT_DETAILS,
  AccountingSoftwareFormat,
  filterInvoicesForExport
} from '../../lib/sheetsService';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  onImportInvoices: (newInvoices: Invoice[]) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  invoices,
  onImportInvoices,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [selectedFormat, setSelectedFormat] = useState<AccountingSoftwareFormat>('universal');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'overdue' | 'paid'>('all');
  const [customTitle, setCustomTitle] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Import state
  const [importText, setImportText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Generate real-time preview of the CSV based on current options
  const previewData = useMemo(() => {
    return generateAccountingCSV(invoices, {
      format: selectedFormat,
      statusFilter,
      customTitle: customTitle.trim() || undefined
    });
  }, [invoices, selectedFormat, statusFilter, customTitle]);

  if (!isOpen) return null;

  const handleDownloadCSV = () => {
    try {
      exportInvoicesToCSV(invoices, customTitle.trim() || undefined, {
        format: selectedFormat,
        statusFilter
      });
      setSuccessMsg(`Successfully downloaded ${previewData.fileName} (${previewData.rowsCount} invoices formatted for ${ACCOUNTING_FORMAT_DETAILS[selectedFormat].name}).`);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to export CSV');
    }
  };

  const handleCopyCSV = async () => {
    try {
      await navigator.clipboard.writeText(previewData.csvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setSuccessMsg('CSV content copied to clipboard! You can paste directly into Excel, Google Sheets, or web accounting tables.');
      setErrorMsg(null);
    } catch {
      setErrorMsg('Failed to copy to clipboard.');
    }
  };

  const handleImportText = () => {
    if (!importText.trim()) {
      setErrorMsg('Please paste CSV data or rows copied from Google Sheets / Excel.');
      return;
    }

    try {
      const parsed = parseInvoicesFromCSV(importText);
      if (parsed.length === 0) {
        setErrorMsg('No valid invoice records found in the pasted data.');
        return;
      }

      onImportInvoices(parsed);
      setSuccessMsg(`Successfully imported ${parsed.length} invoices into your dashboard!`);
      setErrorMsg(null);
      setImportText('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse CSV data. Check the column format.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setImportText(text);
        try {
          const parsed = parseInvoicesFromCSV(text);
          onImportInvoices(parsed);
          setSuccessMsg(`Successfully imported ${parsed.length} invoices from ${file.name}!`);
          setErrorMsg(null);
          setImportText('');
        } catch (err: any) {
          setErrorMsg(`Error reading ${file.name}: ${err.message}`);
        }
      }
    };
    reader.readAsText(file);
  };

  const activeFormatInfo = ACCOUNTING_FORMAT_DETAILS[selectedFormat];
  const unpaidCount = filterInvoicesForExport(invoices, 'unpaid').length;
  const overdueCount = filterInvoicesForExport(invoices, 'overdue').length;
  const paidCount = filterInvoicesForExport(invoices, 'paid').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Accounting &amp; Spreadsheet Hub
              </h3>
              <p className="text-xs text-slate-400">
                Export invoices to QuickBooks, Xero, FreshBooks, or Google Sheets with 1 click
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

        {/* Notifications / Alerts */}
        {errorMsg && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 sm:px-6 pt-3 gap-6">
          <button
            id="tab-export-accounting-csv"
            onClick={() => { setActiveTab('export'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Export CSV for Accounting Software</span>
          </button>

          <button
            id="tab-import-sheets"
            onClick={() => { setActiveTab('import'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV / Paste Spreadsheets</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: EXPORT TO CSV / ACCOUNTING SOFTWARE */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              
              {/* Target Software Format Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Target Accounting Software / CSV Profile
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(ACCOUNTING_FORMAT_DETAILS) as AccountingSoftwareFormat[]).map((fmtKey) => {
                    const fmt = ACCOUNTING_FORMAT_DETAILS[fmtKey];
                    const isSelected = selectedFormat === fmtKey;
                    return (
                      <button
                        key={fmtKey}
                        type="button"
                        onClick={() => setSelectedFormat(fmtKey)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/40 shadow-sm'
                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                            {fmt.name}
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                          {fmt.tagline}
                        </p>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Target: {fmt.software}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Filter & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Include Invoice Status
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer text-center ${
                        statusFilter === 'all'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All ({invoices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('unpaid')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer text-center ${
                        statusFilter === 'unpaid'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Unpaid ({unpaidCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('overdue')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer text-center ${
                        statusFilter === 'overdue'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Overdue ({overdueCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('paid')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer text-center ${
                        statusFilter === 'paid'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Paid ({paidCount})
                    </button>
                  </div>
                </div>

                {/* Custom File Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Custom File Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={`e.g. q3_invoices_${selectedFormat}`}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <span className="block text-[10px] text-slate-500 mt-1 truncate">
                    Output: <span className="font-mono text-slate-400">{previewData.fileName}</span>
                  </span>
                </div>

              </div>

              {/* Data Preview & Format Details */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Export Preview ({previewData.rowsCount} Invoices)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                    {previewData.headers.length} Columns Ready
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {activeFormatInfo.extensionHelp}
                </p>

                {/* Header Pills */}
                <div className="flex flex-wrap gap-1 pt-1 max-h-16 overflow-y-auto">
                  {previewData.headers.map((hdr, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-800/80 border border-slate-700 rounded text-[10px] text-slate-300 font-mono"
                    >
                      {hdr}
                    </span>
                  ))}
                </div>
              </div>

              {/* How to import tip */}
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-[11px] text-emerald-300/90 leading-relaxed space-y-1">
                <span className="font-bold block text-emerald-300">How to Import into Accounting Software:</span>
                <p>• <strong>QuickBooks Online</strong>: Gear icon &gt; Import Data &gt; Invoices &gt; Upload downloaded CSV.</p>
                <p>• <strong>Xero</strong>: Business &gt; Invoices &gt; Import &gt; Select this CSV file.</p>
                <p>• <strong>Google Sheets / Excel</strong>: File &gt; Import &gt; Upload to open as an interactive ledger.</p>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopyCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy CSV to Clipboard</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-download-accounting-csv"
                  onClick={handleDownloadCSV}
                  disabled={previewData.rowsCount === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Download {activeFormatInfo.name.split('/')[0]} CSV</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: IMPORT CSV */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-200 mb-1">
                  Import Invoices from Google Sheets or Excel
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Either drag &amp; drop an exported <span className="font-mono text-emerald-400">.csv</span> file, or copy rows from your spreadsheet and paste them directly into the box below.
                </p>
              </div>

              {/* Drag & Drop or Choose File */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              {/* Direct Paste Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Or Paste Spreadsheet Rows (CSV or Tab-Separated)
                  </label>
                  <span className="text-[10px] text-slate-500">Headers: Invoice #, Client Name, Amount, Due Date</span>
                </div>
                <textarea
                  rows={5}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Invoice #,Client Name,Company,Client Email,Amount,Currency,Due Date,Status\nINV-2026-001,Acme Corp,Acme Inc,billing@acme.com,3500,USD,2026-09-20,pending`}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  id="import-sheet-btn"
                  onClick={handleImportText}
                  disabled={!importText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Parse &amp; Import Invoices</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
