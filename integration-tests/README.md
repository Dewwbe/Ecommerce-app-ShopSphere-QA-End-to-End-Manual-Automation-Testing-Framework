# ShopSphere – cross-service integration tests

Black-box tests that run against the **live docker-compose stack** and exercise real
service-to-service REST calls and the real RabbitMQ event flow. They complement the per-service
Jest suites, which mock RabbitMQ and HTTP calls to other services.

| Area | What is verified |
|---|---|
| `order.created` | Placing an order clears the cart (cart-service consumer) |
| `payment.succeeded` / `payment.failed` | An event published on the real exchange moves the order to `PAID` / `PAYMENT_FAILED` (order-service consumer) |
| cart → product (REST) | Price and name come from product-service; insufficient stock and unknown products are rejected |
| order → cart (REST) | Empty cart rejected; orders snapshot the cart; users are isolated from each other |
| gateway | Routing, 401 without or with a bad token, 403 for non-admin, 404 for unknown routes |

Payment-service reacts to `order.created` by calling Stripe. These tests do **not** depend on that
(placeholder Stripe keys are fine); they publish the payment events themselves.

## Prerequisites
```bash
cp .env.example .env            # project root (placeholder Stripe keys are fine)
docker compose up -d --build
docker compose exec product-service npm run seed
```

## Run
```bash
cd integration-tests
npm install
npm test
```

If the stack is down or the catalog is empty, the run fails immediately with a clear message.

Override targets with `GATEWAY_URL` (default `http://localhost:4000`) and
`RABBITMQ_URL` (default `amqp://guest:guest@localhost:5672`).
