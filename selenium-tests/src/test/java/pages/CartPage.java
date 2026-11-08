package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import utils.ConfigReader;

import java.util.List;

public class CartPage extends BasePage {

    private final By cartItems = byTestId("cart-item");
    private final By cartTotal = byTestId("cart-total");
    private final By emptyCart = byTestId("empty-cart");
    private final By checkoutButton = byTestId("checkout-button");
    private final By removeButton = byTestId("cart-item-remove");

    public CartPage(WebDriver driver) {
        super(driver);
    }

    public CartPage open() {
        driver.get(ConfigReader.baseUrl() + "/cart");
        return this;
    }

    public List<?> items() {
        return driver.findElements(cartItems);
    }

    public int itemCount() {
        return driver.findElements(cartItems).size();
    }

    public boolean isEmpty() {
        return isDisplayed(emptyCart);
    }

    public String totalText() {
        return textOf(cartTotal);
    }

    public void proceedToCheckout() {
        click(checkoutButton);
    }

    public void removeFirstItem() {
        click(removeButton);
    }
}
