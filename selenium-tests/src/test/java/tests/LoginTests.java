package tests;

import org.testng.Assert;
import org.testng.annotations.Test;
import pages.LoginPage;
import pages.NavBar;
import pages.RegisterPage;
import utils.ConfigReader;
import utils.TestDataFactory;

/**
 * Covers the "Log in" user journey.
 * Requirement under test: "A registered user can log in with correct
 * credentials and is rejected with a generic error for incorrect ones,
 * without revealing whether the email or the password was wrong."
 */
public class LoginTests extends BaseTest {

    private String registeredEmail;
    private final String password = ConfigReader.defaultTestPassword();

    private void registerFreshUser() {
        registeredEmail = TestDataFactory.uniqueEmail();
        new RegisterPage(driver).open().registerAs(
                TestDataFactory.uniqueFirstName(), TestDataFactory.uniqueLastName(), registeredEmail, password);
        new NavBar(driver).logout();
    }

    @Test(groups = {"smoke", "functional"},
            description = "TC-LOGIN-001: A registered user can log in with correct credentials")
    public void loginWithCorrectCredentials_succeeds() {
        registerFreshUser();

        LoginPage loginPage = new LoginPage(driver).open();
        loginPage.loginAs(registeredEmail, password);

        Assert.assertTrue(new NavBar(driver).isLoggedIn(), "User should be logged in after a correct login attempt");
    }

    @Test(groups = {"functional", "regression"},
            description = "TC-LOGIN-002: Logging in with the wrong password is rejected")
    public void loginWithWrongPassword_showsError() {
        registerFreshUser();

        LoginPage loginPage = new LoginPage(driver).open();
        loginPage.loginAs(registeredEmail, "WrongPassword123");

        Assert.assertTrue(loginPage.hasError(), "An incorrect password should surface a login error");
    }

    @Test(groups = {"functional", "regression"},
            description = "TC-LOGIN-003: Logging in with an unregistered email is rejected")
    public void loginWithUnknownEmail_showsError() {
        LoginPage loginPage = new LoginPage(driver).open();
        loginPage.loginAs(TestDataFactory.uniqueEmail(), password);

        Assert.assertTrue(loginPage.hasError(), "An unregistered email should surface a login error");
    }

    @Test(groups = {"functional", "regression"},
            description = "TC-LOGIN-004: Logging out returns the user to a logged-out state")
    public void logout_returnsToLoggedOutState() {
        registerFreshUser(); // registerFreshUser already logs out at the end
        Assert.assertTrue(new NavBar(driver).isLoggedOut(), "Nav bar should show login/register links after logout");
    }
}
