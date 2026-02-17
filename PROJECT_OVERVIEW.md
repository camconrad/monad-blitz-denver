# Project Overview: Monad Options

**Demystifying Options Trading Through AI-Powered Voice**

---

## 💡 The Vision

Options trading shouldn't require a PhD in finance. **Monad Options** bridges the gap between complex financial instruments and everyday traders through natural conversation.

### The Problem

- Traditional platforms are intimidating and jargon-heavy
- Learning curves are steep (Greeks, IV, spreads, etc.)
- No real-time guidance when markets move fast
- Difficult to understand risk implications
- Interface complexity slows down execution

### Our Solution

**Talk to your trades.** Instead of navigating complex menus and calculating strike prices, simply ask:

> "Should I sell a covered call on my ETH position?"
> 
> "What's my risk if volatility spikes?"
> 
> "Show me bullish strategies for BTC under $50k"

The AI understands context, analyzes markets in real-time, and guides you through execution—all through voice.

### Key Value Props

1. **Zero Jargon Required** - Speak naturally, trade confidently
2. **Real-Time AI Analysis** - Market insights as you speak
3. **Learn While Trading** - Understand strategies through conversation
4. **Risk Management** - AI monitors and alerts automatically
5. **Faster Execution** - Voice is quicker than clicks
6. **Professional + Accessible** - Exchange-grade platform, simplified UX

---

## 🎯 Project Vision

Monad Options combines voice AI technology with professional options trading, creating an intuitive interface for traders to interact with markets through natural conversation while executing European vanilla options strategies.

---

## 🏗️ Application Structure

This application has **2 main pages**:

### 1. **Guide Page** (`/guide`)

**Purpose:** AI voice assistant (Gamma Guide) for real-time trading guidance

**Features:**
- 🎤 Real-time voice recognition and transcription
- 🤖 AI-powered trading advice and risk analysis
- 📊 Session context (current positions, market conditions)
- 💬 Live transcript with streaming responses
- 🔊 Text-to-speech responses
- 📡 WebSocket communication for low-latency interaction

**User Flow:**
1. User clicks "Start Session"
2. Microphone access granted
3. User speaks naturally about trading questions/strategies
4. AI analyzes and responds with guidance
5. Transcript shows conversation history
6. Real-time session stats (duration, turns)

**Technical Implementation:**
- See `PAGES_GUIDE.md` for complete WebSocket, audio, and transcript implementation
- Uses Web Audio API for microphone input
- Binary PCM audio streaming to backend
- JSON messages for transcripts and AI responses
- BroadcastChannel for cross-tab communication with Trade page

### 2. **Trade Page** (`/trade`)

**Purpose:** Professional options trading interface

**Features:**
- 📈 Real-time market data and price charts
- 📋 Options chain (calls/puts) with strike prices, bids, asks, IV
- 💰 Order entry panel (buy/sell, quantity, limit price)
- 📊 Portfolio overview and position tracking
- 🎯 European vanilla options (calls and puts)
- 💡 Integration point for Coach AI suggestions

**User Flow:**
1. User views market data and options chain
2. Selects strike price and expiry
3. Places order (buy call/put or sell)
4. Monitors positions and P&L
5. Optional: receives AI coach suggestions via BroadcastChannel

**Technical Implementation:**
- Real-time WebSocket for market data
- Options chain rendering with Greeks (IV, delta, gamma, etc.)
- Order management system
- Position tracking and P&L calculation
- Chart integration (TradingView or custom)

---

## 🔗 Inter-Page Communication

The Guide and Trade pages communicate via **BroadcastChannel API**:

```typescript
// Guide page sends suggestions to Trade page
bus.postMessage({
  type: 'coach.suggestion',
  payload: {
    title: 'Consider closing ETH 3300 Call',
    rationale: 'IV dropping, take profit at 80%',
    urgency: 'medium'
  }
});

// Trade page listens and displays alerts
bus.onmessage = (event) => {
  if (event.data.type === 'coach.suggestion') {
    showSuggestionAlert(event.data.payload);
  }
};
```

**Use Cases:**
- Guide analyzes market conditions → suggests trade to execute
- Guide detects risk → alerts Trade page
- Guide monitors open positions → provides guidance
- User asks Guide about a trade → Guide queries Trade page context

---

## 🎨 Design System

### Style: Binance/Bybit/OKX Inspired

**Key Characteristics:**
- Dark theme with high contrast
- Clear visual hierarchy
- Real-time data emphasis
- Smooth animations and transitions
- Mobile-responsive design

### Color Palette

```typescript
// From tailwind.config.ts
--background:   // Dark background
--foreground:   // Light text
--primary:      // Action buttons (buy, green accents)
--destructive:  // Sell buttons, warnings (red)
--chart-4:      // Teal for processing/speaking states
--muted:        // Secondary text and borders
```

### Typography

```typescript
// Price and numerical data
className="font-semibold"

// Labels and headers
className="font-semibold tracking-wider uppercase text-xs"

// Body text
className="text-sm text-muted-foreground"
```

---

## 📊 Data Flow

### Coach Page Flow

```
User speaks → Mic → Web Audio API → PCM → WebSocket → Backend
                                                         ↓
Backend (STT) → Transcript → AI Model → Response → WebSocket
                                                         ↓
Frontend ← JSON messages ← TTS audio ← Suggestions ← Backend
    ↓
Update transcript, play audio, emit to BroadcastChannel
```

### Trade Page Flow

```
Backend Market Data → WebSocket → Frontend State → UI Update
                                        ↓
User clicks option → Order form → Validation → Backend API
                                        ↓
Backend confirms → Update positions → Update UI
                                        ↓
Listen to Coach suggestions via BroadcastChannel
```

---

## 🔧 Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Runtime** | React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3.4 |
| **UI Components** | shadcn/ui |
| **Animations** | animate-ui + Motion |
| **Real-time** | WebSocket (for both pages) |
| **Cross-tab** | BroadcastChannel API |
| **Audio** | Web Audio API, MediaRecorder |
| **Charts** | TradingView (or custom with Recharts) |
| **Icons** | Lucide React |

---

## 🚀 Development Roadmap

### Phase 1: Core Pages ✅
- [x] Home page with navigation
- [x] Coach page skeleton
- [x] Trade page skeleton
- [x] Basic UI components installed

### Phase 2: Coach Page (Current)
- [ ] WebSocket connection for voice
- [ ] Microphone input and audio streaming
- [ ] Real-time transcript rendering
- [ ] TTS audio playback
- [ ] Session management (start/stop)
- [ ] Status indicators and animations
- [ ] BroadcastChannel setup

### Phase 3: Trade Page
- [ ] WebSocket for market data
- [ ] Options chain rendering
- [ ] Order entry form
- [ ] Position management
- [ ] P&L tracking
- [ ] Chart integration

### Phase 4: Integration
- [ ] Coach ↔ Trade communication
- [ ] AI suggestions in Trade UI
- [ ] Context sharing between pages
- [ ] Unified state management

### Phase 5: Polish
- [ ] Responsive design refinement
- [ ] Loading states and error handling
- [ ] Accessibility improvements
- [ ] Performance optimization
- [ ] Testing

---

## 📁 Project Structure

```
monad-blitz-denver/
├── app/
│   ├── page.tsx              # Home/landing page
│   ├── guide/
│   │   └── page.tsx          # Gamma Guide (voice) interface
│   ├── trade/
│   │   └── page.tsx          # Options trading platform
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles + CSS variables
├── components/
│   ├── ui/                   # shadcn/ui components
│   │   ├── button.tsx
│   │   └── badge.tsx
│   └── animate-ui/           # animate-ui components
├── lib/
│   └── utils.ts              # Utilities (cn helper)
├── hooks/                    # Custom React hooks
├── Documentation files       # Guides (README, PAGES_GUIDE, etc.)
└── Config files              # TypeScript, Tailwind, Next.js
```

---

## 🎯 Implementation Guides

| Guide | Use For |
|-------|---------|
| **PAGES_GUIDE.md** | Complete Guide page implementation (WebSocket, audio, transcript) |
| **PROJECT_CONFIG.md** | Technical setup, dependencies, configuration |
| **QUICKSTART.md** | Getting started, adding components |
| **CONTRIBUTING.md** | Code style, conventions, PR process |

---

## 🔐 Environment Variables

```bash
# .env.local (create this file)

# Monad Testnet (optional RPC override; default: https://testnet-rpc.monad.xyz)
# NEXT_PUBLIC_MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz

# Coach WebSocket
NEXT_PUBLIC_COACH_WS_URL=ws://localhost:8080/ws/voice

# Trade WebSocket (market data)
NEXT_PUBLIC_TRADE_WS_URL=ws://localhost:8080/ws/market

# API endpoints
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Optional: Analytics, monitoring
NEXT_PUBLIC_ANALYTICS_ID=your_id_here
```

---

## ⛓️ Monad Testnet (Network)

This app is configured to run on **Monad Testnet**.

| Setting | Value |
|--------|--------|
| **RPC URL** | `https://testnet-rpc.monad.xyz` |
| **Chain ID** | `10143` |
| **Currency** | `MON` |
| **Block Explorer** | [https://testnet.monadvision.com](https://testnet.monadvision.com) |

Chain config is centralized in `lib/chain.ts`. Use `monadTestnet` (or the exported constants) when integrating wallets (e.g. wagmi/viem). The RPC URL can be overridden with `NEXT_PUBLIC_MONAD_TESTNET_RPC_URL` in `.env.local`.

---

## 🧪 Testing Locally

### Start Dev Server

```bash
yarn dev
```

### Test Pages

1. **Home:** http://localhost:3000
2. **Guide:** http://localhost:3000/guide
3. **Trade:** http://localhost:3000/trade

### Test Cross-Tab Communication

1. Open Guide page in one tab
2. Open Trade page in another tab
3. Start session in Guide
4. Verify BroadcastChannel messages in console

---

## 📈 Performance Targets

| Metric | Target |
|--------|--------|
| Initial Load | < 2s |
| WebSocket Latency | < 100ms |
| Audio Stream Delay | < 200ms |
| Options Chain Render | < 500ms |
| Frame Rate (animations) | 60 FPS |

---

## 🎯 For Monad Blitz Denver

This project demonstrates:

- ✅ Modern full-stack architecture
- ✅ Real-time communication (WebSocket, BroadcastChannel)
- ✅ Complex UI/UX (voice, trading, charts)
- ✅ Professional design (exchange-style interface)
- ✅ TypeScript best practices
- ✅ Scalable component architecture

**Submission Ready:**
- Professional presentation
- Working demo pages
- Complete documentation
- Clean code structure
- Ready for backend integration

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

For implementing the Coach page WebSocket and audio features, see [PAGES_GUIDE.md](./PAGES_GUIDE.md).

---

**Built with ❤️ for Monad Blitz Denver**
