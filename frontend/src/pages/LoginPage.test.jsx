import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";

vi.mock("../api/client", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import client from "../api/client";
import LoginPage from "./LoginPage";
import { renderWithProviders } from "../test/renderWithProviders";

const routes = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<p>home page</p>} />
  </Routes>
);

async function fillAndSubmit(email, password) {
  await userEvent.type(screen.getByTestId("email-input"), email);
  await userEvent.type(screen.getByTestId("password-input"), password);
  await userEvent.click(screen.getByTestId("login-submit"));
}

describe("LoginPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the form fields", () => {
    renderWithProviders(null, { route: "/login", routes });
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit")).toHaveTextContent("Log in");
  });

  it("logs in and navigates home on success", async () => {
    client.post.mockResolvedValue({ data: { token: "jwt", user: { firstName: "Ann" } } });
    renderWithProviders(null, { route: "/login", routes });
    await fillAndSubmit("ann@example.com", "StrongPass1");
    await waitFor(() => expect(screen.getByText("home page")).toBeInTheDocument());
    expect(client.post).toHaveBeenCalledWith("/api/auth/login", {
      email: "ann@example.com",
      password: "StrongPass1",
    });
  });

  it("shows the server error message on failure", async () => {
    client.post.mockRejectedValue({ response: { data: { error: "Invalid credentials" } } });
    renderWithProviders(null, { route: "/login", routes });
    await fillAndSubmit("ann@example.com", "wrongpass");
    expect(await screen.findByTestId("login-error")).toHaveTextContent("Invalid credentials");
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
  });

  it("falls back to a generic error message", async () => {
    client.post.mockRejectedValue(new Error("network"));
    renderWithProviders(null, { route: "/login", routes });
    await fillAndSubmit("ann@example.com", "wrongpass");
    expect(await screen.findByTestId("login-error")).toHaveTextContent("Login failed");
  });

  it("disables the button while submitting", async () => {
    client.post.mockReturnValue(new Promise(() => {}));
    renderWithProviders(null, { route: "/login", routes });
    await fillAndSubmit("ann@example.com", "StrongPass1");
    expect(screen.getByTestId("login-submit")).toBeDisabled();
    expect(screen.getByTestId("login-submit")).toHaveTextContent("Logging in...");
  });
});
