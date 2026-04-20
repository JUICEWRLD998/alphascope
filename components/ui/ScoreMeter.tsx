import { getScoreTextColor, getScoreBarColor, getScoreLabel } from '@/lib/utils';

type ScoreMeterSize = 'sm' | 'md' | 'lg';

interface ScoreMeterProps {
  score: number;        // 0–100
  size?: ScoreMeterSize;
  showLabel?: boolean;
}

const TRACK_H: Record<ScoreMeterSize, string> = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

const NUM_SIZE: Record<ScoreMeterSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export default function ScoreMeter({
  score,
  size = 'md',
  showLabel = true,
}: ScoreMeterProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const textColor = getScoreTextColor(clamped);
  const barColor  = getScoreBarColor(clamped);
  const label     = getScoreLabel(clamped);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className={[NUM_SIZE[size], textColor, 'font-bold font-mono tabular-nums'].join(' ')}>
            {clamped}
          </span>
          <span className={['text-[10px] font-semibold tracking-widest', textColor].join(' ')}>
            {label}
          </span>
        </div>
      )}
      <div className={['w-full bg-space-700 rounded-full overflow-hidden', TRACK_H[size]].join(' ')}>
        <div
          className={['h-full rounded-full transition-[width] duration-500', barColor].join(' ')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
