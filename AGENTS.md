# Repository Guidelines

## Project Structure & Module Organization
This repository is a small Vite + React 19 + TypeScript app. Keep feature work inside [`src/`](/home/claude/Documents/GitHub/google-talk-to-the-book/src).

- [`src/main.tsx`](/home/claude/Documents/GitHub/google-talk-to-the-book/src/main.tsx) boots the app.
- [`src/App.tsx`](/home/claude/Documents/GitHub/google-talk-to-the-book/src/App.tsx) contains the main UI and Gemini Live session logic.
- [`src/lib/`](/home/claude/Documents/GitHub/google-talk-to-the-book/src/lib) holds reusable helpers such as [`logger.ts`](/home/claude/Documents/GitHub/google-talk-to-the-book/src/lib/logger.ts).
- [`src/index.css`](/home/claude/Documents/GitHub/google-talk-to-the-book/src/index.css) defines global Tailwind-based styling.
- Root config lives in `package.json`, `vite.config.ts`, `tsconfig.json`, and `.env.example`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local Vite server on port `3000` and bind to `0.0.0.0`.
- `npm run build`: create a production bundle in `dist/`.
- `npm run preview`: serve the built app locally for verification.
- `npm run lint`: run `tsc --noEmit`; this project uses the script as a typecheck gate, not an ESLint pass.
- `npm run clean`: remove `dist/`.

Set `GEMINI_API_KEY` in `.env.local` for local development. Use `.env.example` as the reference.

## Coding Style & Naming Conventions
Match the existing style: TypeScript, React function components, semicolons, and concise single-purpose helpers. Use `PascalCase` for components and interfaces, `camelCase` for variables, hooks, and functions, and keep utility modules under `src/lib/`. Prefer 2-space indentation in config files and preserve the surrounding style in `.tsx` files. Use the `@/` alias only when it improves readability.

## Testing Guidelines
There is no automated test suite configured yet. Until one is added, every change should pass `npm run lint` and be manually checked through `npm run dev` or `npm run preview`. Document manual verification steps in the PR, especially for microphone, attachment, screen-share, and Gemini response flows.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits, for example `feat: Add attachment and sending capabilities` and `fix: Update Gemini speech configuration`. Continue with prefixes like `feat:`, `fix:`, and scoped forms such as `feat(settings): ...`.

PRs should include a short summary, any environment or API-key implications, linked issues when available, and screenshots or short recordings for UI changes. Call out manual test coverage and any known gaps before requesting review.
