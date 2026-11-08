package tests;

import org.testng.Assert;
import org.testng.annotations.Test;
import pages.NavBar;
import pages.RegisterPage;
import utils.ConfigReader;
import utils.TestDataFactory;

/**
 * Covers the "Create an account" user journey.
 * Test scenarios derived from the requirement: "A visitor can register for
 * a new account with a valid first name, last name, email and password,
 * and is rejected with a clear error for invalid input."
 */
public class RegistrationTests extends BaseTest {

    @Test(groups = {"functional", "smoke"},
            description = "TC-REG-001: A visitor can register with valid details and is logged in automatically")
    public void registerWithValidDetails_logsUserIn() {
        RegisterPage registerPage = new RegisterPage(driver).open();
        registerPage.registerAs(
                TestDataFactory.uniqueFirstName(),
                TestDataFactory.uniqueLastName(),
                TestDataFactory.uniqueEmail(),
                ConfigReader.defaultTestPassword()
        );

        NavBar navBar = new NavBar(driver);
        Assert.assertTrue(navBar.isLoggedIn(), "User should be logged in immediately after successful registration");
    }

    @Test(groups = {"functional", "regression"},
            description = "TC-REG-002: Registering twice with the same email is rejected")
    public void registerWithDuplicateEmail_showsError() {
        String email = TestDataFactory.uniqueEmail();

        new RegisterPage(driver).open().registerAs(
                TestDataFactory.uniqueFirstName(), TestDataFactory.uniqueLastName(), email, ConfigReader.defaultTestPassword());

        // Second registration attempt, same email, fresh page load.
        RegisterPage secondAttempt = new RegisterPage(driver).open();
        secondAttempt.registerAs(
                TestDataFactory.uniqueFirstName(), TestDataFactory.uniqueLastName(), email, ConfigReader.defaultTestPassword());

        Assert.assertTrue(secondAttempt.hasError(), "Duplicate registration should surface an error message");
    }

    @Test(groups = {"functional", "regression"},
            description = "TC-REG-003: Registering with a password shorter than 8 characters is rejected")
    public void registerWithShortPassword_showsValidationError() {
        RegisterPage registerPage = new RegisterPage(driver).open();
        registerPage.registerAs(
                TestDataFactory.uniqueFirstName(), TestDataFactory.uniqueLastName(), TestDataFactory.uniqueEmail(), "short");

        Assert.assertTrue(registerPage.hasError(), "A password under 8 characters should be rejected client/server side");
    }

    @Test(groups = {"functional", "regression"},
            description = "TC-REG-004: Registering with a malformed email is rejected")
    public void registerWithInvalidEmail_showsValidationError() {
        RegisterPage registerPage = new RegisterPage(driver).open();
        registerPage.registerAs(
                TestDataFactory.uniqueFirstName(), TestDataFactory.uniqueLastName(), "not-an-email", ConfigReader.defaultTestPassword());

        Assert.assertTrue(registerPage.hasError(), "An invalid email format should be rejected");
    }
}
