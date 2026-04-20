import Link from 'next/link';
import { ArrowRight, BarChart2, Shield, Zap, TrendingUp, Activity, Eye } from 'lucide-react';

// ─── Reusable primitive ───────────────────────────────────────────────────────

function GlowOrb({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-3xl ${className ?? ''}`}
    />
  );
}

// ─── Fake score bar (demo mockup) ─────────────────────────────────────────────

function MockScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-right text-[10px] text-slate-500">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-slate-800/60 h-1.5">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-6 shrink-0 font-mono text-[10px] text-slate-400">{score}</span>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-colors hover:border-cyan-500/20 hover:bg-cyan-500/[0.04]">
      {/* Subtle hover glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(6,182,212,0.06) 0%, transparent 70%)' }} />
      <div className="relative">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
          {icon}
        </div>
        <h3 className="mb-2 text-base font-semibold text-slate-100">{title}</h3>
        <p className="text-sm leading-relaxed text-slate-400">{description}</p>
      </div>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-8">
      <span className="font-mono text-3xl font-bold text-cyan-300 tabular-nums">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

// ─── Verdict badge (static mock) ─────────────────────────────────────────────

function MockVerdictBadge({ verdict }: { verdict: 'BUY' | 'WATCH' | 'AVOID' }) {
  const styles = {
    BUY:   'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20',
    WATCH: 'bg-amber-500/15   text-amber-300   ring-amber-500/20',
    AVOID: 'bg-red-500/15     text-red-300     ring-red-500/20',
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ${styles[verdict]}`}>
      {verdict}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#060910] text-slate-100">

      {/* ═══════════════════════════════════════ NAV ═══════════════════════ */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.04] bg-[#060910]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
              <Activity className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-100">AlphaScope</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-400 sm:flex">
            <a href="#features" className="transition-colors hover:text-slate-100">Features</a>
            <a href="#demo"     className="transition-colors hover:text-slate-100">Demo</a>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-400 active:scale-95"
          >
            Launch App <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════ HERO ══════════════════════ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-20 pt-32 text-center">

        {/* Ambient glow */}
        <GlowOrb className="left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 bg-cyan-500/10" />
        <GlowOrb className="left-1/4  top-2/3  h-[400px] w-[400px] bg-violet-500/8" />
        <GlowOrb className="right-1/4 top-1/2  h-[350px] w-[350px] bg-cyan-400/6" />

        {/* Badge */}
        <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-xs font-medium text-cyan-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          Powered by Birdeye · Real-time Solana data
        </div>

        {/* Headline */}
        <h1 className="relative mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight text-slate-50 sm:text-6xl lg:text-7xl">
          Detect{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #22d3ee 0%, #67e8f9 40%, #a5f3fc 100%)' }}
          >
            winning tokens
          </span>
          {' '}before they trend
        </h1>

        {/* Sub */}
        <p className="relative mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
          AlphaScope fuses real-time Birdeye data, an 5-axis risk scoring engine,
          and Gemini AI to surface high-signal tokens the moment they emerge.
        </p>

        {/* CTAs */}
        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 hover:shadow-cyan-400/30 active:scale-95"
          >
            Launch Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#demo"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-300 transition-all hover:border-white/20 hover:bg-white/10"
          >
            <Eye className="h-4 w-4" /> View Demo
          </a>
        </div>

        {/* Scroll nudge */}
        <div className="relative mt-20 h-px w-24 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </section>

      {/* ═══════════════════════════════════════ STATS ═════════════════════ */}
      <section className="relative border-y border-white/[0.04] bg-white/[0.02] py-12">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex flex-wrap items-center justify-center divide-x divide-white/[0.06]">
            <StatPill value="5k+"   label="Tokens analyzed daily" />
            <StatPill value="4"     label="Chains supported" />
            <StatPill value="5-axis" label="Scoring dimensions" />
            <StatPill value="<1s"   label="Signal latency" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FEATURES ══════════════════ */}
      <section id="features" className="relative py-24 px-6">
        <GlowOrb className="right-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 bg-violet-500/6" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-500">Platform</p>
            <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">Everything you need to find alpha</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">
              Three tightly integrated modules that cover the full token research loop — discovery, analysis, and decision.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Smart Token Radar"
              description="Monitors thousands of new token launches across all supported chains and surfaces only those that pass baseline liquidity and holder thresholds. No noise, just signal."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="5-Axis Risk Scoring"
              description="Every token is scored across Risk, Opportunity, Momentum, Liquidity, and Security. Composite verdict (BUY / WATCH / AVOID) is generated in under 10 ms with full signal attribution."
            />
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Breakout Detection"
              description="Three independent algorithms — volume surge, price spike, and rank climber — flag tokens entering explosive momentum phases before they appear on popular lists."
            />
            <FeatureCard
              icon={<Activity className="h-5 w-5" />}
              title="Live Birdeye Data"
              description="Price, volume, liquidity, holder count, and 40+ other metrics streamed directly from Birdeye's public API with per-endpoint configurable revalidation intervals."
            />
            <FeatureCard
              icon={<BarChart2 className="h-5 w-5" />}
              title="Security Audit Panel"
              description="Automatically checks mint authority, freeze authority, LP burn status, metadata mutability, holder concentration, and Token-2022 transfer fees for every token."
            />
            <FeatureCard
              icon={<Eye className="h-5 w-5" />}
              title="Gemini AI Insights"
              description="Each token detail page gets a plain-English analysis generated by Gemini 1.5 Flash, synthesizing all scoring dimensions into a concise actionable paragraph."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ DEMO ══════════════════════ */}
      <section id="demo" className="relative py-24 px-6">
        <GlowOrb className="left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 bg-cyan-500/5" />
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-500">Live Preview</p>
            <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">Built for speed, depth, and clarity</h2>
          </div>

          {/* Browser chrome mockup */}
          <div
            className="overflow-hidden rounded-2xl border border-white/[0.07]"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px -20px rgba(0,0,0,0.6), 0 0 60px -10px rgba(6,182,212,0.08)' }}
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#0d1117] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/40" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/40" />
                <div className="h-3 w-3 rounded-full bg-green-500/40" />
              </div>
              <div className="mx-auto flex-1 max-w-sm rounded-md bg-white/5 px-3 py-1 text-center">
                <span className="text-[10px] text-slate-500">alphascope.vercel.app/dashboard</span>
              </div>
            </div>

            {/* Dashboard shell mockup */}
            <div className="flex bg-[#070b10]" style={{ minHeight: '420px' }}>
              {/* Sidebar strip */}
              <div className="hidden w-44 shrink-0 flex-col border-r border-white/[0.04] bg-[#0a0e14] p-4 sm:flex">
                <div className="mb-6 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-cyan-500/20" />
                  <div className="h-2 w-16 rounded-full bg-slate-700" />
                </div>
                {['Dashboard', 'Token Radar', 'Trending', 'Score Board'].map((item) => (
                  <div key={item} className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 ${item === 'Dashboard' ? 'bg-cyan-500/10' : ''}`}>
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                    <span className={`text-[10px] ${item === 'Dashboard' ? 'text-cyan-400' : 'text-slate-600'}`}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 overflow-hidden p-5">
                {/* Header row */}
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="mb-1 h-2 w-20 rounded-full bg-slate-100/80" />
                    <div className="h-1.5 w-32 rounded-full bg-slate-700" />
                  </div>
                  <div className="h-7 w-20 rounded-lg bg-white/5" />
                </div>

                {/* Stat cards row */}
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Volume 24h',  val: '$2.4M',  up: true  },
                    { label: 'Market Cap',  val: '$18.2M', up: false },
                    { label: 'Holders',     val: '1,240',  up: true  },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                      <div className="mb-2 text-[8px] text-slate-600">{c.label}</div>
                      <div className="mb-1 font-mono text-sm font-bold text-slate-200">{c.val}</div>
                      <div className={`text-[9px] font-mono ${c.up ? 'text-emerald-400' : 'text-red-400'}`}>
                        {c.up ? '+' : '-'}12.4% 24h
                      </div>
                    </div>
                  ))}
                </div>

                {/* Two-column lower area */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Token list */}
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-600">New Tokens</span>
                      <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[8px] text-cyan-400">LIVE</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: 'PEPE2048',  price: '$0.000042', verdict: 'BUY'   as const },
                        { name: 'SOLPUNK',   price: '$0.0218',   verdict: 'WATCH' as const },
                        { name: 'MOONCAT3',  price: '$0.00091',  verdict: 'BUY'   as const },
                        { name: 'SCAMCOIN',  price: '$0.000001', verdict: 'AVOID' as const },
                      ].map((t) => (
                        <div key={t.name} className="flex items-center justify-between">
                          <div>
                            <div className="text-[9px] font-semibold text-slate-300">{t.name}</div>
                            <div className="font-mono text-[9px] text-slate-600">{t.price}</div>
                          </div>
                          <MockVerdictBadge verdict={t.verdict} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Score panel */}
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="mb-3 text-[9px] font-semibold uppercase tracking-widest text-slate-600">Score Breakdown</div>
                    <div className="space-y-2">
                      <MockScoreBar label="Risk"        score={82} color="bg-emerald-500" />
                      <MockScoreBar label="Opportunity" score={74} color="bg-cyan-500"    />
                      <MockScoreBar label="Momentum"    score={91} color="bg-cyan-400"    />
                      <MockScoreBar label="Liquidity"   score={63} color="bg-amber-500"   />
                      <MockScoreBar label="Security"    score={55} color="bg-amber-400"   />
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-500/10 px-2 py-1.5">
                      <span className="text-[9px] font-semibold text-emerald-300">Overall</span>
                      <span className="font-mono text-sm font-bold text-emerald-300">76</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Caption */}
          <p className="mt-4 text-center text-xs text-slate-600">
            Actual dashboard UI — launch to see live Birdeye data.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════ CTA ═══════════════════════ */}
      <section className="relative overflow-hidden py-32 px-6">
        <GlowOrb className="left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 bg-cyan-500/8" />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-500">Get started</p>
          <h2 className="text-4xl font-bold leading-tight text-slate-50 sm:text-5xl">
            Stop chasing tokens.<br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #22d3ee 0%, #a5f3fc 100%)' }}
            >
              Start finding them.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-slate-400">
            The dashboard is live and free. Plug in a Birdeye API key and Gemini API key, then start
            surfacing real alpha from onchain data within minutes.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-500/20 transition-all hover:bg-cyan-400 hover:shadow-cyan-400/30 active:scale-95"
            >
              Open Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FOOTER ════════════════════ */}
      <footer className="border-t border-white/[0.04] bg-[#060910] py-10 px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
              <Activity className="h-3.5 w-3.5" />
            </span>
            AlphaScope
          </div>
          <p className="text-xs text-slate-600">
            Built with Next.js · Birdeye · Gemini AI · Tailwind CSS
          </p>
          <div className="flex gap-4 text-xs text-slate-600">
            <Link href="/dashboard" className="transition-colors hover:text-slate-400">Dashboard</Link>
            <Link href="/radar"     className="transition-colors hover:text-slate-400">Radar</Link>
            <Link href="/trending"  className="transition-colors hover:text-slate-400">Trending</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
