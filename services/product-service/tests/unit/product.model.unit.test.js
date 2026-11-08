const Product = require("../../src/models/Product");

const valid = { name: "Widget", category: "Tools", price: 9.99, stock: 5, sku: "TOOL-001" };

describe("Product model validation (unit, no database)", () => {
  test("a complete product is valid and gets sensible defaults", () => {
    const p = new Product(valid);
    expect(p.validateSync()).toBeUndefined();
    expect(p.currency).toBe("usd");
    expect(p.description).toBe("");
  });

  test.each(["name", "category", "price", "sku"])("requires %s", (field) => {
    const data = { ...valid };
    delete data[field];
    expect(new Product(data).validateSync().errors[field]).toBeDefined();
  });

  test("rejects a negative price", () => {
    expect(new Product({ ...valid, price: -1 }).validateSync().errors.price).toBeDefined();
  });

  test("rejects negative stock", () => {
    expect(new Product({ ...valid, stock: -1 }).validateSync().errors.stock).toBeDefined();
  });

  test("allows a price of zero (boundary)", () => {
    expect(new Product({ ...valid, price: 0 }).validateSync()).toBeUndefined();
  });

  test("defaults stock to zero when omitted", () => {
    const data = { ...valid };
    delete data.stock;
    expect(new Product(data).stock).toBe(0);
  });
});
