/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CloudUpload, Cloud, X, Loader2, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface GoogleSyncBannerProps {
  shouldOffer: boolean;
  isConnected: boolean;
  connectedEmail: string | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onDismiss: () => void;
}

/**
 * Local-first is the default for every visitor (no login required to use
 * ChaserFlow at all). This strip only ever does one of two things:
 *  - once someone has accumulated a handful of real invoices, gently offers
 *    to back them up to their Google account so they survive a cache clear
 *    or a switch to a new device/browser
 *  - once connected, shows a small, unobtrusive "synced" indicator
 * It never blocks the dashboard and can always be dismissed.
 */
export const GoogleSyncBanner: React.FC<GoogleSyncBannerProps> = ({
  shouldOffer,
  isConnected,
  connectedEmail,
  isConnecting,
  onConnect,
  onDisconnect,
  onDismiss,
}) => {
  const { isLight } = useTheme();

  if (isConnected) {
    return (
      <div className={`border-b ${isLight ? 'border-slate-200 bg-emerald-50' : 'border-slate-800 bg-emerald-950/40'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className={`flex items-center gap-2 text-xs sm:text-sm font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
            <Cloud className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Backed up to {connectedEmail || 'your Google account'}
            </span>
          </div>
          <button
            type="button"
            onClick={onDisconnect}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  if (!shouldOffer) return null;

  return (
    <div className={`border-b ${isLight ? 'border-amber-200 bg-amber-50' : 'border-amber-900/60 bg-amber-950/30'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className={`flex items-center gap-2.5 text-xs sm:text-sm font-semibold ${isLight ? 'text-amber-800' : 'text-amber-200'}`}>
          <CloudUpload className="w-4 h-4 shrink-0" />
          <span>
            Your invoices are only saved on this device right now — connect Google so they survive a cache clear.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onConnect}
            disabled={isConnecting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-70 text-slate-950 transition-all cursor-pointer"
          >
            {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
            Connect Google
          </button>
          <button
            type="button"
            onClick={onDismiss}
            title="Not now"
            className={`p-1.5 rounded-lg cursor-pointer ${
              isLight ? 'text-amber-700/70 hover:bg-amber-100' : 'text-amber-300/70 hover:bg-amber-900/40'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
