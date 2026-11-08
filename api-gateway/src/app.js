const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * The gateway deliberately does NOT run express.json() globally: that would
 * consume the request body before the proxy can stream it to the target
 * service, breaking file-style or signed bodies (notably the Stripe webhook,
 * which must receive the exact raw bytes it was signed with).
 */
function createApp(serviceUrls = {}) {
  const {
    AUTH_SERVICE_URL = "http://localhost:4001",
    PRODUCT_SERVICE_URL = "http://localhost:4002",
    CART_SERVICE_URL = "http://localhost:4003",
    ORDER_SERVICE_URL = "http://localhost:4004",
    PAYMENT_SERVICE_URL = "http://localhost:4005",
  } = serviceUrls;

  const app = express();
  app.use(cors());

  app.get("/health", (req, res) => res.json({ status: "ok", service: "api-gateway" }));

  const routeTable = [
    { path: "/api/auth", target: AUTH_SERVICE_URL },
    { path: "/api/products", target: PRODUCT_SERVICE_URL },
    { path: "/api/cart", target: CART_SERVICE_URL },
    { path: "/api/orders", target: ORDER_SERVICE_URL },
    { path: "/api/payments", target: PAYMENT_SERVICE_URL },
  ];

  for (const { path, target } of routeTable) {
    app.use(
      path,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        logger: console,
        // Express strips the mount path (e.g. "/api/products") from req.url
        // before handing off to this middleware, so without this rewrite the
        // backend service would receive "/" instead of "/api/products/...".
        pathRewrite: (requestPath) => `${path}${requestPath}`,
        on: {
          error: (err, req, res) => {
            console.error(`[api-gateway] Proxy error for ${path} -> ${target}:`, err.message);
            if (!res.headersSent) {
              res.status(502).json({ error: `Could not reach the service behind ${path}` });
            }
          },
        },
      })
    );
  }

  app.use((req, res) => res.status(404).json({ error: "Not found" }));

  return app;
}

module.exports = { createApp };
