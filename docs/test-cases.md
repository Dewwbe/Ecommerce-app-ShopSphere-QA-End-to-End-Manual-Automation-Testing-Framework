# ShopSphere – Test Cases

Automated cases map one-to-one to `@Test` methods in `selenium-tests/src/test/java/tests/`.
Manual cases (`MAN-*`) cover areas that need human judgement. Fill in the **Last result** column
after each execution cycle.

Preconditions for all UI cases: stack running, catalog seeded, browser open at `http://localhost:3000`.

## Automated UI cases (Selenium + TestNG)

| ID | Title | Preconditions | Steps | Expected result | Type | Priority | Last result |
|---|---|---|---|---|---|---|---|
| TC-REG-001 | Register with valid details | Unique email | 1. Open Register 2. Enter name, new email, valid password 3. Submit | Account created, user logged in automatically | Smoke / Functional | High | |
| TC-REG-002 | Duplicate email rejected | Email already registered | 1. Register an email 2. Log out 3. Register same email again | Error message shown, no second account | Regression | High | |
| TC-REG-003 | Short password rejected | – | Register with a 5-character password | Validation error (min 8 characters) | Regression | Medium | |
| TC-REG-004 | Malformed email rejected | – | Register with `not-an-email` | Validation error, no account | Regression | Medium | |
| TC-LOGIN-001 | Login with valid credentials | Registered user | Enter email and password, submit | User logged in, nav shows logged-in state | Smoke / Functional | High | |
| TC-LOGIN-002 | Wrong password rejected | Registered user | Login with an incorrect password | Error message, stays logged out | Regression | High | |
| TC-LOGIN-003 | Unknown email rejected | – | Login with an unregistered email | Error message, stays logged out | Regression | High | |
| TC-LOGIN-004 | Logout | Logged-in user | Click Logout | Returns to logged-out state | Regression | Medium | |
| TC-PROD-001 | Catalog loads | Catalog seeded | Open Products page | At least one product listed | Smoke / Functional | High | |
| TC-PROD-002 | Search with no match | Catalog seeded | Search for a nonsense term | Empty-state message shown | Regression | Medium | |
| TC-PROD-003 | Search known product | Catalog seeded | Search for a seeded product name, e.g. "Wireless Mouse" | Product appears in results | Regression | Medium | |
| TC-CART-001 | Add product to cart | Logged-in user | Add a product from the catalog, open cart | Product listed in cart | Smoke / Functional | High | |
| TC-CART-002 | Remove only item | Cart has 1 item | Remove the item | Cart is empty | Regression | Medium | |
| TC-CART-003 | Empty cart blocks checkout | Empty cart | Try to proceed to checkout | Checkout is not allowed | Regression | High | |
| TC-CHECKOUT-001 | Catalog to payable order | Logged-in user | Add product, open cart, checkout, enter shipping details, place order | Order created and payment step reached | Smoke / Functional | Critical | |
| TC-CHECKOUT-002 | Shipping fields required | Cart has an item | Submit checkout with empty address fields | Validation errors, order not placed | Regression | High | |

## Manual / exploratory cases

| ID | Title | Steps | Expected result | Priority | Last result |
|---|---|---|---|---|---|
| MAN-001 | Add quantity above stock | Add a product, increase quantity beyond its stock (e.g. Headphones stock 45, qty 100) | Rejected with a clear stock message | High | |
| MAN-002 | Special characters in name | Register with name `<script>alert(1)</script>` | Name escaped, no script runs anywhere it is displayed | High | |
| MAN-003 | Tampered JWT | Edit the token in local storage and reload | Redirected to login, API returns 401 | High | |
| MAN-004 | Protected API without token | `GET /api/cart` with no Authorization header | 401 Unauthorized | High | |
| MAN-005 | Customer calls admin endpoint | As a normal user `POST /api/products` | 403 Forbidden | High | |
| MAN-006 | Stop a downstream service | `docker stop shopsphere-product-service`, then browse products | Gateway returns 502 and UI shows a friendly error, not a blank page | Medium | |
| MAN-007 | Order status after payment | Complete a Stripe test payment (`4242 4242 4242 4242`) | Order moves `PENDING_PAYMENT → PAID` | High | |
| MAN-008 | Declined card | Pay with `4000 0000 0000 9995` | Order moves to `PAYMENT_FAILED` and the user is informed | High | |
| MAN-009 | Cart cleared after order | Place an order | Cart is empty afterwards (via `order.created` event) | Medium | |
| MAN-010 | Responsive layout | Open the UI at 375 px and 768 px widths | No overlapping or unreachable controls | Low | |
| MAN-011 | Browser back/forward | Navigate cart → checkout → back | State stays consistent, no duplicate orders | Medium | |
| MAN-012 | Double-click Place Order | Double-click quickly | Only one order is created | High | |

## API test coverage (Jest + Supertest)

| Service | Test file | Focus |
|---|---|---|
| auth-service | `tests/auth.test.js` | Register/login, validation, duplicate (409), bad credentials (401) |
| product-service | `tests/product.test.js` | CRUD, search, role check (403), not found (404) |
| cart-service | `tests/cart.test.js` | Add/remove, stock/price validation, auth (401) |
| order-service | `tests/order.test.js` | Order creation from cart, lifecycle, cancel |
| payment-service | `tests/payment.test.js` | PaymentIntent, webhook handling (Stripe mocked) |
| api-gateway | `tests/gateway.test.js` | Routing, 502 on unreachable service |

## Execution log

| Cycle | Date | Build/commit | Environment | Pass | Fail | Blocked | Tester | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | | | Local Docker | | | | | |
