import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";

vi.mock("../api/client", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import client from "../api/client";
import ProtectedRoute from "./ProtectedRoute";
import { renderWithProviders } from "../test/renderWithProviders";

const routes = (
  <Routes>
    <Route path="/login" element={<p>login page</p>} />
    <Route
      path="/secret"
      element={
        <ProtectedRoute>
          <p>secret content</p>
        </ProtectedRoute>
      }
    />
  </Routes>
);

describe("ProtectedRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to /login when logged out", async () => {
    renderWithProviders(null, { route: "/secret", routes });
    expect(await screen.findByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("shows a loading message while the session is being restored", () => {
    localStorage.setItem("token", "t");
    client.get.mockReturnValue(new Promise(() => {}));
    renderWithProviders(null, { route: "/secret", routes });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders children when logged in", async () => {
    localStorage.setItem("token", "t");
    client.get.mockResolvedValue({ data: { user: { firstName: "Ann" } } });
    renderWithProviders(null, { route: "/secret", routes });
    await waitFor(() => expect(screen.getByText("secret content")).toBeInTheDocument());
  });
});
