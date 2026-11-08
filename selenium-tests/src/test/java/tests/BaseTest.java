package tests;

import io.github.bonigarcia.wdm.WebDriverManager;
import io.qameta.allure.Allure;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.testng.ITestResult;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import utils.ConfigReader;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Duration;

/**
 * Common WebDriver setup/teardown for every test class. Each test method
 * gets a fresh browser session so tests stay independent and can run in
 * any order, including in parallel (see testng.xml).
 */
public abstract class BaseTest {

    protected WebDriver driver;

    @BeforeMethod(alwaysRun = true)
    public void setUp() {
        WebDriverManager.chromedriver().setup();

        ChromeOptions options = new ChromeOptions();
        if (ConfigReader.headless()) {
            options.addArguments("--headless=new");
        }
        options.addArguments("--window-size=1366,768");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");

        driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(ConfigReader.implicitWaitSeconds()));
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown(ITestResult result) {
        if (driver != null) {
            if (!result.isSuccess()) {
                captureScreenshotOnFailure(result);
            }
            driver.quit();
        }
    }

    /**
     * Every failed test gets a screenshot saved to target/screenshots, which
     * is what gets attached to the corresponding Jira defect report.
     */
    private void captureScreenshotOnFailure(ITestResult result) {
        try {
            if (!(driver instanceof org.openqa.selenium.TakesScreenshot)) return;
            File src = ((org.openqa.selenium.TakesScreenshot) driver).getScreenshotAs(org.openqa.selenium.OutputType.FILE);
            File dir = new File("target/screenshots");
            if (!dir.exists()) dir.mkdirs();
            String fileName = result.getTestClass().getName() + "." + result.getMethod().getMethodName() + ".png";
            Files.copy(src.toPath(), new File(dir, fileName).toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            // Also embed the screenshot in the Allure report next to the failed test
            Allure.addAttachment("Failure screenshot", "image/png",
                    new ByteArrayInputStream(Files.readAllBytes(src.toPath())), "png");
            System.out.println("[BaseTest] Saved failure screenshot: target/screenshots/" + fileName);
        } catch (IOException e) {
            System.err.println("[BaseTest] Could not save failure screenshot: " + e.getMessage());
        }
    }
}
