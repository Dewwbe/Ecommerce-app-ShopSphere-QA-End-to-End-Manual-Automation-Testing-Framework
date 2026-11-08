# ShopSphere – Test Plan

| Field | Value |
|---|---|
| Project | ShopSphere e-commerce platform |
| Document version | 1.0 |
| Author | DEWMINI CHAMODYA |
| Test levels | Unit/API (Jest + Supertest), UI end-to-end (Selenium + TestNG), manual exploratory |

## 1. Objective
Verify that a customer can register, log in, browse and search products, manage a cart, and
reach a payable order, and that the backend services behave correctly on invalid input,
unauthorised access and downstream failures.

## 2. Scope

### In scope
- Registration, login, logout (auth-service + UI)
- Product catalog listing and search (product-service + UI)
- Cart add/remove, empty-cart checkout guard (cart-service + UI)
- Checkout: shipping address validation, order creation, payment step reached (order/payment-service + UI)
- API gateway routing and 502 handling when a downstream service is unavailable
- Authentication/authorisation (401/403), validation (400), not-found/conflict (404/409)

### Out of scope
- Real card processing (Stripe runs in **test mode** only)
- Performance, load and security penetration testing
- Cross-browser beyond Chrome (Firefox is a possible extension)
- Mobile/native apps

## 3. Test approach

| Level | Tool | Where | Notes |
|---|---|---|---|
| Unit | Jest | `services/*/tests/unit` | Middleware, validators, JWT, model validation and event-consumer handlers with all dependencies mocked |
| API integration (in-process) | Jest, Supertest, mongodb-memory-server | `services/*/tests`, `api-gateway/tests` | RabbitMQ, Stripe and inter-service HTTP calls are mocked, so no infrastructure is needed |
| Contract | Jest, Ajv, JSON Schema | `contracts/`, `services/*/tests/contract.test.js` | Producer and consumer of every event and internal HTTP call test against the same schema |
| Cross-service integration | Jest, axios, amqplib | `integration-tests/` | Runs against the live docker-compose stack with real RabbitMQ events |
| Frontend component | Vitest, React Testing Library | `frontend/src` | Forms, navbar, route protection, cart and product list |
| UI automation | Selenium WebDriver, TestNG, Page Object Model | `selenium-tests/` | Locators use `data-testid`; suites tagged `smoke`, `functional`, `regression` |
| Manual / exploratory | Browser, DevTools, RabbitMQ UI | `docs/test-cases.md`, `docs/bug-reports.md` | Session-based charters for areas automation does not cover |

### Test types
- **Smoke** – critical path sanity after each build (`-Dgroups=smoke`)
- **Functional** – each requirement against expected behaviour
- **Regression** – negative and edge cases re-run after every change (`-Dgroups=regression`)
- **Exploratory** – time-boxed, charter-based (see section 8)

## 4. Entry criteria
- Build succeeds (`docker compose up --build`)
- Product catalog seeded (`npm run seed` in product-service)
- Frontend reachable on `http://localhost:3000`

## 5. Exit criteria
- 100 % of smoke tests pass
- At least 95 % of functional and regression tests pass
- No open Critical or High severity defects
- All failed tests have a linked defect (see `docs/bug-reports.md`)

## 6. Test environment

| Item | Value |
|---|---|
| OS | Windows 11 / Ubuntu (CI) |
| Browser | Chrome (headless in CI) |
| Runtime | Node.js 18+, Java 17, Maven 3.9 |
| Infrastructure | Docker Compose: MongoDB 7, RabbitMQ 3.13 |
| URLs | UI `:3000`, gateway `:4000`, services `:4001-4005` |
| Test data | Seeded products (8 items); every UI test registers its own unique user via `TestDataFactory` so tests are independent |

## 7. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Async order/payment status via RabbitMQ causes timing flakiness | Intermittent UI failures | Explicit waits (10 s), no hard sleeps |
| Stripe test keys missing | Payment step cannot be exercised end-to-end | Checkout test stops at "payment step reached"; keys documented in `.env.example` |
| Shared database state between runs | False failures | Unique users per test, idempotent seed |
| UI locators change | Broken tests | `data-testid` attributes and Page Object Model isolate changes |

## 8. Exploratory test charters
1. Explore the cart with extreme quantities (0, negative, very large) to discover stock-validation gaps.
2. Explore authentication with expired, tampered and missing JWTs to discover access-control gaps.
3. Explore checkout with special characters and very long strings in address fields to discover validation and XSS gaps.
4. Explore service resilience by stopping one container mid-flow to discover error-handling gaps.

## 9. Deliverables
- This test plan
- `docs/test-cases.md` – manual and automated test cases
- `docs/traceability-matrix.md` – requirement to test mapping
- `docs/bug-reports.md` – defect log and template
- Automated suites, HTML/TestNG reports and failure screenshots (CI artifacts)

## 10. Defect management
Defects are logged in Jira (project key `SHOP`) using the template in `docs/bug-reports.md`.

| Severity | Definition |
|---|---|
| Critical | System unusable or data loss/security breach, no workaround |
| High | Major function broken, workaround is difficult |
| Medium | Function impaired, workaround exists |
| Low | Cosmetic or minor usability issue |

Lifecycle: `To Do → In Progress → Ready for QA → Retest → Done / Reopened`.
