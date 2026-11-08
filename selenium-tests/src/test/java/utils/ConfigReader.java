package utils;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Loads src/main/resources/config.properties once and exposes typed getters.
 * Keeping environment configuration out of the test classes lets the same
 * suite run against local, staging or CI frontends by swapping one file.
 */
public final class ConfigReader {

    private static final Properties PROPERTIES = new Properties();

    static {
        try (InputStream stream = ConfigReader.class.getClassLoader().getResourceAsStream("config.properties")) {
            if (stream == null) {
                throw new IllegalStateException("config.properties not found on the classpath");
            }
            PROPERTIES.load(stream);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load config.properties", e);
        }
    }

    private ConfigReader() {
    }

    public static String baseUrl() {
        return PROPERTIES.getProperty("base.url", "http://localhost:3000");
    }

    public static String browser() {
        return System.getProperty("browser", PROPERTIES.getProperty("browser", "chrome"));
    }

    public static boolean headless() {
        return Boolean.parseBoolean(System.getProperty("headless", PROPERTIES.getProperty("headless", "true")));
    }

    public static int implicitWaitSeconds() {
        return Integer.parseInt(PROPERTIES.getProperty("implicit.wait.seconds", "5"));
    }

    public static int explicitWaitSeconds() {
        return Integer.parseInt(PROPERTIES.getProperty("explicit.wait.seconds", "10"));
    }

    public static String defaultTestPassword() {
        return PROPERTIES.getProperty("test.password", "StrongPass1");
    }
}
