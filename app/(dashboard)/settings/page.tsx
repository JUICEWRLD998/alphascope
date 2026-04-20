'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Key,
  Palette,
  Database,
  Info,
  Sun,
  Moon,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME, SUPPORTED_CHAINS } from '@/lib/constants';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-space-600 bg-space-900">
      <div className="flex items-center gap-3 border-b border-space-700 px-5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500/10">
          <Icon className="h-4 w-4 text-accent-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Save toast ───────────────────────────────────────────────────────────────

function SaveToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-success-500/30 bg-space-900 px-4 py-3 shadow-xl transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
      )}
    >
      <CheckCircle2 className="h-4 w-4 text-success-400" />
      <span className="text-sm text-slate-200">Preferences saved</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [chain, setChain] = useState('solana');
  const [interval, setIntervalVal] = useState('30');
  const [toast, setToast] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'unknown' | 'live' | 'missing'>('unknown');

  // Hydration guard
  useEffect(() => {
    setMounted(true);
    // Load saved prefs from localStorage
    const savedChain = localStorage.getItem('alphaScope_chain');
    const savedInterval = localStorage.getItem('alphaScope_interval');
    if (savedChain) setChain(savedChain);
    if (savedInterval) setIntervalVal(savedInterval);

    // Check API key status via a lightweight ping
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setApiKeyStatus(data?.apiKey === true ? 'live' : 'missing');
      })
      .catch(() => {
        // If no health endpoint, determine from window env hint
        setApiKeyStatus('unknown');
      });
  }, []);

  function handleSave() {
    localStorage.setItem('alphaScope_chain', chain);
    localStorage.setItem('alphaScope_interval', interval);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  const isDark = !mounted || resolvedTheme === 'dark';

  return (
    <>
      <SaveToast visible={toast} />

      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-xl font-bold text-slate-100">Settings</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Configure your API keys, data preferences, and appearance.
          </p>
        </div>

        {/* ── API Configuration ─────────────────────────────────────────────── */}
        <Section icon={Key} title="API Configuration" subtitle="Birdeye API key and connectivity status">

          {/* Status */}
          <Row
            label="API Status"
            description="Connection to the Birdeye data feed"
          >
            {apiKeyStatus === 'live' ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-success-500/30 bg-success-500/10 px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success-400" />
                <span className="text-xs font-semibold text-success-400">Live</span>
              </div>
            ) : apiKeyStatus === 'missing' ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-1.5">
                <XCircle className="h-3.5 w-3.5 text-danger-400" />
                <span className="text-xs font-semibold text-danger-400">Key missing</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-space-600 bg-space-800 px-3 py-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-warning-400" />
                <span className="text-xs text-slate-400">Checking…</span>
              </div>
            )}
          </Row>

          <div className="h-px w-full bg-space-700" />

          {/* API key hint */}
          <Row
            label="API Key"
            description="Stored securely in your server environment — never exposed to the browser"
          >
            <code className="rounded-lg border border-space-600 bg-space-800 px-3 py-1.5 font-mono text-xs text-slate-400">
              BIRDEYE_API_KEY
            </code>
          </Row>

          <div className="mt-4 rounded-lg border border-accent-500/20 bg-accent-500/5 p-4">
            <p className="text-xs font-semibold text-accent-400">How to update your API key</p>
            <ol className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li>1. Open <code className="rounded bg-space-700 px-1 py-0.5 text-slate-300">.env.local</code> in your project root</li>
              <li>2. Set <code className="rounded bg-space-700 px-1 py-0.5 text-slate-300">BIRDEYE_API_KEY=your_key_here</code></li>
              <li>3. Restart the Next.js dev server — changes take effect immediately</li>
            </ol>
            <a
              href="https://birdeye.so/user-settings"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent-400 underline underline-offset-2 hover:text-accent-300"
            >
              Get your Birdeye API key →
            </a>
          </div>
        </Section>

        {/* ── Data Preferences ─────────────────────────────────────────────────── */}
        <Section icon={Database} title="Data Preferences" subtitle="Customize how {APP_NAME} fetches and displays data">

          <Row
            label="Default Chain"
            description="The blockchain to analyze by default across all pages"
          >
            <div className="relative">
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="appearance-none cursor-pointer rounded-lg border border-space-600 bg-space-800 py-2 pl-3 pr-8 text-sm text-slate-200 focus:border-accent-500/60 focus:outline-none transition-colors"
              >
                {SUPPORTED_CHAINS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            </div>
          </Row>

          <div className="h-px w-full bg-space-700" />

          <Row
            label="Data Refresh Interval"
            description="How often live data panels refresh (in seconds)"
          >
            <div className="relative">
              <select
                value={interval}
                onChange={(e) => setIntervalVal(e.target.value)}
                className="appearance-none cursor-pointer rounded-lg border border-space-600 bg-space-800 py-2 pl-3 pr-8 text-sm text-slate-200 focus:border-accent-500/60 focus:outline-none transition-colors"
              >
                <option value="15">Every 15 s</option>
                <option value="30">Every 30 s</option>
                <option value="60">Every 60 s</option>
                <option value="300">Every 5 min</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            </div>
          </Row>

          {/* Save button */}
          <div className="mt-5 flex justify-end border-t border-space-700 pt-4">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg border border-accent-500/30 bg-accent-500/10 px-4 py-2 text-sm font-semibold text-accent-400 transition-all duration-150 hover:border-accent-500/60 hover:bg-accent-500/20 active:scale-95"
            >
              <Save className="h-3.5 w-3.5" />
              Save Preferences
            </button>
          </div>
        </Section>

        {/* ── Appearance ─────────────────────────────────────────────────────── */}
        <Section icon={Palette} title="Appearance" subtitle="Theme and visual settings">

          <Row
            label="Color Theme"
            description="Switch between dark and light mode"
          >
            <div className="flex items-center gap-2 rounded-xl border border-space-600 bg-space-800 p-1">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                  isDark
                    ? 'bg-space-600 text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                  !isDark
                    ? 'bg-space-600 text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
            </div>
          </Row>
        </Section>

        {/* ── About ────────────────────────────────────────────────────────────── */}
        <Section icon={Info} title="About AlphaScope" subtitle="Version, attribution, and data sources">

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-space-700 bg-space-800/50 px-4 py-3">
              <span className="text-xs text-slate-500">Application</span>
              <span className="text-xs font-semibold text-slate-200">{APP_NAME}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-space-700 bg-space-800/50 px-4 py-3">
              <span className="text-xs text-slate-500">Version</span>
              <span className="font-mono text-xs text-slate-200">1.0.0</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-space-700 bg-space-800/50 px-4 py-3">
              <span className="text-xs text-slate-500">Framework</span>
              <span className="text-xs font-semibold text-slate-200">Next.js 15 App Router</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-space-700 bg-space-800/50 px-4 py-3">
              <span className="text-xs text-slate-500">Data Provider</span>
              <a
                href="https://birdeye.so"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-accent-400 underline underline-offset-2 hover:text-accent-300"
              >
                Birdeye API
              </a>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-space-700 bg-space-800/50 px-4 py-3">
              <span className="text-xs text-slate-500">Chain Support</span>
              <span className="text-xs font-semibold text-slate-200">Solana · Ethereum · BSC · Base</span>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-600">
            AlphaScope is an independent analytics tool. Market data is sourced from Birdeye and should not be
            construed as financial advice. Always do your own research.
          </p>
        </Section>

      </div>
    </>
  );
}
