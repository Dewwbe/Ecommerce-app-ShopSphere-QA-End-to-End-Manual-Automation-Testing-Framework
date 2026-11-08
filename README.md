# ShopSphere — Microservices E-Commerce Platform

A complete, runnable e-commerce system built as independent microservices
communicating over RabbitMQ, plus a backend unit/integration test suite
(Jest + Supertest) and a UI functional/smoke/regression suite (Selenium
WebDriver + TestNG) that exercises the running application end to end.

## 1. Architecture

```
                                 ┌─────────────┐
                                 │  Frontend    │  React + Vite (port 3000)
                                 │  (Browser)   │
                                 └──────┬───────┘
                                        │ HTTPS/REST
                                        ▼
                                 ┌─────────────┐
                                 │ API Gateway  │  (port 4000)
                                 └──────┬───────┘
          ┌───────────────┬────────────┼────────────┬───────────────┐
          ▼               ▼            ▼            ▼               ▼
   ┌─────────────┐ ┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐
   │ auth-service │ │product-svc  ││ cart-service││order-service││payment-svc  │
   │  (4001)      │ │  (4002)     ││   (4003)    ││   (4004)    ││  (4005)     │
   └──────┬───────┘ └──────┬──────┘└──────┬──────┘└──────┬──────┘└──────┬──────┘
          │                │              │              │              │
          │   each service has its own MongoDB database  │              │
          │                │              │              │              │
          └────────────────┴──────────────┴──────┬───────┴──────────────┘
                                                   │
                                            ┌──────▼───────┐
                                            │   RabbitMQ    │
                                            │ topic exchange│
                                            │"ecommerce.events"│
                                            └───────────────┘
```

**Asynchronous events (RabbitMQ, topic exchange `ecommerce.events`):**

| Routing key          | Published by    | Consumed by               | Purpose                                   |
|----------------------|------------------|----------------------------|--------------------------------------------|
| `user.registered`    | auth-service     | *(available for future use, e.g. welcome email)* | Decouple registration side-effects |
| `order.created`      | order-service    | cart-service, payment-service | Clear the cart; create a Stripe PaymentIntent |
| `order.cancelled`    | order-service     | *(available for future use)* | Audit/inventory release |
| `payment.succeeded`  | payment-service  | order-service               | Mark order as `PAID` |
| `payment.failed`     | payment-service  | order-service               | Mark order as `PAYMENT_FAILED` |

**Synchronous (REST) calls:**
- `cart-service` → `product-service` to validate price/stock before adding an item.
- `order-service` → `cart-service` to read the cart's contents when placing an order.
- Frontend → `payment-service` to fetch the Stripe PaymentIntent `clientSecret` and confirm payment.

Each service owns its own MongoDB database (database-per-service) and can be
deployed, scaled and restarted independently. Services never share a
database or call each other's internals directly — every cross-service
interaction is either a well-defined REST call or an event on the bus.

## 2. Services

| Service          | Responsibility                                               | Port |
|-------------------|---------------------------------------------------------------|------|
| `api-gateway`     | Single entry point; reverse-proxies `/api/*` to each service | 4000 |
| `auth-service`    | Registration, login, JWT issuance, password hashing (bcrypt) | 4001 |
| `product-service` | Product catalog CRUD, search, stock/price checks             | 4002 |
| `cart-service`    | Per-user shopping cart                                        | 4003 |
| `order-service`   | Order creation and lifecycle (`PENDING_PAYMENT → PAID/FAILED/CANCELLED`) | 4004 |
| `payment-service` | Stripe PaymentIntent creation, confirmation, webhook handling | 4005 |
| `frontend`        | React SPA: register/login, browse, cart, checkout, orders    | 3000 |

## 3. Running the whole stack

### Option A — Docker Compose (recommended)

```bash
cp .env.example .env            # fill in JWT_SECRET and your Stripe TEST keys
docker compose up --build
```

This starts MongoDB, RabbitMQ, all five backend services, the API gateway
and the frontend. Then seed the product catalog once:

```bash
docker compose exec product-service npm run seed
```

- Frontend: http://localhost:3000
- API gateway: http://localhost:4000
- RabbitMQ management UI: http://localhost:15672 (guest/guest)

### Option B — Running services individually (local Node, for development)

For each service under `services/*` and `api-gateway`:

```bash
cd services/auth-service    # repeat per service
cp .env.example .env
npm install
npm run dev
```

You'll need a local MongoDB and RabbitMQ (`docker run -p 27017:27017 mongo:7`
and `docker run -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management-alpine`
are enough). Then seed the catalog:

```bash
cd services/product-service && npm run seed
```

And run the frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Stripe test mode

Payments use Stripe in **test mode only**. Get test keys from
https://dashboard.stripe.com/test/apikeys and set:
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` for `payment-service`
- `VITE_STRIPE_PUBLISHABLE_KEY` for the `frontend`

To receive webhooks locally, forward them with the Stripe CLI:
```bash
stripe listen --forward-to localhost:4000/api/payments/webhook
```
Use Stripe's documented test card numbers (e.g. `4242 4242 4242 4242`, any
future expiry, any CVC) to simulate a successful payment, and
`4000 0000 0000 9995` to simulate a decline.

## 4. Backend test suite (Jest + Supertest)

Each service has its own isolated test suite using an in-memory MongoDB
(`mongodb-memory-server`) and mocks for RabbitMQ/Stripe/HTTP calls to other
services, so tests run fast and need no external infrastructure.

```bash
cd services/auth-service && npm install && npm test
cd services/product-service && npm install && npm test
cd services/cart-service && npm install && npm test
cd services/order-service && npm install && npm test
cd services/payment-service && npm install && npm test
cd api-gateway && npm install && npm test
```

Coverage includes: functional happy paths, input validation, auth/role
checks (401/403), not-found and conflict cases (404/409), and cross-service
failure handling (502 when a downstream service is unreachable).

## 5. UI test suite (Selenium WebDriver + TestNG)

Located in `selenium-tests/`. This is a classic black-box UI automation
project mirroring real QA practice:

- **Page Object Model** (`src/test/java/pages/`) — one class per page,
  elements located by `data-testid` attributes (added throughout the
  frontend specifically to make automation stable against styling changes).
- **Test scenarios/cases derived from requirements** (`src/test/java/tests/`)
  — each `@Test` has a `TC-XXX-NNN` id and a one-line description, the same
  way a test case would be documented in a test management tool before
  being logged as a Jira ticket on failure.
- **TestNG groups**: `smoke`, `functional`, `regression` — run independently
  via `testng.xml` or `-Dgroups=smoke`.
- **WebDriverManager** auto-downloads the right ChromeDriver binary; no
  manual driver setup needed.
- Failed tests automatically save a screenshot to `target/screenshots/`
  — the artifact you'd attach to a Jira defect, with retesting simply being
  re-running the same `@Test` after a fix ships.

### Running it

The frontend (and the full backend stack behind it) must already be running
at `http://localhost:3000` (see section 3), with the product catalog seeded.

```bash
cd selenium-tests
mvn test                      # full suite (functional + regression + smoke)
mvn test -Dgroups=smoke       # smoke tests only
mvn test -Dgroups=regression  # regression tests only
```

Configuration (`src/main/resources/config.properties`): base URL, browser,
headless mode, and wait timeouts — override any of them with `-D`, e.g.
`mvn test -Dheadless=false -Dbase.url=http://localhost:3000`.

### Test case → requirement traceability (sample)

| Test ID        | Requirement                                                   | Type       |
|----------------|----------------------------------------------------------------|------------|
| TC-REG-001     | A visitor can register with valid details                      | Functional / Smoke |
| TC-REG-002/003/004 | Invalid/duplicate registration input is rejected            | Regression |
| TC-LOGIN-001   | A registered user can log in                                   | Smoke / Functional |
| TC-LOGIN-002/003 | Wrong password / unknown email is rejected                   | Regression |
| TC-PROD-001    | The product catalog renders                                    | Smoke / Functional |
| TC-PROD-002/003| Search returns matches / an empty state for no matches         | Regression |
| TC-CART-001    | Adding a product places it in the cart                         | Smoke / Functional |
| TC-CART-002/003| Removing an item empties the cart; an empty cart blocks checkout| Regression |
| TC-CHECKOUT-001| End-to-end: catalog → cart → order → payment step reached       | Smoke / Functional |
| TC-CHECKOUT-002| Checkout requires a shipping address                            | Regression |

## 5a. Playwright suite

`playwright-tests/` re-implements the key smoke scenarios (registration, login, catalog, cart,
checkout) in Playwright, reusing the same `TC-*` IDs. See [playwright-tests/README.md](playwright-tests/README.md).

```bash
cd playwright-tests && npm install && npx playwright install chromium
npm run test:smoke && npm run report
```

## 5b. Test reports

| Suite | Report | How to view |
|---|---|---|
| Selenium + TestNG | Allure (steps, failure screenshots) and Surefire HTML | `cd selenium-tests && mvn test && mvn allure:serve` |
| Playwright | Built-in HTML report with traces | `cd playwright-tests && npm run report` |
| Jest | Console output per service | `npm test` |

<!-- After your first run, save a screenshot to docs/screenshots/ and uncomment:
![Allure report](docs/screenshots/allure-report.png)
![Playwright report](docs/screenshots/playwright-report.png)
-->

## 5c. Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request to `main` and `develop`:

1. Jest tests for each service and the gateway (matrix job)
2. `docker compose up --build`, wait for the frontend, then seed the catalog
3. Selenium smoke tests (`mvn test -Dgroups=smoke`) and an Allure report
4. Playwright smoke tests

Reports and failure screenshots are uploaded as workflow artifacts (`selenium-reports`, `playwright-report`).

## 6. Project layout

```
ecommerce-microservices/
├── api-gateway/
├── services/
│   ├── auth-service/
│   ├── product-service/
│   ├── cart-service/
│   ├── order-service/
│   └── payment-service/
├── shared/rabbitmq/messageBus.js   # shared publish/subscribe helper
├── frontend/                        # React + Vite SPA
├── selenium-tests/                  # Java/Selenium/TestNG UI suite (Allure reports)
├── playwright-tests/                # Playwright smoke suite
├── docs/                            # test plan, test cases, traceability, bug reports
├── .github/                         # CI workflow, PR and issue templates
├── docker-compose.yml
└── .env.example
```

## 7. Notes and possible next steps

- JWT secret is currently shared across services for simplicity (each
  service verifies tokens independently rather than calling back into
  auth-service). In production this would move to asymmetric signing
  (RS256) with auth-service as the sole signer and a shared public key, or
  a dedicated token-introspection endpoint.
- RabbitMQ consumers `nack` a failed message without requeueing; a
  production setup would add a dead-letter exchange and a retry/backoff
  policy instead.
- Stock is decremented nowhere yet — `product-service` only checks
  availability. A real system would reserve/decrement stock transactionally
  (e.g. via a `product.reserve` / `product.release` event pair) around the
  order lifecycle.
- The Selenium suite intentionally does not fill in Stripe's hosted card
  fields (they render inside a cross-origin iframe), so it verifies up to
  "payment step reached," not a completed charge. A full payment can be
  exercised via Stripe test cards using the same flow in a manual test pass.
