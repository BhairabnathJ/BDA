# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mental Clarity** is a visual thought organization app that provides psychological relief through spatial externalization of mental chaos. Users brain-dump via voice/text, and the app creates an interactive node graph of their thoughts. It has two modes: a 2AM crisis mode (minimal UI, cathartic gesture, forced rest) and a daytime exploration mode (full interactive graph). See `PRD.md` for full product requirements and `UIUXspec.md` for detailed UI/UX specifications.

## Commands

All commands run from `mental-clarity/`:

- **Dev server:** `npm run dev`
- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Lint:** `npm run lint`
- **Preview production build:** `npm run preview`

## Tech Stack

- React 19 + TypeScript (strict mode) with Vite 7
- CSS custom properties for design tokens (no CSS framework)
- `clsx` for conditional class composition via `cn()` utility at `src/utils/cn.ts`
- ESLint with TypeScript and React Hooks plugins

## Architecture

The app is in early stage. The code lives entirely in `mental-clarity/`.

- **`src/styles/variables.css`** — Design token system (colors, typography, spacing, radii, shadows, animation curves/durations, responsive breakpoints). All values derived from the UI/UX spec. Use these CSS variables everywhere; do not hardcode values.
- **`src/styles/global.css`** — Reset, base typography, and `.bg-dot-grid` utility class (the signature dot-grid background).
- **`src/utils/cn.ts`** — Class name merge utility wrapping `clsx`.
- **`@` path alias** — Configured in both Vite (`vite.config.ts`) and TypeScript (`tsconfig.app.json`) to resolve to `./src/`. Use `@/` imports.

## Design System Conventions

- **Spacing:** 8px base unit system. Always use `--space-*` tokens.
- **Colors:** Warm beige base (`#F5F1E8`), soft blue primary (`#A8C5D1`). Node categories use gradient tokens (`--gradient-organic`, `--gradient-technical`, etc.).
- **Animation:** Use organic easing (`--ease-organic`, `--ease-spring`). Nothing mechanical — nodes bloom, connections flow. Refer to `--duration-*` tokens.
- **Typography:** Inter font, light/regular weights. Minimal text — the interface communicates through visual language.
- **Responsive breakpoints:** Tablet at 1023px, mobile at 767px. Tokens auto-adjust via media queries in `variables.css`.

## Key Design Principles

- Emotional design first — every visual element serves a psychological function before utility
- No text unless absolutely necessary; communicate through color, motion, proximity, depth, opacity
- Local-first architecture — all user data stays on device by default
- Zero cognitive burden during crisis mode (2AM)
