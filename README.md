# Monad Options

**Demystifying Options Trading Through AI-Powered Voice**

Trade European vanilla options the natural way—through conversation. Ask questions, get AI-powered insights, manage risk, and execute strategies using your voice. No jargon, just results.

> A production-ready Next.js application built with TypeScript, Tailwind CSS, shadcn/ui, and real-time WebSocket communication.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)

## ⚡ Quick Start

```bash
# Install dependencies
yarn install

# Start development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

**Network:** This app runs on **Monad Testnet** (Chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`, explorer [testnet.monadvision.com](https://testnet.monadvision.com)). Config is in `lib/chain.ts`.

Optional: set `NEXT_PUBLIC_VOICE_WS_URL` (e.g. `ws://localhost:8080/ws/voice`) to enable the Guide page to stream mic audio as binary chunks over WebSocket and receive JSON events (transcript, coach response, suggestions). If unset or the connection fails, the Guide shows an explicit error state.

**New to this setup?** → See [QUICKSTART.md](./QUICKSTART.md) for a beginner-friendly guide.

## 💡 The Problem We Solve

Options trading is complex, intimidating, and filled with jargon. Most platforms require deep knowledge of Greeks, spreads, and strategies before you can even place your first trade. We're changing that.

**Monad Options** lets you:
- 🗣️ **Ask questions naturally** - "Should I buy a call on ETH?" instead of calculating strike prices
- 🤖 **Get AI guidance** - Real-time analysis of market conditions and your positions
- ⚡ **Trade faster** - Voice commands while monitoring charts
- 📚 **Learn by doing** - Understand strategies through conversation, not textbooks
- 🛡️ **Manage risk** - AI alerts you to potential issues before they become problems

## 🎯 Application Pages

This app has **2 main pages**:

1. **`/guide`** - AI Voice Assistant (Gamma Guide) for real-time trading guidance
2. **`/trade`** - Options Trading Platform (Binance/Bybit/OKX style)

See [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) for complete application architecture.

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [VALUE_PROPOSITION.md](./VALUE_PROPOSITION.md) | **Why this matters - problem, solution, vision** |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | **App architecture, pages, data flow** |
| [QUICKSTART.md](./QUICKSTART.md) | Get started in 3 minutes |
| [PROJECT_CONFIG.md](./PROJECT_CONFIG.md) | Complete technical setup & replication guide |
| [PAGES_GUIDE.md](./PAGES_GUIDE.md) | Coach + Trade implementation; Web APIs (MDN): BroadcastChannel, getUserMedia, WebSocket, Fetch, TTS |
| [TRADINGVIEW.md](./TRADINGVIEW.md) | TradingView chart integration (Widget), best practices, and future Advanced Charts notes |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Development guidelines |

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Runtime** | React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3.4 |
| **UI Components** | shadcn/ui |
| **Animations** | animate-ui + Motion |
| **Icons** | Lucide React |
| **Package Manager** | Yarn |

## 📦 What's Included

- ✅ Next.js 15 with App Router and React 19
- ✅ TypeScript with strict mode
- ✅ Tailwind CSS with custom design tokens
- ✅ shadcn/ui component system
- ✅ animate-ui with smooth animations
- ✅ Path aliases (`@/*`)
- ✅ Beautiful demo page with animated counter
- ✅ Production-ready configuration
- ✅ Comprehensive documentation

## 🎨 Adding Components

### shadcn/ui

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

Browse: [ui.shadcn.com](https://ui.shadcn.com/docs/components)

### animate-ui

```bash
npx shadcn@latest add @animate-ui/primitives-texts-typing-text
npx shadcn@latest add @animate-ui/primitives-containers-animated-card
```

Browse: [animate-ui.com](https://animate-ui.com/docs)

## 📁 Project Structure

```
monad-blitz-denver/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   └── animate-ui/        # animate-ui components
├── lib/
│   └── utils.ts           # Utilities (cn helper)
├── hooks/                 # Custom React hooks
├── PROJECT_CONFIG.md      # Technical documentation
├── QUICKSTART.md          # Quick start guide
└── CONTRIBUTING.md        # Development guidelines
```

## 🛠️ Common Commands

```bash
yarn dev          # Start development server
yarn build        # Build for production
yarn start        # Start production server
yarn lint         # Run ESLint
```

## 🎯 For Monad Blitz Participants

This is a fork of the official Monad Blitz Denver submission template. You can:

1. ✅ Build your project in this repo
2. ✅ Commit and push changes
3. ✅ Submit via [Blitz Portal](https://blitz.devnads.com)

The fork relationship is maintained for easy submission.

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and best practices.

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [animate-ui Documentation](https://animate-ui.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📄 License

This project is open source and available for the Monad Blitz Denver hackathon.

---

**Ready to build?** Start editing `app/page.tsx` and create something amazing! 🚀
