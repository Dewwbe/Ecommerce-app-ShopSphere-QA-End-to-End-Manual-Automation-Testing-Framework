# Requirements Traceability Matrix

| Req ID | Requirement | UI automated | Manual | API (Jest) |
|---|---|---|---|---|
| REQ-01 | A visitor can register with valid details | TC-REG-001 | MAN-002 | auth.test.js |
| REQ-02 | Invalid or duplicate registration is rejected | TC-REG-002, 003, 004 | | auth.test.js |
| REQ-03 | A registered user can log in and log out | TC-LOGIN-001, 004 | MAN-003 | auth.test.js |
| REQ-04 | Invalid credentials are rejected | TC-LOGIN-002, 003 | | auth.test.js |
| REQ-05 | The product catalog is displayed | TC-PROD-001 | MAN-010 | product.test.js |
| REQ-06 | Products can be searched | TC-PROD-002, 003 | | product.test.js |
| REQ-07 | A user can add products to a cart | TC-CART-001 | MAN-001 | cart.test.js |
| REQ-08 | A user can remove cart items; empty cart blocks checkout | TC-CART-002, 003 | | cart.test.js |
| REQ-09 | A user can place an order with a valid shipping address | TC-CHECKOUT-001, 002 | MAN-011, 012 | order.test.js |
| REQ-10 | Payment updates order status | | MAN-007, 008 | payment.test.js, order.test.js |
| REQ-11 | Cart is cleared after an order | | MAN-009 | cart.test.js |
| REQ-12 | Protected endpoints enforce authentication and roles | | MAN-004, 005 | all service tests |
| REQ-13 | Gateway handles unavailable services gracefully | | MAN-006 | gateway.test.js |

## Test levels beyond the UI

| Level | Location | Requirements covered |
|---|---|---|
| Unit | `services/*/tests/unit/` | REQ-01..04 (validation, JWT), REQ-10, REQ-11 (consumers), REQ-12 (auth/role middleware) |
| Contract | `services/*/tests/contract.test.js`, `contracts/` | REQ-07, REQ-09, REQ-10, REQ-11 (payload shapes between services) |
| Cross-service integration | `integration-tests/` | REQ-07..11, REQ-12, REQ-13 over real RabbitMQ and REST |
| Frontend component | `frontend/src/**/*.test.jsx` | REQ-02..08 (forms, navbar, cart, route protection) |
