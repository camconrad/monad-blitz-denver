# Pages Implementation Guide

Complete specification for building complex interactive pages. Use this as a reference when implementing similar features in other repositories.

---

## Route structure

- **Single page:** `app/page.tsx` is the main route (root `/`). It is a client component (`"use client"`).
- **Layout:** `app/layout.tsx` wraps all pages with fonts, globals.css, and Analytics.

---

## Web APIs (MDN) — voice coach + trading tabs

Use these **browser APIs** in this order of importance. All links are to [MDN Web API reference](https://developer.mozilla.org/en-US/docs/Web/API).

### 1) Tab ↔ tab communication

- **[BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)**  
  Use when both tabs are on the **same origin** (your app). Cleanest way to sync transcript, context, and suggestions between the Coach tab and the Trading tab.

**Fallbacks (only if needed later):**

- **[WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)** — server-relay bus when cross-origin
- **[Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) / [MessageChannel](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel)** — iframe/embedded scenarios

### 2) Voice input (microphone)

- **[MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)** (Media Capture and Streams)  
  Mic permission + mic stream. Required for capturing audio to send to STT.

### 3) Audio processing (optional but common)

- **[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)** (`AudioContext`, `AnalyserNode`, etc.)  
  Use for volume meter, resampling, noise gating/VAD, mixing.
- **[AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)** — low-latency processing when needed (e.g. replace deprecated `ScriptProcessorNode`).

### 4) Realtime speech-to-text + coach streaming

- **[WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)**  
  Proper browser API for realtime streaming audio to your backend STT and receiving partial transcripts back.  
  (If not doing realtime, **[Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)** can upload recorded chunks; WebSocket is better for “coach while you trade”.)

### 5) Coach voice output (text-to-speech)

Pick one:

- **[SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)** (Web Speech API) — quick built-in TTS (quality varies by browser/OS)
- Or play audio from your backend:
  - **[HTMLAudioElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement)** — simplest (play WAV/MP3 URL or blob)
  - **Web Audio API** — more control (decode, gain, etc.)
  - **[Media Source Extensions (MSE)](https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API)** — if you stream audio chunks

### 6) Trading interface data

- **WebSocket API** — live market data and order updates
- **Fetch API** — REST calls (place order, history, balances)

### 7) Auth/security (strongly recommended)

- **[WebAuthn](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)** — passkeys
- **[Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)** — signing and secure primitives

---

### Minimal set to ship v1

Smallest “correct” set for Coach + Trade tabs:

1. **BroadcastChannel** — tab sync (transcript/context/suggestions)
2. **getUserMedia** — mic stream
3. **WebSocket** — realtime STT/coach stream (and trading live data)
4. **Fetch** — REST (orders, history)
5. **HTMLAudioElement** (or **SpeechSynthesis**) — TTS playback

The rest of this guide maps implementation details to these APIs (e.g. session flow uses `getUserMedia` → Web Audio → WebSocket; bus uses BroadcastChannel; TTS uses `HTMLAudioElement`).

---

## Main page: layout and sections

The root page is a full-height flex column (`h-dvh`, `flex flex-col`, `overflow-hidden`). Structure:

1. **Header bar** — Fixed at top. Logo/title left; status + optional BUS badge + settings button right.
2. **Settings panel** — Collapsible; toggled by header settings button. Contains WebSocket URL input and Reset.
3. **Main content** — Two columns on large screens (`lg:flex-row`), stacked on small:
   - **Left column (~45%)** — Orb, level meter, session stats, and mic/speaker controls.
   - **Right column (~55%)** — Trading context card, connection bar, transcript list, and bottom topic chips.

---

## Types (copy or re-export)

```typescript
type SessionState = "idle" | "connecting" | "listening" | "processing" | "speaking" | "error"

interface TranscriptEntry {
  id: string
  role: "user" | "coach"
  text: string
  timestamp: Date
  partial?: boolean
}
```

---

## WebSocket contract (backend → frontend)

See **§ Web APIs (MDN)** above: WebSocket is used for (4) realtime STT/coach streaming and (6) trading live data.

### Connection

- **Endpoint:** Configurable; default `ws://localhost:8080/ws/voice`.
- **Client → server:** Binary PCM audio. Microphone stream is 16 kHz mono; each chunk is `Int16Array` (4096 samples per ScriptProcessor buffer), sent as `ArrayBuffer`.
- **Server → client:** Either JSON messages (UTF-8) or binary TTS (ArrayBuffer, played as `audio/wav`).

### JSON message types (all have `type`)

| `msg.type` | Payload | UI behavior |
|------------|---------|-------------|
| `transcript_partial` | `{ text: string, confidence?: number }` | Append/update last user transcript entry as partial; optionally emit bus. |
| `transcript_final` | `{ text: string, confidence?: number }` | Add final user entry; set state to `processing`; optionally emit bus. |
| `coach_response_partial` | `{ text: string }` | Append/update last coach transcript entry as partial. |
| `coach_response_final` | `{ text: string }` | Add final coach entry. |
| `suggestion` | `{ title?, rationale?, urgency?, actions? }` | Emit to BroadcastChannel bus only (for trading tab). |
| `risk_alert` | `{ message?, severity? }` | Emit to bus only. |
| `tts_audio` | `{ url: string }` | Set state to `speaking`; play audio from `url`; on end/error set state to `listening`. |
| `error` | `{ message: string }` | Set state to `error`; add coach transcript line with error message. |

### Binary messages

**Binary:** If the message is not valid JSON, the client treats it as TTS audio (ArrayBuffer), creates a blob URL with `type: "audio/wav"`, and plays it; on end/error sets state back to `listening`.

---

## BroadcastChannel bus (cross-tab)

See **§ Web APIs (MDN)** above: BroadcastChannel is the primary API for same-origin tab ↔ tab communication.

- **Channel name:** `gamma_guide_bus` (or your project-specific name).
- **When:** Opened when session starts; closed when session stops. Use when the Trading tab (or another tab) consumes transcript/context/suggestions.
- **Message shape:** `{ type, ts, requestId?, payload }`. 
  - Types: `coach.transcript.partial`, `coach.transcript.final`, `coach.suggestion`, `coach.risk.alert`. 
  - Payloads match the WebSocket suggestion/risk_alert/transcript shapes above.

### Example bus implementation

```typescript
// lib/voice-coach-bus.ts
const BUS_CHANNEL = 'gamma_guide_bus';

export function createBus() {
  return new BroadcastChannel(BUS_CHANNEL);
}

export function emitBusEvent(
  bus: BroadcastChannel | null, 
  type: string, 
  payload: any, 
  requestId?: string
) {
  if (!bus) return;
  bus.postMessage({
    type,
    ts: new Date().toISOString(),
    requestId,
    payload
  });
}
```

---

## Page state (minimal set to complete the page)

Required state variables:

```typescript
const [sessionState, setSessionState] = useState<SessionState>('idle');
const [isMuted, setIsMuted] = useState(false);
const [isSpeakerOn, setIsSpeakerOn] = useState(true);
const [audioLevel, setAudioLevel] = useState(0); // 0–1
const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
const [duration, setDuration] = useState(0); // seconds
const [wsUrl, setWsUrl] = useState('ws://localhost:8080/ws/voice');
const [showSettings, setShowSettings] = useState(false);
```

Required refs:

```typescript
const mediaStreamRef = useRef<MediaStream | null>(null);
const audioContextRef = useRef<AudioContext | null>(null);
const analyserRef = useRef<AnalyserNode | null>(null);
const wsRef = useRef<WebSocket | null>(null);
const audioElRef = useRef<HTMLAudioElement | null>(null);
const processorRef = useRef<ScriptProcessorNode | null>(null);
const busRef = useRef<BroadcastChannel | null>(null);
const requestIdRef = useRef<string>('');
const levelRafRef = useRef<number | null>(null);
const timerRef = useRef<NodeJS.Timeout | null>(null);
```

---

## Subcomponents (props and behavior)

Implement these inside the page file or as separate components; the page passes the listed props.

### AudioOrb

```typescript
interface AudioOrbProps {
  state: SessionState;
  audioLevel: number;
}
```

- Canvas 280×280; requestAnimationFrame loop
- **Idle:** gray circle
- **Listening:** green with wobble
- **Speaking/Processing:** teal with glow
- **Error:** red
- Ring wobble and glow scale with `audioLevel` and state

### LevelMeter

```typescript
interface LevelMeterProps {
  level: number;
  active: boolean;
}
```

- 24 vertical bars
- Each bar height: `4 + (i/24)*20` px
- Lit when `active && level > i/24`
- Top quarter: `bg-destructive`, rest `bg-primary`
- Unlit: `bg-muted`

### StatusIndicator

```typescript
interface StatusIndicatorProps {
  state: SessionState;
}
```

- Dot + label (READY, CONNECTING, LISTENING, etc.)
- Pulse animation when connecting/listening/processing/speaking
- Colors by state:
  - `idle`: `bg-muted-foreground`
  - `connecting`/`listening`: `bg-primary`
  - `processing`/`speaking`: `bg-chart-4`
  - `error`: `bg-destructive`

### TranscriptPanel

```typescript
interface TranscriptPanelProps {
  entries: TranscriptEntry[];
}
```

- ScrollArea; auto-scroll to bottom on new entries
- Empty state: Radio icon + "Transcript will appear here"
- Each entry: role label ("AI Coach" / "You"), timestamp, body
- **User/partial:** right-aligned, `bg-secondary`
- **Coach/final:** left-aligned, `bg-primary/10`, border; use `<TypingText>` for coach non-partial
- Apply `animate-transcript-in` per entry

### TradingContext

```typescript
interface TradingContextProps {
  // Optional: can be static or accept props
}
```

- Static card: "Session Context", LIVE badge
- Grid layout (e.g. ASSET, STRATEGY, EXPIRY, IV RANK)
- Can be made dynamic later with props

### SessionStats

```typescript
interface SessionStatsProps {
  duration: number; // seconds
  turns: number;
}
```

- Format duration as MM:SS
- Show "X turns"
- `turns` = count of transcript entries where `!partial`

---

## TypingText component (required for transcript)

### Location

`components/typing-text.tsx`

### Props

```typescript
interface TypingTextProps {
  text: string;
  speed?: number; // ms per char, default 18
  className?: string;
  cursor?: boolean;
  onComplete?: () => void;
}
```

### Behavior

- Reveals `text` character-by-character
- Supports streaming (if new `text` starts with previous, continues; else resets)
- Optional blinking cursor (use `typing-cursor-blink` from globals.css)
- Uses `motion` (AnimatePresence) for cursor

### Implementation example

```typescript
'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function TypingText({ 
  text, 
  speed = 18, 
  className, 
  cursor = false,
  onComplete 
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (text.startsWith(displayedText)) {
      // Continue from current position
      let i = displayedText.length;
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayedText(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(timer);
          onComplete?.();
        }
      }, speed);
      return () => clearInterval(timer);
    } else {
      // Reset and start over
      setDisplayedText('');
    }
  }, [text, speed, onComplete]);
  
  return (
    <span className={className}>
      {displayedText}
      {cursor && (
        <AnimatePresence>
          <motion.span
            className="inline-block w-[2px] h-[1em] bg-current ml-[2px] animate-typing-cursor-blink"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </AnimatePresence>
      )}
    </span>
  );
}
```

### Usage in transcript

```typescript
{entry.role === 'coach' && !entry.partial && (
  <TypingText 
    text={entry.text} 
    speed={16} 
    cursor 
    className="text-sm" 
  />
)}
```

---

## Session flow (start/stop)

APIs used here: **BroadcastChannel** (tab sync), **getUserMedia** (mic), **Web Audio API** (level meter + PCM), **WebSocket** (stream to backend). See **§ Web APIs (MDN)**.

### Start session

```typescript
async function startSession() {
  try {
    // 1. Set connecting state
    setSessionState('connecting');
    setDuration(0);
    setTranscript([]);
    
    // 2. Create BroadcastChannel (tab ↔ tab)
    busRef.current = new BroadcastChannel('gamma_guide_bus');
    requestIdRef.current = crypto.randomUUID();
    
    // 3. Get microphone access (MediaDevices.getUserMedia)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      }
    });
    mediaStreamRef.current = stream;
    
    // 4. Create AudioContext and nodes
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    source.connect(analyser);
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    processorRef.current = processor;
    
    // 5. Open WebSocket
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    
    ws.onopen = () => {
      setSessionState('listening');
      startTimer();
      startLevelPolling();
    };
    
    ws.onmessage = handleWebSocketMessage;
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setSessionState('error');
    };
    ws.onclose = () => {
      stopSession();
    };
    
    // 6. Send audio to WebSocket
    processor.onaudioprocess = (e) => {
      if (ws.readyState === WebSocket.OPEN && !isMuted) {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        ws.send(pcm16.buffer);
      }
    };
    
  } catch (error) {
    console.error('Failed to start session:', error);
    setSessionState('error');
  }
}
```

### Stop session

```typescript
function stopSession() {
  // Close WebSocket
  if (wsRef.current) {
    wsRef.current.close();
    wsRef.current = null;
  }
  
  // Disconnect audio nodes
  if (processorRef.current) {
    processorRef.current.disconnect();
    processorRef.current = null;
  }
  
  // Stop media tracks
  if (mediaStreamRef.current) {
    mediaStreamRef.current.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
  }
  
  // Close AudioContext
  if (audioContextRef.current) {
    audioContextRef.current.close();
    audioContextRef.current = null;
  }
  
  // Stop TTS audio
  if (audioElRef.current) {
    audioElRef.current.pause();
    audioElRef.current.src = '';
  }
  
  // Close BroadcastChannel
  if (busRef.current) {
    busRef.current.close();
    busRef.current = null;
  }
  
  // Cancel timers
  if (levelRafRef.current) {
    cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = null;
  }
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
  
  // Reset state
  setSessionState('idle');
  setAudioLevel(0);
}
```

### Handle WebSocket messages

```typescript
function handleWebSocketMessage(event: MessageEvent) {
  // Try to parse as JSON
  if (typeof event.data === 'string') {
    try {
      const msg = JSON.parse(event.data);
      handleJSONMessage(msg);
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  } else if (event.data instanceof ArrayBuffer) {
    // Binary TTS audio
    handleBinaryAudio(event.data);
  }
}

function handleJSONMessage(msg: any) {
  switch (msg.type) {
    case 'transcript_partial':
      addOrUpdateTranscript({
        id: 'user-partial',
        role: 'user',
        text: msg.text,
        timestamp: new Date(),
        partial: true,
      });
      break;
      
    case 'transcript_final':
      addOrUpdateTranscript({
        id: crypto.randomUUID(),
        role: 'user',
        text: msg.text,
        timestamp: new Date(),
        partial: false,
      });
      setSessionState('processing');
      break;
      
    case 'coach_response_partial':
      addOrUpdateTranscript({
        id: 'coach-partial',
        role: 'coach',
        text: msg.text,
        timestamp: new Date(),
        partial: true,
      });
      break;
      
    case 'coach_response_final':
      addOrUpdateTranscript({
        id: crypto.randomUUID(),
        role: 'coach',
        text: msg.text,
        timestamp: new Date(),
        partial: false,
      });
      break;
      
    case 'tts_audio':
      playTTSFromURL(msg.url);
      break;
      
    case 'error':
      setSessionState('error');
      addOrUpdateTranscript({
        id: crypto.randomUUID(),
        role: 'coach',
        text: msg.message || 'An error occurred',
        timestamp: new Date(),
        partial: false,
      });
      break;
      
    case 'suggestion':
    case 'risk_alert':
      // Emit to bus only
      emitBusEvent(busRef.current, `coach.${msg.type}`, msg, requestIdRef.current);
      break;
  }
}

function handleBinaryAudio(data: ArrayBuffer) {
  const blob = new Blob([data], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  playTTSFromURL(url);
}

// TTS playback via HTMLAudioElement (see § Web APIs: Coach voice output)
function playTTSFromURL(url: string) {
  if (!isSpeakerOn) return;
  
  setSessionState('speaking');
  
  if (!audioElRef.current) {
    audioElRef.current = new Audio();
  }
  
  audioElRef.current.src = url;
  audioElRef.current.play();
  
  audioElRef.current.onended = () => {
    setSessionState('listening');
    URL.revokeObjectURL(url);
  };
  
  audioElRef.current.onerror = () => {
    setSessionState('error');
    URL.revokeObjectURL(url);
  };
}
```

### Helper functions

```typescript
function startTimer() {
  timerRef.current = setInterval(() => {
    setDuration(prev => prev + 1);
  }, 1000);
}

function startLevelPolling() {
  if (!analyserRef.current) return;
  
  const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
  
  function poll() {
    if (!analyserRef.current) return;
    
    analyserRef.current.getByteTimeDomainData(dataArray);
    
    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    setAudioLevel(Math.min(1, rms * 3)); // Scale up for visibility
    
    levelRafRef.current = requestAnimationFrame(poll);
  }
  
  poll();
}

function addOrUpdateTranscript(entry: TranscriptEntry) {
  setTranscript(prev => {
    // If partial, update or append
    if (entry.partial) {
      const lastIndex = prev.findIndex(e => e.id === entry.id);
      if (lastIndex >= 0) {
        const updated = [...prev];
        updated[lastIndex] = entry;
        return updated;
      }
    } else {
      // Remove any partial entries for this role
      const filtered = prev.filter(e => !(e.partial && e.role === entry.role));
      return [...filtered, entry];
    }
    
    return [...prev, entry];
  });
}
```

### Cleanup on unmount

```typescript
useEffect(() => {
  return () => {
    stopSession();
  };
}, []);
```

---

## Styling conventions used on the page

### Layout

```typescript
// Full-height flex container
className="h-dvh flex flex-col overflow-hidden"

// Two-column layout (responsive)
className="flex flex-col lg:flex-row gap-4 p-4"

// Left column
className="flex-1 lg:flex-[0.45]"

// Right column
className="flex-1 lg:flex-[0.55]"

// Cards
className="border border-border rounded-lg bg-card p-4"
```

### Typography

```typescript
// Section labels
className="text-xs tracking-wider uppercase text-muted-foreground"

// Body text
className="text-sm text-foreground"

// Timestamps
className="text-[10px] text-muted-foreground"

// Headers
className="text-lg font-semibold"
```

### Colors

- **Background:** `bg-background`, `bg-card`
- **Text:** `text-foreground`, `text-muted-foreground`
- **Borders:** `border-border`, `border-primary/20`
- **Accents:** `bg-primary`, `bg-destructive`, `bg-chart-4`
- **Overlays:** `bg-primary/10`, `bg-secondary`

### Animations

```css
/* Add to globals.css */

@keyframes transcript-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes typing-cursor-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.animate-transcript-in {
  animation: transcript-in 0.3s ease-out;
}

.animate-typing-cursor-blink {
  animation: typing-cursor-blink 1s infinite;
}
```

### Grid background (optional)

```typescript
// Left column with subtle grid
<div 
  className="relative"
  style={{
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
  }}
>
  <div className="relative z-10">
    {/* Content */}
  </div>
</div>
```

---

## UI components from shadcn used on this page

Install these components before building the page:

```bash
npx shadcn@latest add button
npx shadcn@latest add badge
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
```

### Component usage

```typescript
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Button variants
<Button variant="default">Start</Button>
<Button variant="ghost" size="icon"><Mic /></Button>
<Button variant="outline" size="sm">Reset</Button>

// Badge
<Badge variant="outline">LIVE</Badge>

// ScrollArea (for transcript)
<ScrollArea className="h-full">
  {transcript.map(entry => (
    <div key={entry.id}>...</div>
  ))}
</ScrollArea>
```

### Icons from Lucide

```typescript
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Radio, 
  Settings, 
  X, 
  Activity, 
  Wifi, 
  WifiOff, 
  CircleDot, 
  RotateCcw, 
  Share2 
} from 'lucide-react';
```

---

## Optional: extract shared pieces

For better code organization, consider extracting:

### Component files

```
components/voice-coach/
├── audio-orb.tsx
├── level-meter.tsx
├── status-indicator.tsx
├── transcript-panel.tsx
├── trading-context.tsx
└── session-stats.tsx
```

### Utility files

```
lib/
├── voice-coach-types.ts    # Types and interfaces
├── voice-coach-bus.ts      # BroadcastChannel helpers
└── voice-coach-session.ts  # Session logic
```

### Custom hook (advanced)

```typescript
// hooks/use-voice-session.ts
export function useVoiceSession(wsUrl: string, options: {
  isMuted: boolean;
  isSpeakerOn: boolean;
}) {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [duration, setDuration] = useState(0);
  
  // ... all session logic here
  
  return {
    sessionState,
    audioLevel,
    transcript,
    duration,
    startSession,
    stopSession,
    addTranscript,
  };
}
```

---

## Testing checklist

Before deploying, verify:

- [ ] Microphone permission works
- [ ] WebSocket connects successfully
- [ ] Audio level meter responds to input
- [ ] Transcript updates in real-time
- [ ] Partial entries update correctly
- [ ] Final entries add new items
- [ ] TTS audio plays when received
- [ ] Mute button works
- [ ] Speaker toggle works
- [ ] Session timer counts correctly
- [ ] Stop button cleans up all resources
- [ ] Page doesn't leak memory on unmount
- [ ] Settings panel saves URL
- [ ] Responsive layout works on mobile
- [ ] BroadcastChannel emits events (if used)

---

## Performance considerations

1. **Audio processing:** Use Web Workers for heavy DSP if needed
2. **Transcript rendering:** Use `React.memo` for transcript entries
3. **Canvas animations:** Use requestAnimationFrame, not setInterval
4. **WebSocket buffering:** Implement backpressure if sending too fast
5. **Memory cleanup:** Always clean up audio nodes, streams, and timers

---

## Troubleshooting

### Common issues

**No audio level:**
- Check microphone permissions
- Verify AudioContext sampleRate matches getUserMedia
- Ensure analyser is connected to source

**WebSocket disconnects:**
- Check CORS settings on backend
- Verify binary type is set to 'arraybuffer'
- Implement reconnection logic

**TTS doesn't play:**
- Check speaker toggle state
- Verify audio format is supported
- Check for HTTPS requirement (some browsers)

**Memory leaks:**
- Always disconnect audio nodes
- Cancel all RAF and timers
- Close WebSocket and BroadcastChannel

---

## Next steps

With this guide, you can:

1. Implement the voice-coach page from scratch
2. Adapt it for different backends or message formats
3. Extract reusable components for other projects
4. Add features like recording, playback, or analysis
5. Integrate with trading systems via BroadcastChannel

The architecture is flexible and can be extended for various real-time audio/voice applications.
