# ResumeForge AI

Tailors a resume to a specific job description, scores it against ATS criteria, and drafts a matching cover letter. Exports to PDF and DOCX.

Each user brings their own Gemini API key; the server holds no key of its own and stores nothing.

## Running locally

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev          # http://localhost:3000
```

`npm run dev` starts the Express API with Vite in middleware mode, so the API and the frontend share one port.

No `.env` file is required to run: the Gemini key is entered in the app (Settings → API Key) and stored encrypted in the browser, scoped to the signed-in account. `.env.example` documents the variables the AI Studio deployment injects.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (Express + Vite middleware) on port 3000 |
| `npm run build` | Builds the frontend to `dist/` and bundles the server to `dist/server.cjs` |
| `npm start` | Runs the production bundle; honours `PORT` |
| `npm run lint` | `tsc --noEmit` |
| `npm run clean` | Removes `dist/` |

## Layout

```
server.ts              Express API: /api/gemini/{test-key,tailor-resume,generate-cover-letter}
src/utils/api.ts       The only place the frontend talks to those endpoints
src/utils/exports.ts   Lazy facade over the PDF/DOCX exporters (keeps them out of the main bundle)
src/data/models.ts     Single source of truth for Gemini model ids, shared by server and UI
src/utils/crypto.ts    Per-user encrypted API key storage
src/utils/masterProfile.ts  Per-user profile cache + plain-text rendering for prompts
```

Profiles and applications live in Firestore under `users/{uid}`, with localStorage used only as a per-user cache for fast first paint. Firestore rules restrict every document to its owner.

## Notes

- Model ids live in `src/data/models.ts`. If Google renames a model, that file is the only edit.
- `/api/*` is rate limited to 30 requests per minute per IP and accepts at most 2 MB bodies; resume and job-description text is truncated to 20,000 characters before it reaches a prompt.
- The Gemini call retries once on the lite model only when the primary model is temporarily unavailable — never on quota or bad-key errors, which would fail identically.
