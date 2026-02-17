# monad-blitz-denver — Project configuration summary

Context for replicating or transferring this setup to another repo.

---

## Stack overview

| Layer | Choice |
|-------|--------|
| **Framework** | Next.js 15 (App Router) |
| **Runtime** | React 19 |
| **Language** | TypeScript 5 |
| **Package manager** | yarn |
| **Styling** | Tailwind CSS 3.4 |
| **UI components** | shadcn/ui (New York style, RSC, TSX) |
| **Animations** | animate-ui, tailwindcss-animate |
| **Icons** | Lucide React |

---

## Root config files (copy these)

| File | Purpose |
|------|---------|
| `package.json` | Scripts, deps, devDeps (see "Key dependencies" below) |
| `tsconfig.json` | TS + Next plugin, `@/*` path alias |
| `next.config.ts` | Basic Next.js config |
| `postcss.config.mjs` | Tailwind + Autoprefixer |
| `tailwind.config.ts` | Tailwind theme, colors, animations |
| `components.json` | shadcn/ui config (style, paths, Tailwind entry) |
| `.gitignore` | node_modules, .next, .yarn, env, .DS_Store |

---

## Path aliases (tsconfig + components.json)

- `@/*` → project root (e.g. `@/components`, `@/lib`, `@/app`, `@/hooks`)

shadcn aliases in `components.json`:

- `@/components` — components
- `@/components/ui` — UI primitives
- `@/lib` — lib (e.g. `@/lib/utils`)
- `@/hooks` — hooks

---

## Tailwind 3.4 setup

- **Entry:** `app/globals.css` (referenced in `components.json` as the Tailwind CSS file)
- **Config:** `tailwind.config.ts` — extended colors mapped to CSS variables, border radius, animations
- **PostCSS:** `tailwindcss` and `autoprefixer` in `postcss.config.mjs`

In `app/globals.css`:

1. `@tailwind base`, `@tailwind components`, `@tailwind utilities`
2. `:root` — CSS variables for colors (hsl), radius, charts
3. `.dark` — dark mode color overrides
4. `@layer base` — global `body` background/foreground

In `tailwind.config.ts`:

- Extended colors map CSS variables via `hsl(var(--background))`, etc.
- Custom border radius using `var(--radius)`
- Dark mode via `["class"]`
- `tailwindcss-animate` plugin

---

## Key dependencies (from package.json)

**Runtime:**

- `next@^15.1.6`, `react@^19.0.0`, `react-dom@^19.0.0`
- `class-variance-authority`, `clsx`, `tailwind-merge` (used by `cn()`)
- `lucide-react`, `tailwindcss-animate`
- `motion` (framer-motion successor, required for animate-ui)
- `react-use-measure` (required for animate-ui measurements)

**Dev:**

- `typescript@^5`, `@types/node@^20`, `@types/react@^19`, `@types/react-dom@^19`
- `tailwindcss@^3.4.1`, `postcss@^8`, `autoprefixer@^10.0.1`

**Scripts:**

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

---

## App layout and global styles

- **Layout:** `app/layout.tsx` — Geist + Geist Mono fonts, `./globals.css`, metadata (title: "Monad Blitz Denver", description: "Created for Monad Blitz Denver hackathon"). Body: `font-sans antialiased`.
- **Global CSS:** `app/globals.css` — Tailwind directives, CSS variables for theming, base layer styles

---

## animate-ui integration

This project uses animate-ui components from shadcn registry:

- **Installation:** `npx shadcn@latest add @animate-ui/[component-path]`
- **Example installed:** `@animate-ui/primitives-texts-sliding-number`
- **Location:** `components/animate-ui/primitives/texts/sliding-number.tsx`
- **Hooks:** `hooks/use-is-in-view.tsx` (auto-installed with animate-ui components)

---

## Critical files to transfer for "same setup"

If you want the **exact same** setup in another repo, copy at minimum:

1. **Root:** `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `components.json`, `.gitignore`
2. **App:** `app/globals.css`, `app/layout.tsx` (adjust metadata/app name as needed)
3. **Lib:** `lib/utils.ts` (the `cn()` helper used by all shadcn components)
4. **shadcn components:** entire `components/ui/` directory (all the Radix-based components, if any added)
5. **animate-ui components:** `components/animate-ui/` directory (any animate-ui components you've added)
6. **Hooks:** `hooks/` directory (e.g. `use-is-in-view.tsx` for animate-ui)

Then in the other repo:

- Run `yarn install` (or your package manager)
- Ensure the Tailwind/PostCSS entry in `components.json` points to the same file you use in the app (e.g. `app/globals.css`)
- If the other repo already has a different `app/globals.css`, merge the `:root`, `.dark`, and `@layer base` sections from this project's `app/globals.css` into it
- Ensure `tailwind.config.ts` includes the extended colors, border radius, and plugins

---

## Project structure

```
monad-blitz-denver/
├── app/
│   ├── globals.css          # Tailwind + CSS variables
│   ├── layout.tsx           # Root layout with fonts + metadata
│   └── page.tsx             # Home page (with SlidingNumber example)
├── components/
│   ├── animate-ui/          # animate-ui components
│   │   └── primitives/
│   │       └── texts/
│   │           └── sliding-number.tsx
│   └── ui/                  # shadcn/ui components (add as needed)
├── hooks/
│   └── use-is-in-view.tsx   # Intersection observer hook
├── lib/
│   └── utils.ts             # cn() helper
├── screenshots/             # Original repo assets
├── components.json          # shadcn config
├── next.config.ts           # Next.js config
├── package.json             # Dependencies + scripts
├── postcss.config.mjs       # PostCSS config
├── tailwind.config.ts       # Tailwind config
└── tsconfig.json            # TypeScript config
```

---

## Optional / project-specific

- **App content:** `app/page.tsx` is a simple landing page with the SlidingNumber component. Replace this with your actual app pages.
- **Screenshots folder:** Contains original fork documentation images; can be removed if not needed for submission.
- **Monad Blitz specific:** This is a fork of the Monad Blitz Denver submission template. Keep the `.git` folder to maintain fork relationship for submission.

---

## Adding more components

### shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
# Examples:
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

### animate-ui components:

```bash
npx shadcn@latest add @animate-ui/[component-path]
# Examples:
npx shadcn@latest add @animate-ui/primitives-texts-typing-text
npx shadcn@latest add @animate-ui/primitives-containers-animated-card
```

Browse available components:
- shadcn/ui: https://ui.shadcn.com/docs/components
- animate-ui: https://animate-ui.com/docs

---

## Checklist for replicating in another repo

- [ ] Same Node version and install deps from this `package.json` (or merge deps)
- [ ] Copy `tsconfig.json` and ensure `@/*` and Next plugin are correct
- [ ] Copy `next.config.ts` (or merge options)
- [ ] Copy `postcss.config.mjs` and `tailwind.config.ts`
- [ ] Copy `components.json`
- [ ] Copy `app/globals.css` (or merge Tailwind + CSS variables)
- [ ] Copy `lib/utils.ts` and `app/layout.tsx` (then adjust metadata/fonts)
- [ ] Copy `components/` directory (all UI and animate-ui components)
- [ ] Copy `hooks/` directory
- [ ] Run `yarn install` (or your package manager)
- [ ] Run `yarn dev` and fix any path or import issues

Once that's done, the other repo will be "prepared" with the same configuration as this one; you can then add your actual app pages and features.

---

## Development workflow

1. **Start dev server:** `yarn dev` → http://localhost:3000
2. **Add components:** Use `npx shadcn@latest add` for both shadcn/ui and animate-ui
3. **Build for production:** `yarn build`
4. **Preview production:** `yarn start` (after build)

---

## Color system

The project uses CSS variables for theming, defined in `app/globals.css`:

- `--background`, `--foreground` — page background/text
- `--card`, `--card-foreground` — card backgrounds
- `--primary`, `--primary-foreground` — primary actions
- `--secondary`, `--secondary-foreground` — secondary actions
- `--muted`, `--muted-foreground` — muted/subtle elements
- `--accent`, `--accent-foreground` — accents/highlights
- `--destructive`, `--destructive-foreground` — errors/destructive actions
- `--border`, `--input`, `--ring` — borders, inputs, focus rings
- `--radius` — border radius (0.5rem default)

These are mapped in `tailwind.config.ts` to Tailwind utility classes (e.g. `bg-background`, `text-primary`).

Dark mode support is built-in via the `.dark` class but not yet activated in the layout.
