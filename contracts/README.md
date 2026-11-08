# Service contracts

JSON Schemas describing every message and internal HTTP response that crosses a service boundary.
Both sides of each interaction test against the **same** schema, so a producer cannot change a
payload without breaking the consumer's build (a lightweight, dependency-free take on
consumer-driven contract testing).

| Contract | Producer | Consumer | Verified in |
|---|---|---|---|
| `events/order.created` | order-service | cart-service, payment-service | order-service (producer), cart-service and payment-service (consumer) |
| `events/payment.succeeded` | payment-service | order-service | payment-service (producer), order-service (consumer) |
| `events/payment.failed` | payment-service | order-service | payment-service (producer), order-service (consumer) |
| `http/check-availability.response` | product-service | cart-service | product-service (provider), cart-service (consumer) |
| `http/cart.response` | cart-service | order-service | cart-service (provider), order-service (consumer) |

Each schema has an `examples` entry that consumers feed into their handlers. Tests live in
`services/*/tests/contract.test.js` and use [Ajv](https://ajv.js.org/).

When you change a payload: update the schema first, then both services. A failing contract test
in the other service means you are about to break it.
