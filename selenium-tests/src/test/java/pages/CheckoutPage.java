package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class CheckoutPage extends BasePage {

    private final By addressLine1 = byTestId("address-line1");
    private final By addressCity = byTestId("address-city");
    private final By addressPostal = byTestId("address-postal");
    private final By addressCountry = byTestId("address-country");
    private final By placeOrderButton = byTestId("place-order-button");
    private final By orderError = byTestId("order-error");
    private final By orderTotal = byTestId("order-total");
    private final By stripeNotConfigured = byTestId("stripe-not-configured");
    private final By paymentSuccess = byTestId("payment-success");

    public CheckoutPage(WebDriver driver) {
        super(driver);
    }

    public CheckoutPage fillShippingAddress(String line1, String city, String postalCode, String country) {
        type(addressLine1, line1);
        type(addressCity, city);
        type(addressPostal, postalCode);
        type(addressCountry, country);
        return this;
    }

    public void placeOrder() {
        click(placeOrderButton);
    }

    public boolean hasOrderError() {
        return isDisplayed(orderError);
    }

    public boolean reachedPaymentStep() {
        // Either the Stripe payment form loaded, or (in an environment with no
        // Stripe key configured) the explicit "not configured" message shows —
        // both prove the order was created and the checkout flow progressed.
        return isDisplayed(orderTotal) && (isDisplayed(stripeNotConfigured) || driver.getPageSource().contains("payment-form"));
    }

    public boolean paymentSucceeded() {
        return isDisplayed(paymentSuccess);
    }
}
