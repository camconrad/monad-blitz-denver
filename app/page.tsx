'use client';

import { useRouter } from 'next/navigation';
import { Mic, CandlestickChart } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12 safe-x safe-y">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-w-2xl w-full">
        {/* Guide */}
        <button
          onClick={() => router.push('/guide')}
          className="group flex flex-col justify-between text-left rounded-2xl border-2 border-border card-glass p-5 sm:p-6 md:p-8 transition-all duration-200 hover:border-monad hover:ring-2 hover:ring-monad/25 hover:ring-offset-2 hover:ring-offset-background hover:shadow-[0_8px_32px_rgb(96_66_230/0.15)] hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monad focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[200px] sm:min-h-[220px] md:min-h-[240px]"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
            <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <div className="mt-4 sm:mt-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 [text-wrap:balance]">Gamma Guide</h2>
            <p className="text-sm text-muted-foreground [text-wrap:balance] line-clamp-2">
              Smart guide for options. Ask in plain English, receive proactive consultation and execution ideas.
            </p>
          </div>
        </button>

        {/* Trade */}
        <button
          onClick={() => router.push('/trade')}
          className="group flex flex-col justify-between text-left rounded-2xl border-2 border-border card-glass p-5 sm:p-6 md:p-8 transition-all duration-200 hover:border-monad hover:ring-2 hover:ring-monad/25 hover:ring-offset-2 hover:ring-offset-background hover:shadow-[0_8px_32px_rgb(96_66_230/0.15)] hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monad focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[200px] sm:min-h-[220px] md:min-h-[240px]"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
            <CandlestickChart className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <div className="mt-4 sm:mt-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 [text-wrap:balance]">Options Trading</h2>
            <p className="text-sm text-muted-foreground [text-wrap:balance] line-clamp-2">
              European vanilla calls and puts. Live data, Greeks, and execution in one place.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
