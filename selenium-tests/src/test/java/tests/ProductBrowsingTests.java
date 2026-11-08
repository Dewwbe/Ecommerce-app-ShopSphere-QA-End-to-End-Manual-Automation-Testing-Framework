package tests;

import org.testng.Assert;
import org.testng.annotations.Test;
import pages.ProductsPage;

import java.util.List;

/**
 * Covers browsing the product catalog, a core journey that must work even
 * for anonymous (not logged in) visitors.
 * Prerequisite: product-service has been seeded (npm run seed) with the
 * demo catalog before this suite runs.
 */
public class ProductBrowsingTests extends BaseTest {

    @Test(groups = {"smoke", "functional"},
            description = "TC-PROD-001: The product catalog loads and lists at least one product")
    public void productCatalog_loadsSuccessfully() {
        ProductsPage productsPage = new ProductsPage(driver).open();
        List<?> cards = productsPage.productCards();

        Assert.assertFalse(cards.isEmpty(), "Expected the seeded product catalog to render at least one product card");
    }

    @Test(groups = {"functional", "regression"},
            description = "TC-PROD-002: Searching for a term that matches no product shows an empty-state message")
    public void searchWithNoMatches_showsEmptyState() {
        ProductsPage productsPage = new ProductsPage(driver).open();
        productsPage.searchFor("xyz-does-not-exist-anywhere-123");

        Assert.assertTrue(productsPage.hasNoProductsMessage(), "An unmatched search should show the empty-state message");
    }

    @Test(groups = {"functional", "regression"},
            description = "TC-PROD-003: Searching for a known seeded product returns it in the results")
    public void searchWithKnownTerm_returnsMatchingProducts() {
        ProductsPage productsPage = new ProductsPage(driver).open();
        productsPage.searchFor("Keyboard");

        List<?> cards = productsPage.productCards();
        Assert.assertFalse(cards.isEmpty(), "Searching for a known seeded product name should return at least one match");
    }
}
