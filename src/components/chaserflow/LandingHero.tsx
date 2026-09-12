/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Zap,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Mail,
  Loader2,
  Sparkles,
  Radar,
  ListChecks,
  Send,
  Building2,
  CreditCard,
  FileSpreadsheet,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DASHBOARD_ANCHOR_ID = 'dashboard-demo';

function scrollToDashboard() {
  document.getElementById(DASHBOARD_ANCHOR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const INTEGRATIONS: { label: string; icon: React.ElementType }[] = [
  { label: 'QuickBooks Online', icon: Building2 },
  { label: 'Xero', icon: Building2 },
  { label: 'FreshBooks', icon: FileSpreadsheet },
  { label: 'Stripe & PayPal links', icon: CreditCard },
  { label: 'Google Sheets sync', icon: FileSpreadsheet },
];

const CAPABILITY_CHIPS: { label: string; icon: React.ElementType }[] = [
  { label: '6-stage escalation cadence', icon: ListChecks },
  { label: 'AI Cashflow Risk Radar', icon: Radar },
  { label: '1-click PDF invoices', icon: Send },
];

const HOW_IT_WORKS: { step: string; title: string; description: string; icon: React.ElementType }[] = [
  {
    step: '01',
    title: 'Add your invoices',
    description: 'Enter them by hand, import a CSV, or sync directly from a Google Sheet — takes under a minute.',
    icon: FileSpreadsheet,
  },
  {
    step: '02',
    title: 'Set your chase cadence',
    description: 'Pick your escalation schedule and let the AI Risk Radar flag which clients are likely to pay late.',
    icon: Radar,
  },
  {
    step: '03',
    title: 'Let ChaserFlow chase',
    description: 'Polite, automatically-escalating reminders go out on schedule while you get back to billable work.',
    icon: Zap,
  },
];

export const LandingHero: React.FC = () => {
  const { isLight, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'invalid'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setStatus('invalid');
      return;
    }
    setStatus('submitting');
    // Loaded on demand: the Firebase SDK is only needed at the moment someone
    // actually submits an email, so it must never be part of the landing
    // page's own initial bundle (it would otherwise be pulled in just for
    // this form existing on the page, even for visitors who never submit it).
    const { saveLeadToFirestore } = await import('../../lib/firebase');
    await saveLeadToFirestore(trimmed, 'landing_hero');
    setStatus('done');
    window.setTimeout(scrollToDashboard, 900);
  };

  return (
    <div
      id="landing-top"
      className={`border-b transition-colors duration-150 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0b0f17] border-slate-800'
      }`}
    >
      {/* Slim marketing nav */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <a href="#landing-top" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 shrink-0">
            <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
          </div>
          <span className={`text-base font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            ChaserFlow
          </span>
        </a>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="#how-it-works" className={isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}>
            How it works
          </a>
          <a href="#trust-bar" className={isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}>
            Integrations
          </a>
          <button
            type="button"
            onClick={scrollToDashboard}
            className={isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}
          >
            Live demo
          </button>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isLight ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700' : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('landing-email-input')?.focus()}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
          >
            Get Early Access
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-14 sm:pt-14 sm:pb-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border mb-5 ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/90 border-emerald-800/80 text-emerald-300'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            AI Cashflow Risk Radar Included
          </span>

          <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Get paid faster — without the awkward email chasing.
          </h1>

          <p className={`text-base sm:text-lg leading-relaxed mb-8 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            ChaserFlow sends polite, automatically-escalating payment reminders and flags which
            clients are likely to pay late with an AI risk score — so overdue invoices get chased
            consistently, and you don't have to.
          </p>

          {/* Lead capture */}
          <form onSubmit={handleSubmit} className="max-w-md">
            {status === 'done' ? (
              <div
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${
                  isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/60 border-emerald-800/70 text-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-sm font-semibold">
                  You're on the list! Taking you to the live demo below…
                </span>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                    <input
                      id="landing-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === 'invalid') setStatus('idle');
                      }}
                      placeholder="you@youragency.com"
                      className={`w-full pl-10 pr-3.5 py-3 rounded-xl text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                        status === 'invalid'
                          ? 'border-rose-500 focus:border-rose-500'
                          : isLight
                          ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
                          : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-70 text-slate-950 shadow-md shadow-emerald-950/30 transition-all cursor-pointer whitespace-nowrap"
                  >
                    {status === 'submitting' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Get Early Access
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                {status === 'invalid' && (
                  <p className="text-xs font-medium text-rose-400 mt-2">Enter a valid email address to continue.</p>
                )}
                <p className={`text-xs mt-2.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  Free to use right now. No credit card, no account required.
                </p>
              </>
            )}
          </form>

          <button
            type="button"
            onClick={scrollToDashboard}
            className={`inline-flex items-center gap-1.5 mt-5 text-sm font-semibold cursor-pointer ${
              isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            Or skip ahead and explore the live demo
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Capability preview card */}
        <div
          className={`rounded-3xl border p-6 sm:p-8 shadow-2xl ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/60' : 'bg-slate-900/80 border-slate-800 shadow-slate-950/60'
          }`}
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              What's inside
            </span>
          </div>
          <ul className="space-y-4">
            {CAPABILITY_CHIPS.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-950/70 text-emerald-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{label}</span>
              </li>
            ))}
          </ul>
          <div className={`mt-6 pt-6 border-t text-sm ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-500'}`}>
            Every feature below is live in the interactive demo — no sandbox, no mockups.
          </div>
        </div>
      </div>

      {/* Trust / integration bar */}
      <div id="trust-bar" className={`border-t ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/60'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <p className={`text-center text-xs font-bold uppercase tracking-wider mb-5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            Built to slot into the tools freelancers &amp; agencies already use
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {INTEGRATIONS.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold border ${
                  isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5 opacity-70" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            How ChaserFlow works
          </h2>
          <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>
            Three steps between you and invoices that chase themselves.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
          {HOW_IT_WORKS.map(({ step, title, description, icon: Icon }) => (
            <div
              key={step}
              className={`relative rounded-2xl border p-6 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-800'}`}
            >
              <span className={`text-4xl font-extrabold ${isLight ? 'text-slate-100' : 'text-slate-800'}`}>{step}</span>
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center -mt-6 mb-4 ${
                  isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-950/70 text-emerald-300'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
              <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hand-off strip into the live dashboard */}
      <div id={DASHBOARD_ANCHOR_ID} className={`border-t ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950/40'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/90 border-emerald-800/80 text-emerald-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live interactive demo
          </span>
          <span className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            Sample invoices below — explore freely, no signup required.
          </span>
        </div>
      </div>
    </div>
  );
};
