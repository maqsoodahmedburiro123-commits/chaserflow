import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Invoice } from '../../types/chaserflow';
import { 
  X, 
  FileSpreadsheet, 
  UploadCloud, 
  DownloadCloud, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileText,
  Lock,
  Layers
} from 'lucide-react';
import { 
  createGoogleSpreadsheetWithInvoices, 
  listGoogleSpreadsheets, 
  syncInvoicesToSpreadsheet, 
  importInvoicesFromSpreadsheet, 
  GoogleSpreadsheetItem 
} from '../../lib/sheetsService';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  currentUser: User | null;
  cachedAccessToken: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onImportInvoices: (newInvoices: Invoice[]) => void;
  isSigningIn?: boolean;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  invoices,
  currentUser,
  cachedAccessToken,
  onSignIn,
  onSignOut,
  onImportInvoices,
  isSigningIn
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'sync' | 'import'>('export');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Export states
  const [exportTitle, setExportTitle] = useState(`ChaserFlow Invoices - ${new Date().toISOString().split('T')[0]}`);
  const [createdSheet, setCreatedSheet] = useState<{ id: string; url: string } | null>(null);

  // Sync / Import states
  const [recentSheets, setRecentSheets] = useState<GoogleSpreadsheetItem[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [customSheetInput, setCustomSheetInput] = useState<string>('');
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);

  // Destructive Action Confirmation Dialog State (MANDATORY per Workspace guidelines)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'sync' | 'import';
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'sync'
  });

  // Fetch recent spreadsheets when user is signed in
  useEffect(() => {
    if (isOpen && currentUser && cachedAccessToken) {
      loadSpreadsheetsList();
    }
  }, [isOpen, currentUser, cachedAccessToken]);

  const loadSpreadsheetsList = async () => {
    if (!cachedAccessToken) return;
    setIsLoadingSheets(true);
    setErrorMsg(null);
    try {
      const sheets = await listGoogleSpreadsheets(cachedAccessToken);
      setRecentSheets(sheets);
      if (sheets.length > 0 && !selectedSheetId) {
        setSelectedSheetId(sheets[0].id);
      }
    } catch (err: any) {
      console.warn('Error listing spreadsheets:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  if (!isOpen) return null;

  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    // Check if input is a full Google Sheets URL
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  const getEffectiveSheetId = (): string => {
    if (customSheetInput.trim()) {
      return extractSpreadsheetId(customSheetInput);
    }
    return selectedSheetId;
  };

  // Handler for exporting to a new sheet
  const handleExportNewSheet = async () => {
    if (!cachedAccessToken) {
      setErrorMsg('Please sign in with Google to create spreadsheets.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await createGoogleSpreadsheetWithInvoices(
        cachedAccessToken,
        invoices,
        exportTitle
      );
      setCreatedSheet({
        id: result.spreadsheetId,
        url: result.spreadsheetUrl
      });
      setSuccessMsg(`Successfully created Google Sheet with ${invoices.length} invoices!`);
      // Refresh list of sheets
      loadSpreadsheetsList();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to export invoices to Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger confirmation dialog for sync
  const requestSyncConfirmation = () => {
    const sheetId = getEffectiveSheetId();
    if (!sheetId) {
      setErrorMsg('Please choose an existing Google Sheet or enter a Sheet URL/ID.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Update Google Sheet Content?',
      description: `This will overwrite the contents of the target spreadsheet with your current ${invoices.length} ChaserFlow invoices. With permission, changes will be written directly to your Google Sheet.`,
      actionType: 'sync'
    });
  };

  // Trigger confirmation dialog for import
  const requestImportConfirmation = () => {
    const sheetId = getEffectiveSheetId();
    if (!sheetId) {
      setErrorMsg('Please choose an existing Google Sheet or enter a Sheet URL/ID.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Import Invoices from Google Sheet?',
      description: 'This will read the spreadsheet rows and add them into your ChaserFlow dashboard, automatically matching due dates, amounts, and contact details.',
      actionType: 'import'
    });
  };

  // Execute confirmed operation
  const executeConfirmedAction = async () => {
    const sheetId = getEffectiveSheetId();
    const action = confirmDialog.actionType;
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));

    if (!cachedAccessToken) {
      setErrorMsg('Authentication token expired. Please sign in again.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (action === 'sync') {
        await syncInvoicesToSpreadsheet(cachedAccessToken, sheetId, invoices);
        setSuccessMsg(`Google Sheet updated successfully with ${invoices.length} invoices.`);
      } else if (action === 'import') {
        const imported = await importInvoicesFromSpreadsheet(cachedAccessToken, sheetId);
        onImportInvoices(imported);
        setSuccessMsg(`Successfully imported ${imported.length} invoices from Google Sheets!`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed. Check sheet permissions and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Google Sheets Integration
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  Live 2-Way Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Export client invoicing data, sync updates, and import receivables directly with Google Drive
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

        {/* Auth Section Banner */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {currentUser ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'Google Account'} 
                    className="w-8 h-8 rounded-full border border-emerald-500/30 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-300 flex items-center justify-center text-xs font-bold">
                    {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {currentUser.displayName || currentUser.email}
                    </span>
                    <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[240px] sm:max-w-xs">
                    {currentUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="text-xs text-slate-400 hover:text-rose-300 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-rose-900/50 bg-slate-900 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-slate-300">
                  Connect your Google Account with permission to create and sync Sheets.
                </p>
              </div>
              {/* Official Google Sign-In Material Button */}
              <button 
                onClick={onSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 text-xs font-semibold rounded-lg shadow-sm transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <RefreshCw className="w-4 h-4 text-slate-700 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                )}
                <span>{isSigningIn ? 'Signing In...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications / Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{successMsg}</span>
              {createdSheet && (
                <div className="mt-2">
                  <a
                    href={createdSheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-slate-950 rounded-lg font-bold text-xs hover:bg-emerald-400 transition-colors shadow-sm"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Create & Export Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'sync'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Existing Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Import Invoices</span>
          </button>
        </div>

        {/* Body content based on tab */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-200 mb-1">Export Active Invoices</h4>
                <p className="text-xs text-slate-400">
                  Generates a formatted Google Spreadsheet containing your {invoices.length} invoices with amounts, due dates, reminder counters, and payment links.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Spreadsheet Title
                </label>
                <input
                  type="text"
                  value={exportTitle}
                  onChange={(e) => setExportTitle(e.target.value)}
                  placeholder="e.g. ChaserFlow Invoices - Q3"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-400">
                  Total payload: <span className="text-white font-semibold">{invoices.length} invoice rows</span>
                </div>
                <button
                  id="create-export-sheet-btn"
                  onClick={handleExportNewSheet}
                  disabled={isLoading || !currentUser}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating in Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Create & Export to Google Sheets</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {(activeTab === 'sync' || activeTab === 'import') && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-200 mb-1">
                  {activeTab === 'sync' ? 'Sync Over Existing Spreadsheet' : 'Import Invoices into ChaserFlow'}
                </h4>
                <p className="text-xs text-slate-400">
                  {activeTab === 'sync' 
                    ? 'Select an existing spreadsheet from your Google Drive to update it with your latest invoices.'
                    : 'Choose a spreadsheet to parse its invoice rows (invoice #, client, amount, due date) directly into your dashboard.'}
                </p>
              </div>

              {/* Sheet Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Select from Recent Google Drive Sheets
                  </label>
                  {cachedAccessToken && (
                    <button
                      onClick={loadSpreadsheetsList}
                      disabled={isLoadingSheets}
                      className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                      Refresh list
                    </button>
                  )}
                </div>

                {isLoadingSheets ? (
                  <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Loading files from Google Drive...</span>
                  </div>
                ) : recentSheets.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {recentSheets.map((sh) => (
                      <button
                        key={sh.id}
                        type="button"
                        onClick={() => {
                          setSelectedSheetId(sh.id);
                          setCustomSheetInput('');
                        }}
                        className={`text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                          selectedSheetId === sh.id && !customSheetInput
                            ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-xs font-medium truncate">{sh.name}</span>
                        </div>
                        {sh.modifiedTime && (
                          <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                            {new Date(sh.modifiedTime).toLocaleDateString()}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800">
                    {currentUser ? 'No recent spreadsheets found in Google Drive.' : 'Sign in with Google to view your spreadsheets.'}
                  </div>
                )}
              </div>

              {/* Or paste Custom URL / ID */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Or Paste Google Sheet URL / Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={customSheetInput}
                  onChange={(e) => setCustomSheetInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5... or ID"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Button with Confirmation Guard */}
              <div className="flex items-center justify-between pt-3">
                <div className="text-xs text-slate-400">
                  Target Sheet: <span className="text-emerald-400 font-mono text-[11px]">{getEffectiveSheetId() ? `${getEffectiveSheetId().substring(0, 16)}...` : 'None selected'}</span>
                </div>
                {activeTab === 'sync' ? (
                  <button
                    id="sync-existing-sheet-btn"
                    onClick={requestSyncConfirmation}
                    disabled={isLoading || !currentUser || !getEffectiveSheetId()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync to Sheet</span>
                  </button>
                ) : (
                  <button
                    id="import-sheet-btn"
                    onClick={requestImportConfirmation}
                    disabled={isLoading || !currentUser || !getEffectiveSheetId()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>Import Invoices</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Confirmation Dialog (MANDATORY per Workspace Destructive Operations Guidelines) */}
        {confirmDialog.isOpen && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {confirmDialog.title}
                  </h3>
                  <span className="text-[11px] text-amber-300 font-medium">
                    User Confirmation Required
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {confirmDialog.description}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedAction}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-all shadow-md cursor-pointer"
                >
                  Confirm & Proceed
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
