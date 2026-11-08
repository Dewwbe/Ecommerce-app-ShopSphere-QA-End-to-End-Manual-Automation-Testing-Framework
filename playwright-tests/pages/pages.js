// Small page objects, mirroring the Selenium suite's Page Object Model.
const { randomUUID } = require("crypto");

const PASSWORD = process.env.TEST_PASSWORD || "StrongPass1";

function uniqueEmail() {
  return `qa.pw+${randomUUID().slice(0, 8)}@shopsphere-tests.local`;
}

class RegisterPage {
  constructor(page) {
    this.page = page;
  }
  async open() {
    await this.page.goto("/register");
  }
  async registerAs({ firstName = "QA", lastName = "Tester", email = uniqueEmail(), password = PASSWORD } = {}) {
    await this.page.getByTestId("firstName-input").fill(firstName);
    await this.page.getByTestId("lastName-input").fill(lastName);
    await this.page.getByTestId("email-input").fill(email);
    await this.page.getByTestId("password-input").fill(password);
    await this.page.getByTestId("register-submit").click();
    return email;
  }
}

class LoginPage {
  constructor(page) {
    this.page = page;
  }
  async open() {
    await this.page.goto("/login");
  }
  async loginAs(email, password) {
    await this.page.getByTestId("email-input").fill(email);
    await this.page.getByTestId("password-input").fill(password);
    await this.page.getByTestId("login-submit").click();
  }
}

class ProductsPage {
  constructor(page) {
    this.page = page;
  }
  async open() {
    await this.page.goto("/");
  }
  cards() {
    return this.page.getByTestId("product-card");
  }
  async addFirstProductToCart() {
    await this.cards().first().getByTestId("add-to-cart-button").click();
  }
}

class CartPage {
  constructor(page) {
    this.page = page;
  }
  async open() {
    await this.page.goto("/cart");
  }
  items() {
    return this.page.getByTestId("cart-item");
  }
}

class CheckoutPage {
  constructor(page) {
    this.page = page;
  }
  async fillShippingAddress(line1, city, postal, country) {
    await this.page.getByTestId("address-line1").fill(line1);
    await this.page.getByTestId("address-city").fill(city);
    await this.page.getByTestId("address-postal").fill(postal);
    await this.page.getByTestId("address-country").fill(country);
  }
  async placeOrder() {
    await this.page.getByTestId("place-order-button").click();
  }
}

/** Registers a brand-new user through the UI so each test is independent. */
async function registerFreshUser(page) {
  const register = new RegisterPage(page);
  await register.open();
  const email = await register.registerAs();
  await page.getByTestId("nav-username").waitFor();
  return email;
}

module.exports = { PASSWORD, uniqueEmail, RegisterPage, LoginPage, ProductsPage, CartPage, CheckoutPage, registerFreshUser };
