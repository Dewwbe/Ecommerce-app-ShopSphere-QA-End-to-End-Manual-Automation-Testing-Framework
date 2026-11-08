import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../api/client", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import client from "../api/client";
import ProductsPage from "./ProductsPage";
import { renderWithProviders } from "../test/renderWithProviders";

const products = [
  { _id: "p1", name: "Wireless Mouse", description: "Ergonomic", price: 19.99, stock: 150 },
  { _id: "p2", name: "Yoga Mat", description: "Non-slip", price: 22.5, stock: 0 },
];

function mockApi({ loggedIn = false, items = products } = {}) {
  client.get.mockImplementation((url) => {
    if (url === "/api/auth/me") return Promise.resolve({ data: { user: { firstName: "Ann" } } });
    if (url === "/api/products") return Promise.resolve({ data: { items } });
    return Promise.reject(new Error("unexpected " + url));
  });
  if (loggedIn) localStorage.setItem("token", "t");
}

describe("ProductsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a card per product with price and stock", async () => {
    mockApi();
    renderWithProviders(<ProductsPage />);
    const cards = await screen.findAllByTestId("product-card");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText("Wireless Mouse")).toBeInTheDocument();
    expect(within(cards[0]).getByTestId("product-price")).toHaveTextContent("$19.99");
    expect(within(cards[0]).getByText("150 in stock")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Out of stock")).toBeInTheDocument();
  });

  it("hides add-to-cart buttons when logged out", async () => {
    mockApi();
    renderWithProviders(<ProductsPage />);
    await screen.findAllByTestId("product-card");
    expect(screen.queryByTestId("add-to-cart-button")).not.toBeInTheDocument();
  });

  it("shows add-to-cart buttons when logged in and disables out-of-stock items", async () => {
    mockApi({ loggedIn: true });
    renderWithProviders(<ProductsPage />);
    const buttons = await screen.findAllByTestId("add-to-cart-button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toBeEnabled();
    expect(buttons[1]).toBeDisabled();
  });

  it("shows an empty state when there are no products", async () => {
    mockApi({ items: [] });
    renderWithProviders(<ProductsPage />);
    expect(await screen.findByTestId("no-products")).toBeInTheDocument();
  });

  it("shows an error when loading fails", async () => {
    client.get.mockRejectedValue(new Error("down"));
    renderWithProviders(<ProductsPage />);
    expect(await screen.findByText("Could not load products")).toBeInTheDocument();
  });

  it("searches with the typed term", async () => {
    mockApi();
    renderWithProviders(<ProductsPage />);
    await screen.findAllByTestId("product-card");
    await userEvent.type(screen.getByTestId("search-input"), "mouse");
    await userEvent.click(screen.getByTestId("search-submit"));
    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith("/api/products", { params: { search: "mouse" } })
    );
  });

  it("adds a product to the cart and confirms", async () => {
    mockApi({ loggedIn: true });
    client.post.mockResolvedValue({});
    renderWithProviders(<ProductsPage />);
    const buttons = await screen.findAllByTestId("add-to-cart-button");
    await userEvent.click(buttons[0]);
    expect(await screen.findByTestId("add-to-cart-message")).toHaveTextContent("Added to cart");
    expect(client.post).toHaveBeenCalledWith("/api/cart/items", { productId: "p1", quantity: 1 });
  });

  it("shows the server error when adding fails", async () => {
    mockApi({ loggedIn: true });
    client.post.mockRejectedValue({ response: { data: { error: "Insufficient stock" } } });
    renderWithProviders(<ProductsPage />);
    const buttons = await screen.findAllByTestId("add-to-cart-button");
    await userEvent.click(buttons[0]);
    expect(await screen.findByTestId("add-to-cart-message")).toHaveTextContent("Insufficient stock");
  });
});
