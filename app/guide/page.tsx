'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { WalletAvatar } from '@/components/wallet-avatar';
import { CoachTradeTabs } from '@/components/coach-trade-tabs';
import { createCoachBus } from '@/lib/voice-coach-bus';
import { createVoiceWsClient } from '@/lib/voice-ws-client';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexVoiceUrl, CONVEX_VOICE_API_PATH } from '@/lib/convex-voice';
import { getMockOptionsChain, formatExpiryShort } from '@/lib/options-chain';
import { useSpotPrices, ethSpot } from '@/lib/use-spot-prices';

function GuideContext() {
  const chain = useMemo(() => getMockOptionsChain(), []);
  const { prices, loading: pricesLoading, error: pricesError } = useSpotPrices();
  const spot = ethSpot(prices, chain.spot);
  const symbol = chain.symbol;
  const nearestExpiry = chain.expirations[0] ?? '';
  const callSpreadShort = 3200;
  const callSpreadLong = 3300;
  const maxLoss = 100;
  const maxGain = 100;
  const spotFormatted =
    spot > 0
      ? `$${spot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : (pricesLoading ? '…' : '—');

  const rows: { label: string; value: string; sub?: string }[] = [
    { label: 'Asset', value: symbol },
    {
      label: 'Spot',
      value: spotFormatted,
      sub: pricesError ? 'CoinGecko unavailable' : 'Live (CoinGecko)',
    },
    {
      label: 'Strategy',
      value: 'Call Spread',
      sub: `Buy ${callSpreadShort} call, sell ${callSpreadLong} call · Bullish, defined risk`,
    },
    {
      label: 'Expiry',
      value: formatExpiryShort(nearestExpiry),
      sub: nearestExpiry,
    },
    {
      label: 'Strikes',
      value: `${callSpreadShort} / ${callSpreadLong}`,
      sub: 'Short / Long (USD)',
    },
    {
      label: 'Risk',
      value: 'Defined',
      sub: `Max loss $${maxLoss} · Max gain $${maxGain} per contract`,
    },
    {
      label: 'Market',
      value: 'European vanilla options',
      sub: 'Exercise at expiry only',
    },
    {
      label: 'Settlement',
      value: 'Cash-settled',
      sub: 'USD (quote token) via Chainlink',
    },
    {
      label: 'Oracle',
      value: 'Chainlink',
      sub: 'ETH/USD price feed · Monad',
    },
    {
      label: 'Chain',
      value: 'Monad Testnet',
      sub: 'GammaGuide · European cash-settled',
    },
  ];

  const guideSummary = `${symbol} ${spotFormatted}, ${formatExpiryShort(nearestExpiry)} call spread ${callSpreadShort}/${callSpreadLong}, defined risk, cash-settled on Monad.`;

  return (
    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
      <p className="text-xs text-muted-foreground border-b border-border/60 pb-2">
        Context for guide: {guideSummary}
      </p>
      <div className="grid grid-cols-5 gap-x-4 gap-y-2 text-sm">
        {rows.map(({ label, value, sub }) => (
          <div key={label} className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
            <p className="mt-0.5 font-semibold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate" title={sub}>{sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GuidePage() {
  const wsUrl = process.env.NEXT_PUBLIC_VOICE_WS_URL ?? '';
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? '';
  const useConvex = !!convexUrl;

  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<Id<'voiceSessions'> | null>(null);
  const [transcript, setTranscript] = useState('');
  const [guideText, setGuideText] = useState('');
  const [lastError, setLastError] = useState<string | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const wsClientRef = useRef<ReturnType<typeof createVoiceWsClient> | null>(null);
  const busRef = useRef<ReturnType<typeof createCoachBus> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const createSession = useConvex ? useMutation(api.voice.createSession) : null;
  const session = useQuery(
    api.voice.getSession,
    useConvex && sessionId ? { sessionId } : 'skip'
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    busRef.current = createCoachBus();
    return () => {
      busRef.current = null;
    };
  }, []);

  const guideAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastGuideAudioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session) return;
    if (session.transcript !== undefined) setTranscript(session.transcript);
    if (session.coachText !== undefined) setGuideText(session.coachText);
    if (session.coachPartial !== undefined) setGuideText(session.coachPartial);
    if (session.error) setLastError(session.error);
    if (session.transcript ?? session.coachText ?? session.error) setProcessing(false);
  }, [session]);

  useEffect(() => {
    const url = session?.coachAudioUrl;
    if (!url || url === lastGuideAudioUrlRef.current) return;
    lastGuideAudioUrlRef.current = url;
    const audio = new Audio(url);
    guideAudioRef.current = audio;
    const onError = () => {
      lastGuideAudioUrlRef.current = null;
      guideAudioRef.current = null;
    };
    audio.addEventListener('error', onError);
    audio.play().catch(onError);
    return () => {
      audio.removeEventListener('error', onError);
      audio.pause();
      guideAudioRef.current = null;
    };
  }, [session?.coachAudioUrl]);

  async function startCapture() {
    if (typeof window === 'undefined') return;
    setLastError(undefined);
    setTranscript('');
    setGuideText('');

    if (useConvex && createSession) {
      try {
        const id = await createSession();
        setSessionId(id);
        audioChunksRef.current = [];
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            streamRef.current = stream;
            const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/ogg';
            const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 16000 });
            recorderRef.current = recorder;
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.start(250);
            setListening(true);
          })
          .catch(() => {
            setLastError('Microphone access denied');
          });
      } catch (e) {
        setLastError(e instanceof Error ? e.message : 'Failed to create session');
      }
      return;
    }

    if (!wsUrl) {
      setLastError('Set NEXT_PUBLIC_CONVEX_URL (recommended) or NEXT_PUBLIC_VOICE_WS_URL');
      return;
    }
    const client = createVoiceWsClient({
      url: wsUrl,
      callbacks: {
        onOpen: () => setListening(true),
        onClose: () => {
          setListening(false);
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          recorderRef.current = null;
        },
        onError: () => {
          setLastError('WebSocket connection failed');
          setListening(false);
        },
        onMessage: (data: unknown) => {
        const msg = data as { type?: string; text?: string; message?: string; [k: string]: unknown };
        const t = msg.text ?? '';
        switch (msg.type) {
          case 'transcript_partial':
            setTranscript((prev) => (prev ? prev.replace(/\s*$/, '') + (t ? ' ' + t : '') : t));
            busRef.current?.publish('coach.transcript.partial', { text: t });
            break;
          case 'transcript_final':
            setTranscript((prev) => (prev ? prev.replace(/\s*$/, '') + (t ? ' ' + t : '') : t));
            busRef.current?.publish('coach.transcript.final', { text: t });
            break;
          case 'coach_response_partial':
            setGuideText((prev) => (prev ? prev.replace(/\s*$/, '') + (t ? ' ' + t : '') : t));
            break;
          case 'coach_response_final':
            setGuideText((prev) => (prev ? prev.replace(/\s*$/, '') + (t ? ' ' + t : '') : t));
            break;
          case 'suggestion':
            busRef.current?.publish('coach.suggestion', msg);
            break;
          case 'risk_alert':
            busRef.current?.publish('coach.risk.alert', msg);
            break;
          case 'error':
            setLastError((msg.message as string) ?? 'Unknown error');
            break;
          default:
            break;
        }
        },
      },
    });
    wsClientRef.current = client;
    client.connect();
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/ogg';
        const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 16000 });
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && wsClientRef.current) {
            e.data.arrayBuffer().then((buf) => wsClientRef.current!.sendBinary(buf));
          }
        };
        recorder.start(250);
      })
      .catch(() => {
        setLastError('Microphone access denied');
        wsClientRef.current?.close();
      });
  }

  async function stopCapture() {
    if (useConvex && sessionId) {
      if (recorderRef.current?.state !== 'inactive') {
        recorderRef.current?.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setListening(false);
      const chunks = audioChunksRef.current;
      audioChunksRef.current = [];
      const baseUrl = getConvexVoiceUrl();
      setProcessing(true);
      if (baseUrl && chunks.length > 0) {
        const blob = new Blob(chunks);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64 = (reader.result as string)?.split(',')[1] ?? '';
          fetch(`${baseUrl}${CONVEX_VOICE_API_PATH}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, audioBase64: base64 }),
          }).catch(() => {
            setLastError('Failed to send audio');
            setProcessing(false);
          });
        };
      } else if (baseUrl) {
        fetch(`${baseUrl}${CONVEX_VOICE_API_PATH}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {
          setLastError('Failed to send request');
          setProcessing(false);
        });
      } else {
        setProcessing(false);
      }
      return;
    }

    if (recorderRef.current?.state !== 'inactive') {
      recorderRef.current?.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    wsClientRef.current?.close();
    wsClientRef.current = null;
    setListening(false);
  }

  const isActive = listening;
  const isProcessing = processing && !transcript && !guideText && !lastError;
  const needsBackend = !convexUrl && !wsUrl;
  const hasError = !!lastError || needsBackend;
  const errorMessage =
    lastError ??
    (needsBackend ? 'Set NEXT_PUBLIC_CONVEX_URL (recommended) or NEXT_PUBLIC_VOICE_WS_URL' : '');

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <div className="px-2 pt-2 shrink-0">
        <header className="rounded-lg border border-border card-glass">
          <div className="grid grid-cols-3 items-center gap-3 px-3 py-2">
          <div className="min-w-0 flex justify-start">
            <h1 className="text-lg font-semibold">Gamma Guide</h1>
          </div>

          <CoachTradeTabs />
          
          <div className="flex items-center gap-2 min-w-0 justify-end">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-background/50">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-monad animate-pulse' : isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-muted'}`} />
              <span className="text-xs uppercase w-11 text-center inline-block">
                {isActive ? 'Listening' : isProcessing ? 'Processing…' : 'Ready'}
              </span>
            </div>
            <WalletAvatar className="shrink-0" />
          </div>
        </div>
        </header>
      </div>

      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row gap-2 p-2">
          <div className="flex-1 lg:flex-[0.45] flex flex-col gap-2">
            <div className="flex-1 relative rounded-2xl overflow-hidden flex items-center justify-center min-h-[320px]">
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

              <div className="absolute flex items-center justify-center">
                <div className={`absolute w-20 h-20 rounded-full border border-foreground/10 transition-all duration-500 ${isActive ? 'border-monad/20 animate-voice-ring' : ''}`} />
                <div className={`absolute w-28 h-28 rounded-full border border-foreground/10 transition-all duration-500 ${isActive ? 'border-monad/20 animate-voice-ring [animation-delay:150ms]' : ''}`} />
                <div className={`absolute w-36 h-36 rounded-full border border-foreground/10 transition-all duration-500 ${isActive ? 'border-monad/20 animate-voice-ring [animation-delay:300ms]' : ''}`} />
                <div className={`absolute w-44 h-44 rounded-full border border-foreground/10 transition-all duration-500 ${isActive ? 'border-monad/20 animate-voice-ring [animation-delay:450ms]' : ''}`} />
              </div>

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
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-inner overflow-hidden ${
                    isActive
                      ? 'bg-card/90 ring-2 ring-monad/40 ring-offset-2 ring-offset-card shadow-[inset_0_0_20px_rgba(96,66,230,0.15)]'
                      : 'bg-card/80 border border-border/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]'
                  }`}
                >
                  <Image
                    src="/logo.png"
                    alt="Monad"
                    width={80}
                    height={80}
                    className={`w-full h-full object-contain transition-opacity ${isActive ? 'opacity-100' : 'opacity-90'}`}
                  />
                </div>
              </div>

              <div className="relative z-10 text-center px-6 pt-36">
                <p className="text-lg tracking-tight text-foreground/90 font-bold max-w-xs mx-auto mt-24 mb-8">
                  {isActive ? 'Listening on Monad' : 'Speak. Get clarity.'}
                </p>
                <Button
                  size="lg"
                  variant={isActive ? 'destructive' : 'primarySubtle'}
                  onClick={() => (isActive ? stopCapture() : startCapture())}
                  className={
                    isActive
                      ? 'rounded-full px-10 py-6 text-sm font-medium border border-destructive/40 text-white hover:bg-destructive/30 hover:border-destructive/60 transition-colors'
                      : 'rounded-full px-10 py-6 text-sm font-medium'
                  }
                >
                  {isActive ? 'End' : 'Begin'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 lg:flex-[0.55] flex flex-col gap-2">
            <div className="rounded-lg border border-border/60 card-glass p-3">
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                Context
              </h3>
              <GuideContext />
            </div>
            
            {hasError && errorMessage && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            <div className="flex-1 rounded-lg border border-border/60 card-glass p-3 flex flex-col min-h-[120px] overflow-hidden">
              {transcript || guideText ? (
                <div className="space-y-2 text-sm">
                  {transcript && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">You</p>
                      <p className="font-light text-foreground">{transcript}</p>
                    </div>
                  )}
                  {guideText && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Guide</p>
                      <p className="font-light text-foreground">{guideText}</p>
                    </div>
                  )}
                  {isProcessing && (
                    <p className="text-xs text-muted-foreground animate-pulse">Processing…</p>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <p className="text-sm font-light">
                      {isProcessing ? 'Processing your message…' : 'Transcript appears here'}
                    </p>
                    <p className="text-[10px] mt-1.5 uppercase tracking-wider opacity-70">
                      {isProcessing ? 'Guide will respond shortly' : 'Click begin to start'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

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
