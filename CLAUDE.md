# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev        # Start development server
yarn build      # Build for production
yarn start      # Start production server
yarn lint       # Run ESLint
```

## Architecture

Next.js 16 app using the App Router (`src/app/`), React 19, TypeScript, and Yarn.

**Key libraries:**
- **HeroUI** (`@heroui/react`) — component library; requires the `HeroUIProvider` wrapper
- **Tailwind CSS v4** — configured via PostCSS (`@tailwindcss/postcss`); HeroUI theme loaded via `@plugin './hero.ts'` in `globals.css`
- **Framer Motion** — animation

**Path alias:** `@/*` → `./src/*`

## Structure

- `src/app/` — App Router pages and layouts
  - `layout.tsx` — root layout; wraps children in `HeroContainer` and applies Geist fonts
  - `globals.css` — Tailwind + HeroUI theme plugin + dark mode variant
  - `hero.ts` — Tailwind plugin export (`heroui()`)
- `src/containers/` — client-side provider wrappers
  - `heroContainer.tsx` — `'use client'` wrapper providing `HeroUIProvider` to the tree

## HeroUI Setup Notes

`HeroContainer` must remain a client component (`'use client'`) because `HeroUIProvider` requires browser APIs. Any new global providers should be added inside `HeroContainer` or alongside it in `layout.tsx`.

The HeroUI source files are explicitly listed in `globals.css` via:
```css
@source '../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}';
```
This is needed for Tailwind v4 to scan HeroUI's classes — do not remove it.
