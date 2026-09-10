import React, { useState } from 'react';
import { Invoice, ChaserSettings } from '../../types/chaserflow';
import { useTheme } from '../../context/ThemeContext';
import { 
  X, 
  Building2, 
  Copy, 
  Check, 
  ShieldCheck, 
  FileText, 
  CreditCard,
  Send,
  HelpCircle,
  Landmark,
  ArrowRight
} from 'lucide-react';

interface PaymentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  settings: ChaserSettings;
}

export const PaymentInfoModal: React.FC<PaymentInfoModalProps> = ({
  isOpen,
  onClose,
  invoices,
  settings
}) => {
  const { isLight } = useTheme();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'wire_ach' | 'zelle_wise' | 'check' | 'all'>('wire_ach');

  if (!isOpen || invoices.length === 0) return null;

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const invoiceNumbers = invoices.map(i => i.invoiceNumber).join(', ');

  const bankName = settings.paymentDetails?.bankName || 'JPMorgan Chase Bank, N.A.';
  const accountName = settings.paymentDetails?.accountName || settings.businessName || 'Morgan Studio & Design LLC';
  const routingNumber = settings.paymentDetails?.routingNumber || '021000021';
  const accountNumber = settings.paymentDetails?.accountNumber || '••• 4821 9023';
  const swiftBic = settings.paymentDetails?.swiftBic || 'CHASUS33';
  const zelleTag = settings.paymentDetails?.zelleEmailOrPhone || settings.userEmail || 'billing@morganstudio.dev';
  const wiseTag = settings.paymentDetails?.wiseTagOrEmail || settings.userEmail || 'alex@morganstudio.dev';
  const checkPayable = settings.paymentDetails?.checkPayableTo || settings.businessName || 'Morgan Studio & Design LLC';
  const checkAddress = settings.paymentDetails?.checkMailingAddress || '100 Innovation Way, Suite 400, San Francisco, CA 94105';

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getFullRemittanceText = () => {
    return `PAYMENT REMITTANCE INFORMATION
Invoice(s): ${invoiceNumbers}
Total Amount: $${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
Payable To: ${accountName}

1. DIRECT BANK WIRE / ACH TRANSFER:
   Bank Name: ${bankName}
   Account Name: ${accountName}
   Routing Number (ACH / Wire): ${routingNumber}
   Account Number: ${accountNumber}
   SWIFT / BIC (International): ${swiftBic}
   Remittance Reference: ${invoiceNumbers}

2. ELECTRONIC DIRECT (ZELLE / WISE):
   Zelle: ${zelleTag}
   Wise: ${wiseTag}

3. CHECK BY MAIL:
   Make payable to: ${checkPayable}
   Mail to: ${checkAddress}

General Instructions:
${settings.paymentInstructions || 'Please reference invoice number with payment.'}

Contact: ${settings.userName} (${settings.userEmail})`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className={`border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Verified Payment Information & Options
              </h3>
              <p className="text-xs text-slate-400">
                Safe, scam-resistant remittance details for {invoices.length} selected {invoices.length === 1 ? 'invoice' : 'invoices'}.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Invoice Banner */}
        <div className={`px-5 py-3 border-b flex items-center justify-between text-xs ${
          isLight ? 'bg-emerald-50/60 border-emerald-100 text-emerald-950' : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200'
        }`}>
          <div>
            <span className="font-semibold">Invoices:</span>{' '}
            <span className="font-mono">{invoiceNumbers}</span>
          </div>
          <div className="font-bold text-sm font-mono">
            ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        </div>

        {/* Safe Payment Notice */}
        <div className={`px-5 py-2.5 border-b flex items-center gap-2 text-[11px] ${
          isLight ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-slate-800/40 border-slate-800 text-slate-400'
        }`}>
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Safe Invoicing Best Practice:</strong> Direct bank instructions protect clients from phishing & link hijacking.
          </span>
        </div>

        {/* Option Tabs */}
        <div className={`flex border-b px-5 pt-2 gap-2 text-xs font-semibold ${
          isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-900/50'
        }`}>
          {[
            { key: 'wire_ach', label: 'ACH / Bank Wire' },
            { key: 'zelle_wise', label: 'Zelle & Wise' },
            { key: 'check', label: 'Check / Mail' },
            { key: 'all', label: 'Full Remittance Text' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'border-emerald-500 text-emerald-500 font-bold'
                  : isLight 
                    ? 'border-transparent text-slate-500 hover:text-slate-800' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {activeTab === 'wire_ach' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Bank Remittance Fields</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getFullRemittanceText(), 'all_wire')}
                  className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 normal-case text-xs font-semibold cursor-pointer"
                >
                  {copiedField === 'all_wire' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'all_wire' ? 'Copied Full Wire Details' : 'Copy All Wire Details'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { label: 'Bank Name', val: bankName, key: 'bank' },
                  { label: 'Beneficiary / Account Name', val: accountName, key: 'acc_name' },
                  { label: 'Routing Transit Number (ABA)', val: routingNumber, key: 'routing' },
                  { label: 'Account Number', val: accountNumber, key: 'acc_num' },
                  { label: 'SWIFT / BIC (International Wire)', val: swiftBic, key: 'swift' },
                  { label: 'Remittance Reference / Memo', val: invoiceNumbers, key: 'ref' }
                ].map(field => (
                  <div 
                    key={field.key}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-800/60 border-slate-700/70'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{field.label}</div>
                      <div className={`text-xs font-mono font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {field.val}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(field.val, field.key)}
                      className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 cursor-pointer ${
                        copiedField === field.key 
                          ? 'bg-emerald-500 text-slate-950 font-bold' 
                          : isLight ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-700'
                      }`}
                      title={`Copy ${field.label}`}
                    >
                      {copiedField === field.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>

              {settings.paymentInstructions && (
                <div className={`p-3 rounded-xl border text-xs ${
                  isLight ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-900/40 text-amber-300'
                }`}>
                  <span className="font-bold">Remittance Note:</span> {settings.paymentInstructions}
                </div>
              )}
            </div>
          )}

          {activeTab === 'zelle_wise' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="text-xs text-slate-400">
                Instant peer-to-business electronic settlements without third-party portal logins:
              </div>

              <div className={`p-4 rounded-xl border ${
                isLight ? 'bg-purple-50/60 border-purple-200' : 'bg-purple-950/30 border-purple-900/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-xs text-purple-400 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    Zelle Registered Email / Phone
                  </div>
                  <button
                    onClick={() => copyToClipboard(zelleTag, 'zelle')}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedField === 'zelle' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedField === 'zelle' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className={`font-mono text-sm font-bold ${isLight ? 'text-purple-950' : 'text-white'}`}>
                  {zelleTag}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Recipient name: {accountName} &bull; Reference: {invoiceNumbers}
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${
                isLight ? 'bg-cyan-50/60 border-cyan-200' : 'bg-cyan-950/30 border-cyan-900/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-xs text-cyan-400 flex items-center gap-1.5">
                    <Send className="w-4 h-4" />
                    Wise Transfer Tag / Email
                  </div>
                  <button
                    onClick={() => copyToClipboard(wiseTag, 'wise')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedField === 'wise' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedField === 'wise' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className={`font-mono text-sm font-bold ${isLight ? 'text-cyan-950' : 'text-white'}`}>
                  {wiseTag}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Supports multi-currency settlement (USD, EUR, GBP, CAD)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'check' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="text-xs text-slate-400">
                Paper check and mail-in remittance information for accounts payable teams:
              </div>

              <div className={`p-4 rounded-xl border space-y-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/80'
              }`}>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Make Checks Payable To:</div>
                  <div className={`text-sm font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {checkPayable}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mailing Address:</div>
                  <div className={`text-xs font-medium mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    {checkAddress}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Memo Line:</div>
                  <div className="text-xs font-mono text-emerald-400 font-semibold mt-0.5">
                    Invoice {invoiceNumbers}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => copyToClipboard(`Make checks payable to: ${checkPayable}\nMail to: ${checkAddress}\nMemo: Invoice ${invoiceNumbers}`, 'check_all')}
                    className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedField === 'check_all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedField === 'check_all' ? 'Copied Check Remittance' : 'Copy Check Mailing Details'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'all' && (
            <div className="space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Ready-to-paste text block for email or messaging:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getFullRemittanceText(), 'all_text')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'all_text' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'all_text' ? 'Copied to Clipboard' : 'Copy All Text'}
                </button>
              </div>
              <textarea
                readOnly
                rows={10}
                value={getFullRemittanceText()}
                className={`w-full text-xs font-mono p-3 rounded-xl border leading-relaxed select-all ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-800' 
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`px-5 py-3.5 border-t flex items-center justify-between gap-3 shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="text-[11px] text-slate-400">
            {invoices.length} {invoices.length === 1 ? 'Invoice' : 'Invoices'} &bull; ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(getFullRemittanceText(), 'footer_copy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight 
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900' 
                  : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
              }`}
            >
              {copiedField === 'footer_copy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'footer_copy' ? 'Copied' : 'Copy Remittance'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isLight 
                  ? 'bg-slate-900 hover:bg-slate-800 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
