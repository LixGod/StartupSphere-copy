# Auth API Calls Audit

**Scope:** `lib/hooks/` and `app/dashboard/`  
**Patterns searched:** `supabase.auth.getUser()`, `supabase.auth.getSession()`, `createClient().auth.getUser()`

Generated before auth consolidation fix.

---

## `lib/hooks/`

| File | Line(s) | Call | Notes |
|------|---------|------|-------|
| `use-business-context.tsx` | — | None | Uses `useAuth()` only (no direct `getUser`/`getSession`) |
| `use-inventory.ts` | — | None | No auth calls |
| `use-accounting.ts` | — | None | No auth calls |
| `use-crm.ts` | — | None | No auth calls |
| `use-workflows.ts` | — | None | No auth calls |
| `use-realtime.ts` | — | None | Uses `createClient()` for realtime only |
| `use-voice-form-fill.ts` | — | None | (out of scope; no matches) |

---

## `app/dashboard/`

| File | Line(s) | Call |
|------|---------|------|
| `sales/page.tsx` | 89 | `supabase.auth.getUser()` |
| `sales/page.tsx` | 105 | `supabase.auth.getUser()` |
| `sales/page.tsx` | 221 | `supabase.auth.getUser()` |
| `sales/page.tsx` | 327 | `supabase.auth.getUser()` |
| `sales/page.tsx` | 398 | `supabase.auth.getUser()` |
| `inventory/page.tsx` | 175 | `supabase.auth.getUser()` |
| `inventory/page.tsx` | 333 | `supabase.auth.getUser()` |
| `inventory/page.tsx` | 406 | `supabase.auth.getUser()` |
| `inventory/page.tsx` | 545 | `supabase.auth.getUser()` |
| `employees/page.tsx` | 40 | `supabase.auth.getUser()` |
| `profile/page.tsx` | 34 | `supabase.auth.getUser()` |
| `profile/page.tsx` | 58 | `supabase.auth.getUser()` |
| `profile/page.tsx` | 96 | `supabase.auth.getUser()` |
| `ai-marketing/page.tsx` | 51 | `supabase.auth.getUser()` |

**Total direct auth calls in scope:** 14 across 5 page files.

---

## Other (not in scope but related)

- `components/providers/auth-provider.tsx` — `getSession()` once on mount (intended)
- `middleware.ts` — `getUser()` for cookie refresh (server)
- `components/dashboard/quick-entry.tsx` — `getUser()` on confirm actions only
