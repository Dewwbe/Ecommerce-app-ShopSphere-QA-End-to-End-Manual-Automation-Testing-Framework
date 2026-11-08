package tests;

import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;
import pages.CartPage;
import pages.CheckoutPage;
import pages.ProductsPage;
import pages.RegisterPage;
import utils.ConfigReader;
import utils.TestDataFactory;

/**
 * End-to-end smoke test for the critical revenue path: browse -> add to
 * cart -> checkout -> order is created and a payment is initialized.
 *
 * This suite intentionally stops short of entering real card details into
 * Stripe's hosted payment element (that would require Stripe test-mode
 * iframe automation, which is brittle and out of scope for a UI regression
 * suite); it verifies the order + payment-initialization leg of the flow,
 * which is what the frontend and backend services under test actually own.
 */
public class CheckoutSmokeTests extends BaseTest {

    @BeforeMethod(alwaysRun = true, dependsOnMethods = "setUp")
    public void loginAsFreshUser() {
        new RegisterPage(driver).open().registerAs(
                TestDataFactory.uniqueFirstName(),
                TestDataFactory.uniqueLastName(),
                TestDataFactory.uniqueEmail(),
                ConfigReader.defaultTestPassword());
    }

    @Test(groups = {"smoke", "functional"},
            description = "TC-CHECKOUT-001: A user can go from the product catalog to a confirmed, payable order")
    public void endToEndCheckout_reachesPaymentStep() {
        new ProductsPage(driver).open().addFirstProductToCart();

        CartPage cartPage = new CartPage(driver).open();
        Assert.assertEquals(cartPage.itemCount(), 1, "Precondition: exactly one item should be in the cart");
        cartPage.proceedToCheckout();

        CheckoutPage checkoutPage = new CheckoutPage(driver);
        checkoutPage.fillShippingAddress("123 Galle Road", "Colombo", "00300", "LK");
        checkoutPage.placeOrder();

        Assert.assertTrue(checkoutPage.reachedPaymentStep(),
                "Placing an order from a non-empty cart should create the order and reach the payment step");
    }

    @Test(groups = {"functional", "regression"},
            description = "TC-CHECKOUT-002: Shipping address fields are required before an order can be placed")
    public void checkoutWithoutShippingAddress_isBlockedByRequiredFields() {
        new ProductsPage(driver).open().addFirstProductToCart();
        new CartPage(driver).open().proceedToCheckout();

        CheckoutPage checkoutPage = new CheckoutPage(driver);
        checkoutPage.placeOrder(); // fields left blank

        // HTML5 "required" validation keeps the browser on the address form,
        // so the payment step should not have been reached.
        Assert.assertFalse(checkoutPage.reachedPaymentStep(),
                "Submitting the address form with required fields blank should not reach the payment step");
    }
}
