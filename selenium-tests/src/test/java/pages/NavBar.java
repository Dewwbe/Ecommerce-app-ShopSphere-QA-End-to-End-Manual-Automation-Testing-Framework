package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

/**
 * The navbar is present on every page, so it gets its own small Page Object
 * rather than being duplicated inside each page class.
 */
public class NavBar extends BasePage {

    private final By cartLink = byTestId("nav-cart");
    private final By ordersLink = byTestId("nav-orders");
    private final By logoutButton = byTestId("logout-button");
    private final By usernameLabel = byTestId("nav-username");
    private final By loginLink = byTestId("nav-login");

    public NavBar(WebDriver driver) {
        super(driver);
    }

    public void goToCart() {
        click(cartLink);
    }

    public void goToOrders() {
        click(ordersLink);
    }

    public void logout() {
        click(logoutButton);
    }

    public boolean isLoggedIn() {
        return isDisplayed(usernameLabel);
    }

    public boolean isLoggedOut() {
        return isDisplayed(loginLink);
    }
}
