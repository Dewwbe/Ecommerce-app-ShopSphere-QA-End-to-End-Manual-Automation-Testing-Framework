import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";

vi.mock("../api/client", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import client from "../api/client";
import Navbar from "./Navbar";
import { renderWithProviders } from "../test/renderWithProviders";

const routes = (
  <>
    <Navbar />
    <Routes>
      <Route path="/login" element={<p>login page</p>} />
      <Route path="*" element={<p>home</p>} />
    </Routes>
  </>
);

describe("Navbar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows login and register links when logged out", async () => {
    renderWithProviders(null, { routes });
    expect(await screen.findByTestId("nav-login")).toBeInTheDocument();
    expect(screen.getByTestId("nav-register")).toBeInTheDocument();
    expect(screen.getByTestId("nav-products")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-cart")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nav-orders")).not.toBeInTheDocument();
    expect(screen.queryByTestId("logout-button")).not.toBeInTheDocument();
  });

  it("shows cart, orders, username and logout when logged in", async () => {
    localStorage.setItem("token", "t");
    client.get.mockResolvedValue({ data: { user: { firstName: "Ann" } } });
    renderWithProviders(null, { routes });
    expect(await screen.findByTestId("nav-username")).toHaveTextContent("Hi, Ann");
    expect(screen.getByTestId("nav-cart")).toBeInTheDocument();
    expect(screen.getByTestId("nav-orders")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-login")).not.toBeInTheDocument();
  });

  it("logout clears the session and navigates to /login", async () => {
    localStorage.setItem("token", "t");
    client.get.mockResolvedValue({ data: { user: { firstName: "Ann" } } });
    renderWithProviders(null, { routes });
    await userEvent.click(await screen.findByTestId("logout-button"));
    await waitFor(() => expect(screen.getByText("login page")).toBeInTheDocument());
    expect(localStorage.getItem("token")).toBeNull();
    expect(screen.getByTestId("nav-login")).toBeInTheDocument();
  });
});
