# Loom Ledger — Frontend Implementation Plan

## Scope and source status

Implement the complete **frontend** for Everest Textile Mills as a Next.js App Router and TypeScript application. The only supplied source is `Overall_Implementation.md`. That file identifies `Textile_Manufacturing_System.pdf`, `part1.md`, and `part2.md` as inputs to its analysis, but those source files were not included in the workspace. Its detailed domain rules and frontend plan are the implementation guide; its proposed REST naming and any `[ADDED]` items remain assumptions until the backend team confirms them.

This project will not create a Supabase schema, server handlers, credentials, database, or actual authentication service. The frontend defines typed HTTP/JSON client and proposed endpoint/command scaffolding for `/api/v1`, but the active application remains in seeded demo mode; the HTTP adapter is not activated and no endpoint was verified. Demo mutations update in-memory in-browser state only and reset on refresh; they must never be represented as durable factory records. Switching to a real service is a backend-contract, auth/RLS, and integration task, not an implicit deliverable here.

## Implementation approach

- Use **Next.js App Router + strict TypeScript**, route-group layouts for public pages, staff pages, buyer portal, and print views, and reusable client components for interactive controls.
- Create a coherent vertical slice first: design tokens, application shell, navigation/permission layer, fixtures, API client and error mapping, then implement all documented modules using shared tables, forms, status chips, meters, timelines, dialogs, and empty/loading/error states.
- Keep the API adapter transport-neutral. Deterministic seeded fixtures and front-end-only command handlers support browsing and demonstrating the six scene journeys. The typed HTTP adapter uses the planned JSON envelope and preserves decimal strings, but is future-only until a confirmed server contract and server-side session/RLS exist. Missing/`[PROPOSED]` endpoints are isolated and labelled in the adapter rather than spread through page components.
- The primary truth for states, permissions, quantities, and money remains the backend contract. Frontend guards improve feedback but do not claim to replace database enforcement. Do not optimistically persist stock, rolls, shipment, payroll, or finance mutations.
- Use permission keys and the union of a user's permissions, not role-name checks, for navigation and action visibility. A buyer portal is isolated from staff shells and staff-only data.
- Use human-facing entity codes in the UI. Keep UUIDs internal to routes/API. Preserve quantities and money as decimal strings; use a decimal library for arithmetic; never add or compare unlike units.
- Floor-critical paths use native scroll, large touch controls, keyboard operation, explicit pending/success/error states, and short feedback-only motion. Office pages use restrained motion. The landing page, buyer portal, tracker, and roll passport may use showcase motion. Honor reduced-motion preferences and avoid motion that blocks work.

## Product modules and route coverage

The UI covers the six daily scenes and the associated documented areas:

- **Public and cross-cutting:** `/`, `/login`, `/403`, `/offline`, `/alerts`, `/notifications`, `/dashboard`, `/my-work`, global search/command palette, scan entry, and shared not-found/error handling.
- **Inventory:** `/inventory`, `/inventory/receive`, `/inventory/batches/[id]`, `/inventory/reservations`, `/inventory/adjustments`, `/inventory/movements`.
- **Orders:** `/orders`, `/orders/new`, `/orders/[id]` with overview, material, plans, rolls, dispatch, money, timeline, and tracker views.
- **Production:** `/production`, `/production/plans/[id]`, `/production/operations/[id]`, `/production/shift-summary`.
- **Machines:** `/machines`, `/machines/[id]`, downtime and maintenance panels.
- **Quality and traceability:** `/quality`, `/quality/inspect/[code]`, `/quality/rework`, `/quality/defects`, `/rolls`, `/rolls/[code]`, `/scan`, `/r/[token]`.
- **Dispatch:** `/dispatch`, `/dispatch/new`, `/dispatch/[id]`, `/dispatch/stock`, plus `/print/dispatch/[id]` and `/print/roll-tag/[id]`.
- **Finance and people:** `/finance`, `/finance/orders/[id]`, `/finance/entries`, `/finance/payments`, `/finance/expenses`, `/hr/attendance`, `/hr/payroll`, `/hr/payroll/[id]`, `/reports`, `/reports/month-close`, `/verify`.
- **Administration:** `/admin/users`, `/admin/roles`, `/admin/master/[resource]`, `/admin/settings`, `/admin/audit`.
- **Buyer-only portal:** `/portal`, `/portal/orders/[id]`.

The implementation will prioritize shared page templates and useful working workflows over placeholder route duplication. Where a screen depends on unavailable backend data, demo fixtures will show a clearly-labelled example; absent capabilities will use explicit unavailable/assumption states rather than fake success.

## Domain guardrails represented in the UI

- **Orders:** DRAFT → CONFIRMED → PLANNED → IN_PRODUCTION → CLOSED, with cancellation only when no rolls were dispatched. Derived display status precedence is dispatched, partially dispatched, ready-for-dispatch, then underlying status. Display stage and quality-hold overlay separately.
- **Plans and operations:** plan release reserves FIFO material and shortage blocks release unless the caller has both required permission keys and supplies a reason of at least five characters. Operations move only through documented legal states. Start requires valid assignment and machine, complete requires output, last-stage roll quantities must equal good output, and previous-stage WIP comparisons require the same unit.
- **Machines:** expose only legal next statuses; RUNNING requires an in-progress operation. Breakdown requires a reason and opens downtime; prevent a second open downtime event.
- **Rolls and quality:** only ACCEPTED rolls may be allocated. REWORK and REJECT require at least one defect; REJECT and quarantine require a reason. Quarantine/release/re-inspection preserve full append-only history. No split/merge UI.
- **Dispatch:** only eligible rolls for the selected order can be allocated; enforce the order quantity/over-delivery meter; confirmation is idempotent in the API contract and results in one invoice. Never imply a browser-only success is a real dispatch.
- **Inventory and finance:** present on-hand, reserved, available, and held independently; receipt accepted + damaged + quarantined must equal received; issue only reserved batches; append-only movement/cost/inspection/output history is never editable/deletable. Label ACTUAL/ALLOCATED/ESTIMATED/MISSING basis; missing rates are not zero.
- **Approvals and access:** surface separation-of-duties restrictions; approvers cannot approve their own requests. Permission failures have a clear Forbidden state. Buyer views contain only buyer-safe order status, quantities, dispatches, and invoices.

## Data and interaction architecture

- `lib/api/client.ts`: configurable base URL, same-origin JSON transport, request IDs, idempotency header, envelope unwrapping, and typed `ApiError`; `ERROR_COPY` is centralized here.
- `lib/api/endpoints.ts`: typed resource functions and `[PROPOSED]` route/command shapes; no page component performs ad-hoc transport.
- `lib/api/adapter.ts`: demo command adapter and future-only HTTP adapter. The active `DemoProvider` uses the demo reducer only; no live switch is wired.
- `lib/demo/`: deterministic seed state, permission-edge fixtures, session-only command reducer and `DemoProvider`.
- `lib/auth/`: demo persona/permission profiles, route guards, permission-filtered navigation and permission-based landing resolution.
- `lib/domain/`: DTO types, Decimal/Zod schemas, quantity/currency/date formatters, and state labels.
- Forms use controlled React state plus Zod schemas; they preserve decimal strings and validate documented scale/reason/defect requirements. Implemented mutations use stable idempotency keys and show pending state; incomplete live interactions are explicit unavailable/review surfaces.
- TanStack Query is configured at the provider boundary for future reads, but current pages read seeded demo state rather than remote data. Route-level loading/error/not-found boundaries are provided; cross-panel network error isolation awaits live queries.
- The core demo seed contains **3 buyers, 5 yarn items (one below reorder), 12 machines (one BREAKDOWN and three IDLE), 4 orders (one at risk), 30 rolls across statuses, and 2 shipments**. Payroll/back-office rows remain illustrative rather than a validated persisted payroll-period model.
- Polling/realtime is represented as configurable refresh behavior; absent a real backend, the demo must not claim realtime synchronization.

## Project structure

```text
app/
  (public)/                 landing, sign-in and public errors
  (staff)/                  permission-aware staff shell and catch-all dispatcher
  (portal)/portal/           isolated buyer shell and buyer-safe routes
  print/                     print-only dispatch and roll-tag views
  layout.tsx                 fonts, providers and global styles
  globals.css                tokens, base styles and shared components
components/
  shell/                     sidebar, topbar, breadcrumbs, search, notifications
  ui/                        accessible controls, tables, slabs, toast, evidence picker, meters
  pages/                     domain page families (orders, inventory, production, quality, dispatch, back office, admin)
  public/                    landing page
  portal/                    buyer-only order portal and tracker
  motion/                    route motion policy and reduced-motion support
lib/
  api/                        client, endpoint list, adapter boundary, query keys
  demo/                       seeded fixtures, validated commands and demo state
  auth/                       persona and permission helpers
  domain/                     domain types, decimal/date/unit/status utilities
public/
  manus-routes.json           complete route manifest for page routes
  loom-ledger-mark.svg        ownable brand mark
```

Route groups may be adjusted to avoid conflicting URLs while preserving the route surface above. Shared layouts must not leak staff navigation or operational data into the buyer portal.

## Design system

- **Design Movement:** Neo-Brutalist industrial editorial design, expressed as a contemporary mill's working ledger rather than generic SaaS chrome.
- **Core Principles:** (1) legibility before decoration; (2) visible state and explicit evidence; (3) hard-edged physicality and high-contrast controls; (4) playful traceability only where it improves understanding.
- **Color Philosophy:** warm cotton paper makes long shifts easier to read; ink provides unambiguous contrast; indigo is the operational signature; turmeric marks action and attention; madder means blocked or unsafe; neem signals accepted/healthy states. Status is always labelled in text and never conveyed only by color.
- **Layout Paradigm:** asymmetric editorial workbench—persistent narrow staff rail plus a broad content canvas, with a sticky contextual action/summary slab on demanding floor forms. Avoid a centered generic dashboard grid; organize screens by the real flow and strongest operator question.
- **Signature Elements:** (1) an orthogonal, loom-like SVG **Thread** connecting stages and events; (2) visible selvedge stripes and ink-heavy slabs that make state feel tangible; (3) square status stamps and ruled ledger tables for committed facts.
- **Interaction Philosophy:** deliberate, direct, reversible where the domain permits; large, labelled actions; no drag-only operations; destructive or risky changes require a reason and a clear review state. Display pending rather than pretending stock/dispatch changes have already persisted.
- **Animation:** documented T0/T1/T2 motion tiers. T0 uses native scroll and only brief, non-blocking feedback (press, toast, stamp, invalid-field focus). T1 uses restrained entry/count/meter/tab motion. T2 reserves Thread draw, optional pinned story cards, and route/roll-passport flourishes. Reduced motion removes smooth scrolling and scroll-linked/decorative movement. No animation may hide content, delay controls, or obstruct floor work.
- **Typography System:** Bricolage Grotesque for large display headings, Public Sans for UI/body, JetBrains Mono only for human codes and tabular numerals; Noto Sans fallback for Indic scripts. Use clear sizes and tabular figures for measurements.
- **Brand Essence:** “The mill's shared record—from yarn gate to buyer dispatch.” Personality: **grounded, exact, accountable**.
- **Brand Voice:** concise, operational, plain English; name the thing and its state. Examples: “Available: 1,240.500 KG” and “This roll needs a re-check before it can ship.”
- **Wordmark & Logo:** a custom thread-path mark that passes through three square loom teeth, paired with the Loom Ledger wordmark; use the mark as an inline SVG/favicon and the wordmark in the shell rather than a default text-only logo.
- **Signature Brand Color:** deep loom indigo, reserved for primary actions and the Thread so the product has a recognizable operational anchor.

## Dependencies and serving

Use pinned pnpm and strict TypeScript. Current runtime dependencies are Next.js/React, Tailwind, TanStack Query provider scaffolding, Zod, decimal.js, Lucide icons, and a restrained GSAP/Lenis motion stack. Forms are controlled rather than React Hook Form, and custom table primitives are used rather than TanStack Table. Do not request Supabase or a managed database for this frontend-only stage. Run the Next.js app on the initialized project's configured port and serve `/manus-routes.json` on the same origin. No public deployment is implied by this implementation request.
