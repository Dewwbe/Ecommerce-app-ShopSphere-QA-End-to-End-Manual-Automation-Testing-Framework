package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import utils.ConfigReader;

import java.util.List;

public class ProductsPage extends BasePage {

    private final By productGrid = byTestId("product-grid");
    private final By productCard = byTestId("product-card");
    private final By addToCartButton = byTestId("add-to-cart-button");
    private final By addToCartMessage = byTestId("add-to-cart-message");
    private final By searchInput = byTestId("search-input");
    private final By searchSubmit = byTestId("search-submit");
    private final By noProducts = byTestId("no-products");

    public ProductsPage(WebDriver driver) {
        super(driver);
    }

    public ProductsPage open() {
        driver.get(ConfigReader.baseUrl() + "/");
        return this;
    }

    public List<WebElement> productCards() {
        waitForVisible(productGrid);
        return driver.findElements(productCard);
    }

    public ProductsPage searchFor(String term) {
        type(searchInput, term);
        click(searchSubmit);
        return this;
    }

    public boolean hasNoProductsMessage() {
        return isDisplayed(noProducts);
    }

    /** Adds the first product on the page to the cart. */
    public ProductsPage addFirstProductToCart() {
        List<WebElement> cards = productCards();
        if (cards.isEmpty()) {
            throw new IllegalStateException("No products available to add to cart");
        }
        cards.get(0).findElement(addToCartButton).click();
        return this;
    }

    public boolean sawAddToCartConfirmation() {
        return isDisplayed(addToCartMessage);
    }
}
