const { test, expect } = require("@playwright/test");
const {
  PASSWORD,
  uniqueEmail,
  RegisterPage,
  LoginPage,
  ProductsPage,
  CartPage,
  CheckoutPage,
  registerFreshUser,
} = require("../pages/pages");

// Same scenarios and IDs as the Selenium suite, re-implemented in Playwright.

test.describe("ShopSphere smoke tests", () => {
  test("TC-REG-001: a visitor can register and is logged in automatically @smoke", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.open();
    await register.registerAs();

    await expect(page.getByTestId("nav-username")).toBeVisible();
  });

  test("TC-LOGIN-001: a registered user can log in with correct credentials @smoke", async ({ page }) => {
    const email = await registerFreshUser(page);
    await page.getByTestId("logout-button").click();
    await expect(page.getByTestId("nav-login")).toBeVisible();

    const login = new LoginPage(page);
    await login.open();
    await login.loginAs(email, PASSWORD);

    await expect(page.getByTestId("nav-username")).toBeVisible();
  });

  test("TC-LOGIN-003: logging in with an unregistered email is rejected @smoke", async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.loginAs(uniqueEmail(), PASSWORD);

    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page.getByTestId("nav-username")).toHaveCount(0);
  });

  test("TC-PROD-001: the product catalog loads and lists products @smoke", async ({ page }) => {
    const products = new ProductsPage(page);
    await products.open();

    await expect(products.cards().first()).toBeVisible();
    expect(await products.cards().count()).toBeGreaterThan(0);
  });

  test("TC-CART-001: adding a product places it in the cart @smoke", async ({ page }) => {
    await registerFreshUser(page);
    const products = new ProductsPage(page);
    await products.open();
    await products.addFirstProductToCart();

    const cart = new CartPage(page);
    await cart.open();
    await expect(cart.items()).toHaveCount(1);
  });

  test("TC-CHECKOUT-001: a user can go from catalog to a payable order @smoke", async ({ page }) => {
    await registerFreshUser(page);
    const products = new ProductsPage(page);
    await products.open();
    await products.addFirstProductToCart();

    await new CartPage(page).open();
    await page.getByTestId("checkout-button").click();

    const checkout = new CheckoutPage(page);
    await checkout.fillShippingAddress("123 Galle Road", "Colombo", "00300", "LK");
    await checkout.placeOrder();

    // Order created: the order total is shown together with either the Stripe form
    // or the "not configured" notice when no Stripe key is set.
    await expect(page.getByTestId("order-total")).toBeVisible();
    await expect(page.getByTestId("stripe-not-configured").or(page.getByTestId("payment-form"))).toBeVisible();
  });
});
