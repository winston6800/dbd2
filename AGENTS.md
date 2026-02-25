# AGENTS.md

## Cursor Cloud specific instructions

This is a client-side-only React + Vite application with no backend, no database, and no API keys. All data lives in browser `localStorage`.

### Services

| Service | Command | Port |
|---------|---------|------|
| Vite dev server | `npm run dev` | 3000 |

### Commands reference

See `package.json` scripts for the full list. Key commands:

- **Dev server**: `npm run dev` (serves on `http://localhost:3000`, host `0.0.0.0`)
- **Tests**: `npm run test:run` (single run) or `npm run test` (watch mode)
- **Build**: `npm run build` (outputs to `dist/`)
- **Type check**: `npx tsc --noEmit`

### Notes

- There are pre-existing TypeScript errors in `components/GroupsScreen.tsx` (property access on `unknown` types). These do not block build or tests since `noEmit` is set and Vite/Vitest do not enforce strict type checking during bundling.
- No linter (ESLint) is configured in the project. Use `npx tsc --noEmit` as the closest lint-equivalent check.
- The app uses Tailwind CSS via CDN (`cdn.tailwindcss.com`) in `index.html`, not as an npm dependency.
