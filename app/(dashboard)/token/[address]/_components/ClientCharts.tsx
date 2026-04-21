'use client';

import dynamic from 'next/dynamic';

export const OHLCVChart = dynamic(() => import('@/components/ui/OHLCVChart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[390px] items-center justify-center rounded-xl border border-space-700 bg-space-900">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
    </div>
  ),
});
