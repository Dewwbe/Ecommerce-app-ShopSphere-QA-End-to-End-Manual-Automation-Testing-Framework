import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../api/client", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import client from "../api/client";
import { AuthProvider, useAuth } from "./AuthContext";

function Probe() {
  const { user, loading, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.firstName : "none"}</span>
      <button onClick={() => login("a@b.co", "pw12345678").catch(() => {})}>login</button>
      <button onClick={() => register({ firstName: "Reg" })}>register</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

describe("AuthContext", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is not loading and has no user when no token is stored", async () => {
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(client.get).not.toHaveBeenCalled();
  });

  it("restores the user from a stored token", async () => {
    localStorage.setItem("token", "t");
    client.get.mockResolvedValue({ data: { user: { firstName: "Ann" } } });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Ann"));
    expect(client.get).toHaveBeenCalledWith("/api/auth/me");
  });

  it("removes an invalid stored token", async () => {
    localStorage.setItem("token", "bad");
    client.get.mockRejectedValue(new Error("401"));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(localStorage.getItem("token")).toBeNull();
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("login stores the token and sets the user", async () => {
    client.post.mockResolvedValue({ data: { token: "jwt", user: { firstName: "Bob" } } });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await userEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Bob"));
    expect(localStorage.getItem("token")).toBe("jwt");
    expect(client.post).toHaveBeenCalledWith("/api/auth/login", { email: "a@b.co", password: "pw12345678" });
  });

  it("failed login leaves the user logged out", async () => {
    client.post.mockRejectedValue(new Error("bad creds"));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await userEvent.click(screen.getByText("login"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("register stores the token and sets the user", async () => {
    client.post.mockResolvedValue({ data: { token: "jwt2", user: { firstName: "Reg" } } });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await userEvent.click(screen.getByText("register"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Reg"));
    expect(localStorage.getItem("token")).toBe("jwt2");
  });

  it("logout clears the token and the user", async () => {
    localStorage.setItem("token", "t");
    client.get.mockResolvedValue({ data: { user: { firstName: "Ann" } } });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Ann"));
    await userEvent.click(screen.getByText("logout"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("useAuth throws outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useAuth must be used within an AuthProvider");
    spy.mockRestore();
  });
});
