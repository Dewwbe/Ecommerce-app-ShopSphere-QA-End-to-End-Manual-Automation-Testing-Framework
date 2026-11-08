import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import client from "../api/client";
import CartPage from "./CartPage";
import { renderWithProviders } from "../test/renderWithProviders";

const fullCart = {
  items: [{ productId: "p1", name: "Wireless Mouse", price: 19.99, quantity: 2 }],
  total: 39.98,
};

const routes = (
  <Routes>
    <Route path="/cart" element={<CartPage />} />
    <Route path="/checkout" element={<p>checkout page</p>} />
  </Routes>
);

describe("CartPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.get.mockResolvedValue({ data: fullCart });
  });

  it("shows a loading message first", () => {
    client.get.mockReturnValue(new Promise(() => {}));
    renderWithProviders(null, { route: "/cart", routes });
    expect(screen.getByText("Loading cart...")).toBeInTheDocument();
  });

  it("renders cart items, line price and total", async () => {
    renderWithProviders(null, { route: "/cart", routes });
    expect(await screen.findAllByTestId("cart-item")).toHaveLength(1);
    expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
    expect(screen.getByTestId("cart-item-quantity")).toHaveValue(2);
    expect(screen.getByText("$39.98", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("Total: $39.98");
    expect(screen.queryByTestId("empty-cart")).not.toBeInTheDocument();
  });

  it("shows the empty state and disables checkout for an empty cart", async () => {
    client.get.mockResolvedValue({ data: { items: [], total: 0 } });
    renderWithProviders(null, { route: "/cart", routes });
    expect(await screen.findByTestId("empty-cart")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-button")).toBeDisabled();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("Total: $0.00");
  });

  it("removes an item and reloads the cart", async () => {
    client.delete.mockResolvedValue({});
    renderWithProviders(null, { route: "/cart", routes });
    const removeButton = await screen.findByTestId("cart-item-remove");
    client.get.mockResolvedValue({ data: { items: [], total: 0 } });
    await userEvent.click(removeButton);
    expect(client.delete).toHaveBeenCalledWith("/api/cart/items/p1");
    expect(await screen.findByTestId("empty-cart")).toBeInTheDocument();
  });

  it("updates the quantity", async () => {
    client.put.mockResolvedValue({});
    renderWithProviders(null, { route: "/cart", routes });
    const input = await screen.findByTestId("cart-item-quantity");
    fireEvent.change(input, { target: { value: "3" } });
    await waitFor(() => expect(client.put).toHaveBeenCalledWith("/api/cart/items/p1", { quantity: 3 }));
  });

  it("ignores quantities below 1", async () => {
    renderWithProviders(null, { route: "/cart", routes });
    const input = await screen.findByTestId("cart-item-quantity");
    fireEvent.change(input, { target: { value: "0" } });
    expect(client.put).not.toHaveBeenCalled();
  });

  it("navigates to checkout", async () => {
    renderWithProviders(null, { route: "/cart", routes });
    const btn = await screen.findByTestId("checkout-button");
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(await screen.findByText("checkout page")).toBeInTheDocument();
  });
});
