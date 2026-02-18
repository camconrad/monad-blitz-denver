'use client';

import { useRouter } from 'next/navigation';
import { Mic, CandlestickChart } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl w-full">
        {/* Guide */}
        <button
          onClick={() => router.push('/guide')}
          className="group flex flex-col justify-between text-left rounded-2xl border-2 border-border card-glass p-8 transition-all duration-200 hover:border-monad hover:ring-2 hover:ring-monad/25 hover:ring-offset-2 hover:ring-offset-background hover:shadow-[0_8px_32px_rgb(96_66_230/0.15)] hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monad focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[240px]"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Mic className="w-7 h-7 text-primary" />
          </div>
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2 [text-wrap:balance]">Gamma Guide</h2>
            <p className="text-sm text-muted-foreground [text-wrap:balance] line-clamp-2">
              Smart guide for options. Ask in plain English, receive proactive consultation and execution ideas.
            </p>
          </div>
        </button>

        {/* Trade */}
        <button
          onClick={() => router.push('/trade')}
          className="group flex flex-col justify-between text-left rounded-2xl border-2 border-border card-glass p-8 transition-all duration-200 hover:border-monad hover:ring-2 hover:ring-monad/25 hover:ring-offset-2 hover:ring-offset-background hover:shadow-[0_8px_32px_rgb(96_66_230/0.15)] hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monad focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[240px]"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <CandlestickChart className="w-7 h-7 text-primary" />
          </div>
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-2 [text-wrap:balance]">Options Trading</h2>
            <p className="text-sm text-muted-foreground [text-wrap:balance] line-clamp-2">
              European vanilla calls and puts. Live data, Greeks, and execution in one place.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
