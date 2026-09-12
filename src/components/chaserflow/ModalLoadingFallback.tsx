/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Shown for the brief moment (usually <100ms on a warm cache, a few hundred ms
 * otherwise) while a code-split modal's JavaScript chunk is fetched on first
 * open. Keeping this fallback tiny and dependency-free means it never adds to
 * the very bundle-size problem the code-splitting is meant to solve.
 */
export const ModalLoadingFallback: React.FC = () => (
  <div
    className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
    role="status"
    aria-live="polite"
    aria-label="Loading"
  >
    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
      <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
      <span className="text-sm font-medium text-slate-200">Loading…</span>
    </div>
  </div>
);
