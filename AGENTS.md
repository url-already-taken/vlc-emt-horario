# Repository Guidelines

## Project Structure & Module Organization
The app follows the Next.js 14 App Router layout. UI entry points live under `app/`, with shared React components in `app/components/`. Business logic, context providers, and utilities sit in `lib/` (e.g., `lib/BusStopContext.tsx`, `lib/geoUtils.ts`). Static assets such as icons and manifest files belong in `public/`, while Tailwind tokens and global CSS live in `styles/`. Keep experimental scripts or notebooks out of source folders; prefer `data/` for mock JSON and `hooks/` for reusable React hooks.

## Build, Test, and Development Commands
Run `pnpm dev` for the local Next dev server with hot reload. Use `pnpm build` to produce an optimized production bundle (fails fast on type or lint errors). Serve the compiled app with `pnpm start`. Execute `pnpm lint` before every PR to enforce ESLint + Next best practices; the repo does not define a separate `test` script yet, so add custom commands under `package.json` when introducing new suites.

## Coding Style & Naming Conventions
Write all UI in TypeScript with functional React components. Use 2-space indentation, camelCase for variables/functions, and PascalCase for components (`StopCompass.tsx`). Keep files cohesive: colocate component-specific styles and avoid giant modules; split once a file exceeds ~200 lines. Tailwind CSS is the default styling layer—prefer utility classes and extract shared patterns into components when repetition grows. When interacting with the DOM (compass, geolocation), guard for `window` availability to preserve SSR safety.

## Testing Guidelines
Add tests alongside features—component/unit tests in `__tests__/` (Vitest or Jest) and integration smoke tests via Playwright or Cypress under `tests/`. Name test files `<Component>.test.tsx` or `<feature>.spec.ts`. Ensure new code paths either gain coverage or are justified in the PR description. Always run the relevant `pnpm test:<suite>` (define it if missing) plus `pnpm lint` before pushing.

## Commit & Pull Request Guidelines
Follow the existing Conventional Commit style (`feat:`, `fix:`, `refactor:`) as shown in `git log`. Each commit should be scoped and reversible. PRs must describe the change, list reproduction steps, reference issues (e.g., `Closes #123`), and include screenshots or screen recordings for UI work—especially when touching map/compass features. Highlight testing evidence (`pnpm lint`, manual steps) so reviewers can verify quickly.