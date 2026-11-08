package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import utils.ConfigReader;

public class RegisterPage extends BasePage {

    private final By firstNameInput = byTestId("firstName-input");
    private final By lastNameInput = byTestId("lastName-input");
    private final By emailInput = byTestId("email-input");
    private final By passwordInput = byTestId("password-input");
    private final By submitButton = byTestId("register-submit");
    private final By errorMessage = byTestId("register-error");

    public RegisterPage(WebDriver driver) {
        super(driver);
    }

    public RegisterPage open() {
        driver.get(ConfigReader.baseUrl() + "/register");
        return this;
    }

    public RegisterPage registerAs(String firstName, String lastName, String email, String password) {
        type(firstNameInput, firstName);
        type(lastNameInput, lastName);
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
