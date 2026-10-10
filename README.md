# Loom Ledger — Everest Textile Mills frontend

A Next.js App Router + TypeScript frontend for the daily operating record of a textile mill: yarn receipt, order readiness, production, machine states, QC, roll traceability, dispatch, finance, people, buyer visibility, and administration.

> **This build is a frontend demo, not a production ERP.** The sign-in is a client-side persona selector, browser permissions are UX only, and supported demo commands update in-memory seed state that resets on refresh. No factory, financial, payroll, or buyer record is sent to a service.

## Start

Requirements: Node.js 22 and pnpm 11.25.0 (the pinned package manager).

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Choose **Explore demo** on `/login` and select a persona. `public/manus-routes.json` is the page-route manifest served by the app.

Checks:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Demo personas

The login selector includes Admin, Manager, Manager + Planner, Planner, Operator, Storekeeper, Inspector, Dispatch, HR, Finance, and Buyer profiles. In the authenticated staff shell, the account menu can switch personas to inspect permission boundaries. These are synthetic identities only—there are no passwords or live sessions.

The deterministic seed contains 3 buyers, 5 yarn items, 12 machines, 4 orders, 30 rolls, and 2 shipments. It includes one yarn item below reorder level, three idle machines, in-progress/paused work, QC failures, an open machine breakdown/maintenance record, and buyer-safe tracking examples. Numeric quantities and monetary amounts remain decimal strings; calculations use `decimal.js` except for display-only chart/progress conversions.

## Frontend surfaces

- Public mill landing page, sign-in/demo selector, access/offline states, token-only QR fallback.
- Staff shell with permission-filtered navigation, route/action checks, search, alerts, notifications, a functional large-target Floor mode, reduced-motion mode, and role switching.
- Inventory, orders, production plans/operations, machine board/detail, inspection/rework/defects, rolls/passports, dispatch and print views.
- Finance, HR/payroll, reports/month close/integrity, admin users/roles/master data/settings/audit.
- Buyer-only portal and order tracker with buyer-scoped sample orders and no internal costs, suppliers, or machine details.
- Session-only commands for yarn receiving, machine transitions/downtime, stage-eligible machine assignment, operation transitions/output, QC inspection, rework, shipment creation/dispatch confirmation, and notification read state. These validate permissions, state, reasons, decimal rules and idempotency keys in the demo reducer.

Routes are centrally dispatched through the App Router catch-all while public and buyer pages use isolated route groups. The full route list is in `public/manus-routes.json`.

## Data and backend boundary

`lib/demo/seed.ts` and `lib/demo/commands.ts` power the active in-memory prototype. `lib/api/client.ts`, `lib/api/endpoints.ts`, and `lib/api/adapter.ts` define a typed, **proposed** JSON/API seam with request IDs, error mapping, and idempotency headers, but the HTTP adapter is not activated and no endpoint has been verified against a live backend.

The workspace did not include the named `Textile_Manufacturing_System.pdf`, `part1.md`, or `part2.md`. Therefore, the analyzed route names, permission model, state rules, and proposed API paths need confirmation against the original brief and authoritative database/RPC contract before production integration. UI/client permissions do not replace server-side authentication, Supabase RLS, database constraints, or transaction checks.

### Deliberately unavailable or limited in this demo

- Plan release/material reservation is disabled: no confirmed BOM/yield recipe, FIFO transaction, or backend RPC is available. Cross-unit KG-to-meter arithmetic is never inferred.
- Calendar Gantt is disabled because no authoritative operation schedule timestamps were supplied.
- Evidence selection and camera access are local browser affordances only. Evidence is not uploaded or retained; public QR lookup does not accept an unsigned internal roll code and cannot return private passport data without a verified opaque-token service.
- New order approval/cancellation, inventory adjustment approval, finance cost/payment/expense writes, attendance/payroll approval, role/master-data writes, and report/month-close posting remain review-only or non-mutating surfaces until their exact authoritative commands and separation-of-duties rules are available.
- The generated mill image is illustrative artwork, not a photograph of Everest Textile Mills.

## Structure

```text
app/                         App Router layouts, public pages, buyer portal, shared boundaries
components/public/           Landing page
components/shell/            Staff application shell and navigation
components/portal/           Buyer-only order portal/tracker
components/pages/             Domain page families (orders, inventory, production, QC, finance/HR, admin)
components/ui/                Accessible shared controls, tables, status, evidence and thread primitives
components/motion/            Reduced-motion-aware route motion policy
lib/auth/                     Permission keys, demo personas, route guards
lib/domain/                   DTOs, decimal-safe schemas and display helpers
lib/api/                      Typed transport and provisional endpoint/command mappings
lib/demo/                     Seed state and guarded, append-only session commands
public/                       Brand assets and route manifest
```

## Visual and accessibility direction

The visual system is an industrial neo-brutalist ledger in cotton, ink, loom indigo, turmeric, madder and neem. The Thread motif connects state transitions; display, body and code typography use Bricolage Grotesque, Public Sans and JetBrains Mono. Floor routes keep native scrolling, offer explicit button labels and large touch targets, and respect system or user-selected reduced motion. The landing hero uses one generated illustrative textile-mill image.
