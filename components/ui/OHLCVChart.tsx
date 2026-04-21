'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import type { OHLCVTimeframe } from '@/services/birdeye';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OHLCVCandle {
  unixTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OHLCVChartProps {
  address: string;
  symbol: string;
  chain?: string;
}

// ─── Timeframe config ─────────────────────────────────────────────────────────

const TIMEFRAMES: { label: string; value: OHLCVTimeframe }[] = [
  { label: '1m',  value: '1m'  },
  { label: '5m',  value: '5m'  },
  { label: '15m', value: '15m' },
  { label: '1H',  value: '1H'  },
  { label: '4H',  value: '4H'  },
  { label: '1D',  value: '1D'  },
  { label: '1W',  value: '1W'  },
];

// ─── Chart theme ──────────────────────────────────────────────────────────────

const CHART_COLORS = {
  background:   '#0b0f1a',
  grid:         '#1a2035',
  border:       '#1e2d45',
  text:         '#64748b',
  crosshair:    '#334155',
  upColor:      '#22d3ee',
  downColor:    '#f87171',
  wickUpColor:  '#22d3ee',
  wickDownColor:'#f87171',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function OHLCVChart({ address, symbol, chain = 'solana' }: OHLCVChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [timeframe, setTimeframe] = useState<OHLCVTimeframe>('1H');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [hovered, setHovered]     = useState<CandlestickData | null>(null);

  // ── Build / destroy chart ─────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: CHART_COLORS.crosshair, labelBackgroundColor: '#1e2d45' },
        horzLine: { color: CHART_COLORS.crosshair, labelBackgroundColor: '#1e2d45' },
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: CHART_COLORS.border },
      width:  containerRef.current.clientWidth,
      height: 340,
      handleScroll: true,
      handleScale:  true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor:          CHART_COLORS.upColor,
      downColor:        CHART_COLORS.downColor,
      borderUpColor:    CHART_COLORS.upColor,
      borderDownColor:  CHART_COLORS.downColor,
      wickUpColor:      CHART_COLORS.wickUpColor,
      wickDownColor:    CHART_COLORS.wickDownColor,
    });

    chartRef.current  = chart;
    seriesRef.current = series;

    // Subscribe to crosshair move for OHLC tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHovered(null);
        return;
      }
      const data = param.seriesData.get(series) as CandlestickData | undefined;
      setHovered(data ?? null);
    });

    // Responsive resize
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  }, []);

  // ── Fetch data ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!seriesRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/tokens/ohlcv?address=${address}&timeframe=${timeframe}&chain=${chain}`,
      );

      if (!res.ok) {
        setError('Failed to load chart data');
        setLoading(false);
        return;
      }

      const json = await res.json() as { items: OHLCVCandle[] };

      const candles: CandlestickData[] = json.items
        .filter((c) => c.open > 0 && c.close > 0)
        .map((c) => ({
          time:  c.unixTime as Time,
          open:  c.open,
          high:  c.high,
          low:   c.low,
          close: c.close,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));

      if (candles.length === 0) {
        setError('No chart data available for this token yet.');
        setLoading(false);
        return;
      }

      seriesRef.current.setData(candles);
      chartRef.current?.timeScale().fitContent();
    } catch {
      setError('Chart data unavailable');
    } finally {
      setLoading(false);
    }
  }, [address, timeframe, chain]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── OHLC tooltip values ───────────────────────────────────────────────────

  const fmt = (n: number) =>
    n < 0.0001
      ? n.toExponential(4)
      : n < 1
        ? n.toPrecision(5)
        : n.toLocaleString(undefined, { maximumFractionDigits: 4 });

  const isUp = hovered
    ? (hovered.close as number) >= (hovered.open as number)
    : true;

  return (
    <div className="overflow-hidden rounded-xl border border-space-700 bg-space-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-space-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">{symbol} / USD</span>
          {hovered && (
            <span className={cn('font-mono text-xs font-bold', isUp ? 'text-cyan-400' : 'text-red-400')}>
              O:{fmt(hovered.open as number)}
              {' '}H:{fmt(hovered.high as number)}
              {' '}L:{fmt(hovered.low as number)}
              {' '}C:{fmt(hovered.close as number)}
            </span>
          )}
        </div>

        {/* Timeframe tabs */}
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setTimeframe(tf.value)}
              className={cn(
                'rounded px-2 py-0.5 text-[11px] font-semibold transition-all',
                timeframe === tf.value
                  ? 'bg-accent-500/20 text-accent-400'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="relative">
        <div ref={containerRef} className="w-full" style={{ height: 340 }} />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-space-900/80">
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              <span className="text-xs text-slate-500">Loading chart…</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-slate-400">{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="mt-2 rounded-lg border border-space-600 bg-space-800 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
