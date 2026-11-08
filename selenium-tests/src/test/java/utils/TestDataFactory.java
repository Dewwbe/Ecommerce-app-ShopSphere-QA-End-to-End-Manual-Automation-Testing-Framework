package utils;

import java.util.UUID;

/**
 * Generates unique, disposable test data so parallel/regression runs never
 * collide on a unique field such as the user's email address.
 */
public final class TestDataFactory {

    private TestDataFactory() {
    }

    public static String uniqueEmail() {
        return "qa.test+" + UUID.randomUUID().toString().substring(0, 8) + "@shopsphere-tests.local";
    }

    public static String uniqueFirstName() {
        return "QA";
    }

    public static String uniqueLastName() {
        return "Tester" + UUID.randomUUID().toString().substring(0, 4);
    }
}
