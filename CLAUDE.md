@AGENTS.md

# KADR TOP UZ — project notes for agents

- Business rules and security live in the database (RLS + BEFORE triggers + SECURITY DEFINER RPCs). Never move a
  rule to the app only; mirror it (e.g. `features/applications/status.ts` ↔ `application_transition_allowed`).
- Guard triggers must stay SECURITY INVOKER: `is_backend_role()` checks `current_user`, which is the function owner
  inside SECURITY DEFINER functions.
- After changing migrations: `npm run test:db` (SQL/RLS tests) and `npm run test:db -- --setup-only && npm run db:types`.
- Reference data (regions, districts, catalogue) is generated: edit `scripts/data/*.mjs`, then `npm run db:reference`.
- UI text is Uzbek (Latin, official ʻ U+02BB / ʼ U+02BC). Enum labels: `src/lib/i18n/uz.ts`.
- Pass server actions to client components as references or `.bind(null, id)` — never inline arrow functions.
- Full verification: `npm run check`, `npm run test:db`, `npm run stack:setup && npm run test:e2e`.
