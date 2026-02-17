'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { CoachTradeTabs } from '@/components/coach-trade-tabs';

export default function GuidePage() {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Header - wrapped card to match page content pattern */}
      <div className="px-2 pt-2 shrink-0">
        <header className="rounded-lg border border-border card-glass">
          <div className="grid grid-cols-3 items-center gap-3 px-3 py-2">
          <div className="min-w-0 flex justify-start">
            <h1 className="text-lg font-semibold">Gamma Guide</h1>
          </div>

          <CoachTradeTabs />
          
          <div className="flex items-center gap-2 min-w-0 justify-end">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-background/50">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-monad animate-pulse' : 'bg-muted'}`} />
              <span className="text-xs uppercase w-11 text-center inline-block">{isActive ? 'Active' : 'Ready'}</span>
            </div>
          </div>
        </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row gap-2 p-2">
          {/* Left Column - Abstract voice interface */}
          <div className="flex-1 lg:flex-[0.45] flex flex-col gap-2">
            <div className="flex-1 relative rounded-2xl overflow-hidden flex items-center justify-center min-h-[320px]">
              {/* Ambient background: subtle radial highlight at center */}
              <div
                className={`absolute inset-0 rounded-2xl transition-opacity duration-700 ${
                  isActive ? 'opacity-100' : 'opacity-70'
                } bg-[radial-gradient(ellipse_80%_70%_at_50%_40%,hsl(var(--foreground)/0.07),transparent_55%)]`}
              />
              <div
                className={`absolute inset-0 card-glass transition-opacity duration-500 ${
                  isActive ? 'opacity-90' : 'opacity-100'
                }`}
              />
              <div
                className={`absolute inset-0 rounded-2xl voice-panel-monad-glow transition-opacity duration-700 ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Concentric rings - ripple effect */}
              <div className="absolute flex items-center justify-center">
                <div className={`absolute w-20 h-20 rounded-full border border-foreground/10 transition-all duration-500 ${isActive ? 'border-monad/20 animate-voice-ring' : ''}`} />
                <div className={`absolute w-28 h-28 rounded-full border border-foreground/10 transition-all duration-500 ${isActive ? 'border-monad/20 animate-voice-ring [animation-delay:150ms]' : ''}`} />
                <div className={`absolute w-36 h-36 rounded-full border border-foreground/10 transition-all duration-500 ${isActive ? 'border-monad/20 animate-voice-ring [animation-delay:300ms]' : ''}`} />
                <div className={`absolute w-44 h-44 rounded-full border border-foreground/10 transition-all duration-500 ${isActive ? 'border-monad/20 animate-voice-ring [animation-delay:450ms]' : ''}`} />
              </div>

              {/* Outer glow + center orb */}
              <div className="absolute flex items-center justify-center">
                <div
                  className={`absolute w-[180px] h-[180px] rounded-full blur-3xl transition-all duration-700 ${
                    isActive ? 'bg-monad/30 animate-voice-glow scale-110' : 'bg-foreground/[0.04]'
                  }`}
                />
                <div
                  className={`absolute w-[100px] h-[100px] rounded-full blur-xl transition-all duration-500 ${
                    isActive ? 'bg-monad/25' : 'bg-foreground/[0.06]'
                  }`}
                />
                <div
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-inner ${
                    isActive
                      ? 'bg-card/90 ring-2 ring-monad/40 ring-offset-2 ring-offset-card shadow-[inset_0_0_20px_rgba(96,66,230,0.15)]'
                      : 'bg-card/80 border border-border/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]'
                  }`}
                >
                  <span
                    className={`text-3xl font-extralight tracking-wider text-foreground/90 select-none transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-80'
                    }`}
                  >
                    {isActive ? '···' : '○'}
                  </span>
                </div>
              </div>

              <div className="relative z-10 text-center px-6 pt-36">
                <p className="text-lg tracking-tight text-foreground/90 font-light max-w-xs mx-auto mb-8">
                  {isActive ? 'Listening on Monad' : 'Speak. Get clarity.'}
                </p>
                <Button
                  size="lg"
                  variant={isActive ? 'destructive' : 'primarySubtle'}
                  onClick={() => setIsActive(!isActive)}
                  className={
                    isActive
                      ? 'rounded-full px-10 py-6 text-sm font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60 transition-colors'
                      : 'rounded-full px-10 py-6 text-sm font-medium'
                  }
                >
                  {isActive ? 'End' : 'Begin'}
                </Button>
                <span className="mt-8 inline-block px-3 py-1.5 rounded-full border border-monad/30 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  On Monad
                </span>
              </div>
            </div>
          </div>

          {/* Right Column - Transcript & Context */}
          <div className="flex-1 lg:flex-[0.55] flex flex-col gap-2">
            <div className="rounded-lg border border-border/60 card-glass p-3">
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                Context
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Asset</span>
                  <p className="mt-0.5">ETH-USD</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Strategy</span>
                  <p className="mt-0.5">Call Spread</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 rounded-lg border border-border/60 card-glass p-3 flex items-center justify-center min-h-[120px]">
              <div className="text-center text-muted-foreground">
                <p className="text-sm font-light">Transcript appears here</p>
                <p className="text-[10px] mt-1.5 uppercase tracking-wider opacity-70">Start to begin</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - wrapped card to match page content pattern */}
      <div className="px-2 pb-2 shrink-0">
        <footer className="rounded-lg border border-border card-glass px-3 py-2 w-full">
          <div className="w-full flex items-center justify-between">
            <p className="text-xs text-muted-foreground">© Monad Blitz Denver</p>
            <ThemeToggle />
          </div>
        </footer>
      </div>
    </div>
  );
}
