import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";

vi.mock("../api/client", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import client from "../api/client";
import RegisterPage from "./RegisterPage";
import { renderWithProviders } from "../test/renderWithProviders";

const routes = (
  <Routes>
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/" element={<p>home page</p>} />
  </Routes>
);

async function fillAndSubmit() {
  await userEvent.type(screen.getByTestId("firstName-input"), "Ann");
  await userEvent.type(screen.getByTestId("lastName-input"), "Lee");
  await userEvent.type(screen.getByTestId("email-input"), "ann@example.com");
  await userEvent.type(screen.getByTestId("password-input"), "StrongPass1");
  await userEvent.click(screen.getByTestId("register-submit"));
}

describe("RegisterPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders all four fields", () => {
    renderWithProviders(null, { route: "/register", routes });
    ["firstName-input", "lastName-input", "email-input", "password-input", "register-submit"].forEach((id) =>
      expect(screen.getByTestId(id)).toBeInTheDocument()
    );
  });

  it("registers and navigates home on success", async () => {
    client.post.mockResolvedValue({ data: { token: "jwt", user: { firstName: "Ann" } } });
    renderWithProviders(null, { route: "/register", routes });
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText("home page")).toBeInTheDocument());
    expect(client.post).toHaveBeenCalledWith("/api/auth/register", {
      firstName: "Ann",
      lastName: "Lee",
      email: "ann@example.com",
      password: "StrongPass1",
    });
  });

  it("joins validation errors from the server", async () => {
    client.post.mockRejectedValue({
      response: {
        data: { errors: ["password must be at least 8 characters", "email must be a valid email address"] },
      },
    });
    renderWithProviders(null, { route: "/register", routes });
    await fillAndSubmit();
    expect(await screen.findByTestId("register-error")).toHaveTextContent(
      "password must be at least 8 characters, email must be a valid email address"
    );
  });

  it("shows a single error such as a duplicate email", async () => {
    client.post.mockRejectedValue({ response: { data: { error: "Email already registered" } } });
    renderWithProviders(null, { route: "/register", routes });
    await fillAndSubmit();
    expect(await screen.findByTestId("register-error")).toHaveTextContent("Email already registered");
  });

  it("falls back to a generic error message", async () => {
    client.post.mockRejectedValue(new Error("network"));
    renderWithProviders(null, { route: "/register", routes });
    await fillAndSubmit();
    expect(await screen.findByTestId("register-error")).toHaveTextContent("Registration failed");
  });
});
