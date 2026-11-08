package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import utils.ConfigReader;

public class LoginPage extends BasePage {

    private final By emailInput = byTestId("email-input");
    private final By passwordInput = byTestId("password-input");
    private final By submitButton = byTestId("login-submit");
    private final By errorMessage = byTestId("login-error");

    public LoginPage(WebDriver driver) {
        super(driver);
    }

    public LoginPage open() {
        driver.get(ConfigReader.baseUrl() + "/login");
        return this;
    }

    public LoginPage loginAs(String email, String password) {
        type(emailInput, email);
        type(passwordInput, password);
        click(submitButton);
        return this;
    }

    public boolean hasError() {
        return isDisplayed(errorMessage);
    }

    public String errorText() {
        return textOf(errorMessage);
    }
}
