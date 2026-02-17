# Quick Start Guide

Get up and running in 3 minutes.

## Prerequisites

- Node.js 20+ installed
- Yarn package manager

## Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page (edit this!)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles + Tailwind config
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── animate-ui/       # animate-ui components
├── lib/                  # Utilities
│   └── utils.ts          # cn() helper
└── hooks/                # Custom hooks
```

## Adding Components

### shadcn/ui

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

Browse: https://ui.shadcn.com/docs/components

### animate-ui

```bash
npx shadcn@latest add @animate-ui/primitives-texts-typing-text
npx shadcn@latest add @animate-ui/primitives-containers-animated-card
```

Browse: https://animate-ui.com/docs

## Common Commands

```bash
yarn dev          # Start dev server
yarn build        # Build for production
yarn start        # Start production server
yarn lint         # Run linter
```

## Styling

Uses Tailwind CSS with custom CSS variables for theming. Edit `app/globals.css` to customize colors.

Example:

```tsx
<div className="bg-background text-foreground border border-border">
  <h1 className="text-primary">Hello World</h1>
  <p className="text-muted-foreground">Description</p>
</div>
```

## Next Steps

1. Edit `app/page.tsx` to build your UI
2. Add more pages in the `app/` directory
3. Add components with `npx shadcn@latest add [component]`
4. See `PROJECT_CONFIG.md` for detailed configuration

## Need Help?

- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [animate-ui Docs](https://animate-ui.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
