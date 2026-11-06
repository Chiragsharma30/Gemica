# RULES — Gemica

These rules apply to every change, by every contributor and every AI assistant. If a rule conflicts with a request, stop and raise it first.

---

## 1. Stack Rule

Only these technologies are used:
**Node.js · Express.js · MongoDB (Mongoose) · React.js**
(Vite is allowed solely as the React build tool.)

## 2. No Unnecessary Dependencies

1. Prefer built-in Node.js APIs and browser APIs before adding a package.
2. Before adding any package, answer in `memory.md`: *What does it do? Why can't we do it with the existing stack? Is it maintained and small?*
3. No UI frameworks, CSS frameworks, state libraries, or utility libraries (e.g. Tailwind, Redux, Axios, Lodash, Moment) unless explicitly approved.
4. Remove dependencies that become unused.
5. Keep the approved list in `memory.md` §4 accurate. Unlisted packages must not appear in `package.json`.
6. Pin to stable versions; do not use abandoned or unmaintained packages.

## 3. Don't Break Existing APIs

1. Never rename, remove or change the method or path of a shipped endpoint (see API Registry in `memory.md`).
2. Never change the response shape of an existing endpoint. Add new fields only; never remove or retype existing ones.
3. New required request fields are not allowed on existing endpoints; make them optional with safe defaults.
4. For breaking needs, create a new route (e.g. `/api/v2/...`) and keep the old one working.
5. Database changes must be backward compatible: add fields with defaults, don't drop or rename fields in use; provide a migration script when data must change.
6. Update the API Registry in `memory.md` whenever an endpoint is added or modified.

## 4. Test After Every Change

1. After **every** change, run the relevant tests before moving on.
2. Backend: `npm test` in `backend/`. Frontend: `npm test` in `frontend/`. Run the full suite before merging or finishing a milestone.
3. Every new endpoint needs tests for: success, validation failure, unauthenticated, unauthorized (wrong role/owner), and not-found.
4. Bug fixes need a regression test that fails before the fix.
5. Manually verify the affected user flow in the browser for UI changes (desktop and mobile width).
6. If a test fails, fix it or revert the change. Never skip, delete or weaken tests to get green.
7. Record what was run and the result in the `memory.md` Change Log and tick the item in `tracker.md`.

## 5. Security Rules

1. Never trust client-provided prices, totals, stock, roles or payment status.
2. Hash passwords with bcrypt; never log or return password hashes.
3. Tokens live in HTTP-only cookies only, never in `localStorage`.
4. Validate every request (body, query, params) with schemas; reject unknown fields where practical.
5. Protect admin routes with server-side role checks; check resource ownership for user data.
6. Secrets only in `.env`; commit `.env.example` with placeholder values, never real keys.
7. Verify Razorpay signatures server-side; a frontend success message never marks an order paid.
8. Never store raw card data.
9. Errors in production must not expose stack traces.

## 6. Code Rules

1. Backend layering: routes → controllers → services → models. Controllers stay thin; business logic lives in services.
2. Use one centralized error handler and a shared `ApiError`; wrap async handlers.
3. Use consistent response shape `{ success, data, message }`.
4. Paginate every list endpoint. Add indexes for fields used in filters and sorts.
5. Frontend: functional components and hooks only; reusable components in `components/`; no business-critical logic that only exists on the client.
6. Every data-driven page handles loading, empty, error and success states.
7. Follow `design.md` tokens; no hard-coded colours or fonts.
8. Meaningful names, small functions, no dead code, no commented-out blocks, no leftover `console.log`.

## 7. Workflow Rules

1. Work in small, single-purpose changes.
2. Before coding: read `memory.md` and `tracker.md`. After coding: update both.
3. Branch per feature; commit message format `type: summary`.
4. Do not start a milestone item that depends on an unfinished one.
5. Do not add features outside `prd.md` scope without recording the decision in `memory.md`.

## 8. Definition of "Change Complete"

A change is complete only when:
- [ ] It works as specified
- [ ] Tests were run and pass
- [ ] No existing API or behaviour broke
- [ ] No unnecessary dependency was added
- [ ] `memory.md` and `tracker.md` are updated

## 9. Environment Note
Server tests need a MongoDB binary. If `mongodb-memory-server` cannot download one, set `MONGOMS_SYSTEM_BINARY=/path/to/mongod`.
