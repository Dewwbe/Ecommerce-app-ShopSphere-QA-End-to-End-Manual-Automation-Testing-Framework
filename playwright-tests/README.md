# ShopSphere – Playwright tests

A smaller Playwright (JavaScript) suite that re-implements the key smoke scenarios from the
Selenium/TestNG suite. It shows the same tests in a second tool and shares the same `TC-*` IDs.

| Test | Selenium equivalent |
|---|---|
| TC-REG-001 | `RegistrationTests` |
| TC-LOGIN-001, TC-LOGIN-003 | `LoginTests` |
| TC-PROD-001 | `ProductBrowsingTests` |
| TC-CART-001 | `CartTests` |
| TC-CHECKOUT-001 | `CheckoutSmokeTests` |

## Run
The stack must be running with the catalog seeded (see the root README).

```bash
cd playwright-tests
npm install
npx playwright install chromium
npm test                 # all tests
npm run test:smoke       # only @smoke
npm run test:headed      # watch the browser
npm run report           # open the HTML report
```

Override the target with `BASE_URL=http://localhost:3000`.

Reports, screenshots, videos and traces for failures are written to `playwright-report/` and `test-results/`.

## Selenium vs Playwright, as used here
| | Selenium + TestNG | Playwright |
|---|---|---|
| Language | Java | JavaScript |
| Waiting | Explicit `WebDriverWait` | Auto-waiting locators and web-first assertions |
| Locators | `By.cssSelector("[data-testid=...]")` | `getByTestId(...)` |
| Reports | TestNG + Allure | Built-in HTML report with traces |
